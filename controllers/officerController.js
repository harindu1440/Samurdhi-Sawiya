'use strict';

const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// Officer Controller — Samurdhi Officer endpoints
// All routes require authMiddleware + requireRole('Samurdhi Officer')
// ─────────────────────────────────────────────────────────────────────────────

// ── GET /api/officer/dashboard ───────────────────────────────────────────────
// Returns stats and pending applications for the officer dashboard.
async function getDashboard(req, res) {
  try {
    const officerId = req.user.id;

    // Total applications in the system
    const [[totals]] = await pool.execute(`
      SELECT
        COUNT(*)                                          AS total_applications,
        SUM(App_Status = 'Pending')                      AS pending_officer_approvals,
        SUM(App_Status = 'Accepted')                     AS accepted_applications
      FROM Welfare_Application
    `);

    // Pending applications awaiting officer review (Officer_Approval = 0, not rejected)
    const [pending] = await pool.execute(`
      SELECT
        wa.Application_ID   AS application_id,
        a.Full_Name          AS applicant_name,
        wa.Date              AS submitted_date,
        wa.App_Status        AS status,
        wa.Monthly_Income    AS monthly_income,
        wa.Family_Size       AS family_size
      FROM Welfare_Application wa
      JOIN Applicant a ON a.Applicant_ID = wa.Applicant_ID
      WHERE wa.Officer_Approval = 0 AND wa.App_Status = 'Pending'
      ORDER BY wa.Date DESC
      LIMIT 50
    `);

    return res.status(200).json({
      status: 'success',
      stats: {
        total_applications:       Number(totals.total_applications || 0),
        pending_officer_approvals: Number(totals.pending_officer_approvals || 0),
        accepted_applications:    Number(totals.accepted_applications || 0),
      },
      pending_applications: pending.map((row) => ({
        application_id:  row.application_id,
        applicant_name:  row.applicant_name,
        submitted_date:  row.submitted_date,
        status:          row.status,
        monthly_income:  row.monthly_income,
        family_size:     row.family_size,
      })),
    });
  } catch (err) {
    console.error('[officerController.getDashboard]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to load dashboard.' });
  }
}

// ── POST /api/officer/review ─────────────────────────────────────────────────
// Body: { application_id, action: 'approve'|'reject' }
//
// THE DOUBLE-CHECK LOGIC:
//   When the Officer approves, we check if GN_Approval is already 1.
//   If BOTH are now approved → App_Status becomes 'Accepted'.
//   If only Officer approves (GN not yet) → stays 'Pending'.
//   If Officer rejects → Officer_Approval = 0, status stays 'Pending'.
// ─────────────────────────────────────────────────────────────────────────────
async function review(req, res) {
  const conn = await pool.getConnection();
  try {
    const applicationId = parseInt(req.body?.application_id, 10);
    const action = String(req.body?.action || '').toLowerCase();

    if (!applicationId || applicationId < 1) {
      conn.release();
      return res.status(400).json({ status: 'error', message: 'Invalid application identifier.' });
    }

    if (!['approve', 'reject'].includes(action)) {
      conn.release();
      return res.status(400).json({ status: 'error', message: 'Action must be "approve" or "reject".' });
    }

    await conn.beginTransaction();

    // Lock the row to prevent race conditions
    const [[application]] = await conn.execute(
      'SELECT `GN_Approval`, `App_Status` FROM `Welfare_Application` WHERE `Application_ID` = ? LIMIT 1 FOR UPDATE',
      [applicationId]
    );

    if (!application) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ status: 'error', message: 'Application not found.' });
    }

    const isApprove = action === 'approve';
    const officerApprovalValue = isApprove ? 1 : 0;
    const gnAlreadyApproved = Number(application.GN_Approval) === 1;

    // ── The Double-Check ──────────────────────────────────────────────────────
    let nextStatus = 'Pending';
    if (isApprove && gnAlreadyApproved) {
      nextStatus = 'Accepted'; // Both parties approved → finalize
    }

    await conn.execute(
      'UPDATE `Welfare_Application` SET `Officer_Approval` = ?, `App_Status` = ? WHERE `Application_ID` = ?',
      [officerApprovalValue, nextStatus, applicationId]
    );

    await conn.commit();
    conn.release();

    return res.status(200).json({
      status:              'success',
      message:             isApprove ? 'Application approved.' : 'Application rejected.',
      application_id:      applicationId,
      application_status:  nextStatus,
      officer_approval:    officerApprovalValue,
      gn_approval:         Number(application.GN_Approval),
      double_check_passed: isApprove && gnAlreadyApproved,
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    conn.release();
    console.error('[officerController.review]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to process review.' });
  }
}

// ── POST /api/officer/visit ──────────────────────────────────────────────────
// Body: { applicant_id, visit_date, remarks, recommendation }
async function submitVisit(req, res) {
  try {
    const applicantId    = parseInt(req.body?.applicant_id, 10);
    const visitDate      = String(req.body?.visit_date    || '').trim();
    const remarks        = String(req.body?.remarks       || '').trim();
    const recommendation = String(req.body?.recommendation || '').trim();

    const errors = [];
    if (!applicantId || applicantId < 1)   errors.push('A valid Applicant ID is required.');
    if (!visitDate)                         errors.push('Visit Date is required.');
    if (remarks.length < 10)               errors.push('Remarks must be at least 10 characters.');
    const validRecos = ['Highly Recommended', 'Recommended', 'Not Recommended'];
    if (!validRecos.includes(recommendation)) errors.push('Invalid recommendation value.');

    if (errors.length > 0) return res.status(422).json({ status: 'error', message: errors.join(' '), errors });

    // Verify applicant exists
    const [[applicant]] = await pool.execute(
      'SELECT 1 FROM `Applicant` WHERE `Applicant_ID` = ? LIMIT 1',
      [applicantId]
    );
    if (!applicant) return res.status(404).json({ status: 'error', message: 'Applicant not found.' });

    const [result] = await pool.execute(
      'INSERT INTO `Home_Visit` (`Visit_Date`, `Remarks`, `Recommendation`, `Applicant_ID`) VALUES (?, ?, ?, ?)',
      [visitDate, remarks, recommendation, applicantId]
    );

    return res.status(201).json({
      status:   'success',
      message:  'Home visit recorded successfully.',
      visit_id: result.insertId,
    });
  } catch (err) {
    console.error('[officerController.submitVisit]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to record visit.' });
  }
}

module.exports = { getDashboard, review, submitVisit };

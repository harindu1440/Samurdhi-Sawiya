'use strict';

const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// GN Controller — Grama Niladhari endpoints
// All routes require authMiddleware + requireRole('Grama Niladhari')
// ─────────────────────────────────────────────────────────────────────────────

// ── GET /api/gn/stats ────────────────────────────────────────────────────────
// Returns stats + pending application list for the GN dashboard.
async function getStats(req, res) {
  try {
    const gnId = req.user.id;

    // GN's division info
    const [[gnRow]] = await pool.execute(
      'SELECT `Division` FROM `Grama_Niladhari` WHERE `GN_ID` = ? LIMIT 1',
      [gnId]
    );
    const division = gnRow ? String(gnRow.Division || 'Unassigned') : 'Unassigned';

    // Aggregate counts (all applications in the system visible to GN)
    const [[totals]] = await pool.execute(`
      SELECT
        COUNT(*)                        AS total_applications,
        SUM(GN_Approval = 0 AND App_Status = 'Pending') AS pending_gn_approvals
      FROM Welfare_Application
    `);

    // Pending applications awaiting GN review
    const [pending] = await pool.execute(`
      SELECT
        wa.Application_ID  AS application_id,
        a.Full_Name         AS applicant_name,
        wa.Date             AS date,
        wa.App_Status       AS status,
        wa.Monthly_Income   AS monthly_income
      FROM Welfare_Application wa
      JOIN Applicant a ON a.Applicant_ID = wa.Applicant_ID
      WHERE wa.GN_Approval = 0 AND wa.App_Status = 'Pending'
      ORDER BY wa.Date DESC
      LIMIT 20
    `);

    return res.status(200).json({
      status: 'success',
      division,
      stats: {
        total_applications:  Number(totals.total_applications  || 0),
        pending_gn_approvals: Number(totals.pending_gn_approvals || 0),
      },
      pending_applications: pending.map((row) => ({
        application_id:  row.application_id,
        applicant_name:  row.applicant_name,
        date:            row.date,
        status:          row.status,
        monthly_income:  row.monthly_income,
      })),
    });
  } catch (err) {
    console.error('[gnController.getStats]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to load GN stats.' });
  }
}

// ── GET /api/gn/applications ─────────────────────────────────────────────────
// Returns all welfare applications visible to GN.
async function getApplications(req, res) {
  try {
    const gnId = req.user.id;

    // Division from DB
    const [[gnRow]] = await pool.execute(
      'SELECT `Division` FROM `Grama_Niladhari` WHERE `GN_ID` = ? LIMIT 1',
      [gnId]
    );
    const division = gnRow ? String(gnRow.Division || 'Unassigned') : 'Unassigned';

    const [applications] = await pool.execute(`
      SELECT
        wa.Application_ID  AS application_id,
        a.Full_Name         AS applicant_name,
        wa.Date             AS submitted_date,
        wa.App_Status       AS status
      FROM Welfare_Application wa
      JOIN Applicant a ON a.Applicant_ID = wa.Applicant_ID
      ORDER BY wa.Date DESC
      LIMIT 200
    `);

    return res.status(200).json({
      status:       'success',
      division,
      applications: applications.map((row) => ({
        application_id:  row.application_id,
        applicant_name:  row.applicant_name,
        submitted_date:  row.submitted_date,
        status:          row.status,
      })),
    });
  } catch (err) {
    console.error('[gnController.getApplications]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to load applications.' });
  }
}

// ── GET /api/gn/applications/:id ─────────────────────────────────────────────
// Returns full detail for one application (for the review modal).
async function getApplicationDetail(req, res) {
  try {
    const applicationId = parseInt(req.params.id, 10);
    if (!applicationId || applicationId < 1) {
      return res.status(400).json({ status: 'error', message: 'Invalid application ID.' });
    }

    const [[row]] = await pool.execute(`
      SELECT
        wa.Application_ID     AS application_id,
        a.Full_Name            AS applicant_name,
        a.Address              AS address,
        a.Phone_Num            AS phone_num,
        wa.Monthly_Income      AS monthly_income,
        wa.Family_Size         AS family_size,
        wa.Date                AS submitted_date,
        wa.App_Status          AS status,
        wa.GN_Approval         AS gn_approval,
        wa.Officer_Approval    AS officer_approval,
        wa.House_Photo_Path    AS house_photo_path
      FROM Welfare_Application wa
      JOIN Applicant a ON a.Applicant_ID = wa.Applicant_ID
      WHERE wa.Application_ID = ?
      LIMIT 1
    `, [applicationId]);

    if (!row) {
      return res.status(404).json({ status: 'error', message: 'Application not found.' });
    }

    return res.status(200).json({
      status: 'success',
      application: {
        application_id:   row.application_id,
        applicant_name:   row.applicant_name,
        address:          row.address,
        phone_num:        row.phone_num,
        monthly_income:   row.monthly_income,
        family_size:      row.family_size,
        submitted_date:   row.submitted_date,
        status:           row.status,
        gn_approval:      Number(row.gn_approval),
        officer_approval: Number(row.officer_approval),
        // Build a public URL for the uploaded photo
        house_photo_url:  row.house_photo_path ? `/${row.house_photo_path}` : null,
      },
    });
  } catch (err) {
    console.error('[gnController.getApplicationDetail]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to load application details.' });
  }
}

// ── POST /api/gn/review ──────────────────────────────────────────────────────
// Body: { application_id, action: 'approve'|'reject' }
// Same double-check mirror: if Officer_Approval===1 AND GN approves → 'Accepted'
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

    const [[application]] = await conn.execute(
      'SELECT `Officer_Approval`, `App_Status` FROM `Welfare_Application` WHERE `Application_ID` = ? LIMIT 1 FOR UPDATE',
      [applicationId]
    );

    if (!application) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ status: 'error', message: 'Application not found.' });
    }

    const isApprove = action === 'approve';
    const gnApprovalValue = isApprove ? 1 : 0;
    const officerAlreadyApproved = Number(application.Officer_Approval) === 1;

    // Double-check: if officer already approved AND GN now approves → Accepted
    let nextStatus = 'Pending';
    if (isApprove && officerAlreadyApproved) {
      nextStatus = 'Accepted';
    }

    await conn.execute(
      'UPDATE `Welfare_Application` SET `GN_Approval` = ?, `App_Status` = ? WHERE `Application_ID` = ?',
      [gnApprovalValue, nextStatus, applicationId]
    );

    await conn.commit();
    conn.release();

    return res.status(200).json({
      status:              'success',
      message:             isApprove ? 'Application approved by GN.' : 'Application rejected by GN.',
      application_id:      applicationId,
      application_status:  nextStatus,
      gn_approval:         gnApprovalValue,
      officer_approval:    Number(application.Officer_Approval),
      double_check_passed: isApprove && officerAlreadyApproved,
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    conn.release();
    console.error('[gnController.review]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to process review.' });
  }
}

// ── GET /api/gn/payments ─────────────────────────────────────────────────────
// Returns payment records for applicants in the GN's division.
async function getPayments(req, res) {
  try {
    const gnId = req.user.id;

    const [[gnRow]] = await pool.execute(
      'SELECT `Division` FROM `Grama_Niladhari` WHERE `GN_ID` = ? LIMIT 1',
      [gnId]
    );
    const division = gnRow ? String(gnRow.Division || 'Unassigned') : 'Unassigned';

    const [payments] = await pool.execute(`
      SELECT
        sp.SP_ID         AS sp_id,
        sp.Applicant_ID  AS applicant_id,
        a.Full_Name       AS applicant_name,
        sp.P_Status       AS p_status,
        sp.Date           AS date,
        sp.Payment        AS payment
      FROM Samurdhi_payment sp
      JOIN Applicant a ON a.Applicant_ID = sp.Applicant_ID
      WHERE sp.GN_ID = ?
      ORDER BY sp.Date DESC
    `, [gnId]);

    return res.status(200).json({
      status:   'success',
      division,
      payments: payments.map((row) => ({
        sp_id:          row.sp_id,
        applicant_id:   row.applicant_id,
        applicant_name: row.applicant_name,
        p_status:       row.p_status,
        date:           row.date,
        payment:        row.payment,
      })),
    });
  } catch (err) {
    console.error('[gnController.getPayments]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to load payments.' });
  }
}

module.exports = { getStats, getApplications, getApplicationDetail, review, getPayments };

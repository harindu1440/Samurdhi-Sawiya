'use strict';
const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// Officer Controller
// ─────────────────────────────────────────────────────────────────────────────

async function getDashboard(req, res) {
  try {
    // Total applications in the system
    const [[totals]] = await pool.execute(`
      SELECT
        COUNT(*)                                          AS total_applications,
        SUM(Status = 'Pending')                           AS pending_officer_approvals,
        SUM(Status = 'Accepted')                          AS accepted_applications
      FROM \`WELFARE_APPLICATION\`
    `);

    // Pending applications awaiting officer review (applications without a Visit_ID)
    const [pending] = await pool.execute(`
      SELECT
        wa.Application_ID   AS application_id,
        u.Username          AS applicant_name,
        wa.Date             AS submitted_date,
        wa.Status           AS status,
        a.Monthly_Income    AS monthly_income
      FROM \`WELFARE_APPLICATION\` wa
      JOIN \`APPLICANT\` a ON a.Applicant_ID = wa.Applicant_ID
      JOIN \`USERS\` u ON u.User_ID = a.Applicant_ID
      WHERE wa.Visit_ID IS NULL AND wa.Status = 'Pending'
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
      })),
    });
  } catch (err) {
    console.error('[officerController.getDashboard]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to load dashboard.' });
  }
}

// ── POST /api/officer/visit ──────────────────────────────────────────────────
// Body: { application_id, visit_date, remarks, recommendation }
// Records a home visit and updates the WELFARE_APPLICATION (1-to-1).
async function submitVisit(req, res) {
  const conn = await pool.getConnection();
  try {
    const officerId      = req.user.User_ID;
    const applicationId  = parseInt(req.body?.application_id, 10) || parseInt(req.body?.applicant_id, 10); // frontend might send applicant_id depending on old logic, but we need application_id
    const visitDate      = String(req.body?.visit_date    || '').trim();
    const remarks        = String(req.body?.remarks       || '').trim();
    const recommendation = String(req.body?.recommendation || '').trim();

    const errors = [];
    if (!applicationId || applicationId < 1) errors.push('A valid Application ID is required.');
    if (!visitDate)                          errors.push('Visit Date is required.');
    if (remarks.length < 10)                 errors.push('Remarks must be at least 10 characters.');
    const validRecos = ['Highly Recommended', 'Recommended', 'Not Recommended'];
    if (!validRecos.includes(recommendation)) errors.push('Invalid recommendation value.');

    if (errors.length > 0) {
      conn.release();
      return res.status(422).json({ status: 'error', message: errors.join(' '), errors });
    }

    await conn.beginTransaction();

    // Verify application exists and isn't already visited
    const [[application]] = await conn.execute(
      'SELECT \`Visit_ID\` FROM \`WELFARE_APPLICATION\` WHERE \`Application_ID\` = ? LIMIT 1 FOR UPDATE',
      [applicationId]
    );

    if (!application) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ status: 'error', message: 'Application not found.' });
    }

    if (application.Visit_ID) {
      await conn.rollback();
      conn.release();
      return res.status(409).json({ status: 'error', message: 'This application already has a recorded home visit.' });
    }

    // Insert HOME_VISIT
    const [visitResult] = await conn.execute(
      'INSERT INTO \`HOME_VISIT\` (\`Date\`, \`Remarks\`, \`Recommendation\`, \`Officer_ID\`) VALUES (?, ?, ?, ?)',
      [visitDate, remarks, recommendation, officerId]
    );
    const newVisitId = visitResult.insertId;

    // Link visit to application and move status forward
    await conn.execute(
      'UPDATE \`WELFARE_APPLICATION\` SET \`Visit_ID\` = ?, \`Status\` = ? WHERE \`Application_ID\` = ?',
      [newVisitId, 'Under Review', applicationId]
    );

    await conn.commit();
    conn.release();

    return res.status(201).json({
      status:   'success',
      message:  'Home visit recorded and linked successfully.',
      visit_id: newVisitId,
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    conn.release();
    console.error('[officerController.submitVisit]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to record visit.' });
  }
}

// ── POST /api/officer/review ─────────────────────────────────────────────────
// This old method might be redundant now since submitVisit essentially acts as the Officer review,
// but we keep it available if the frontend expects it, or just return an error to prompt UI updates.
async function review(req, res) {
  return res.status(400).json({ 
    status: 'error', 
    message: 'Officer approval is now handled exclusively by submitting a Home Visit report.' 
  });
}

module.exports = { getDashboard, review, submitVisit };

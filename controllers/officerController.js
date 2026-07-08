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
        SUM(Status = 'Officer_Approved')                  AS accepted_applications
      FROM \`WELFARE_APPLICATION\`
    `);

    // Pending applications awaiting officer review
    const [pending] = await pool.execute(`
      SELECT
        wa.Application_ID,
        wa.Date_Submitted,
        wa.Status,
        wa.Monthly_Income,
        wa.Dependents,
        wa.Reason,
        wa.House_Photo,
        a.User_ID AS Applicant_ID,
        a.Full_Name AS applicant_name,
        a.NIC,
        a.Address,
        u.Username,
        u.Phone_Num
      FROM \`WELFARE_APPLICATION\` wa
      JOIN \`APPLICANT\` a ON a.User_ID = wa.Applicant_ID
      JOIN \`USERS\` u ON u.User_ID = a.User_ID
      ORDER BY 
        CASE WHEN wa.Status = 'Pending' THEN 1 ELSE 2 END ASC,
        wa.Date_Submitted ASC
    `);

    return res.status(200).json({
      status: 'success',
      stats: {
        total_applications:       Number(totals.total_applications || 0),
        pending_officer_approvals: Number(totals.pending_officer_approvals || 0),
        accepted_applications:    Number(totals.accepted_applications || 0),
      },
      pending_applications: pending,
    });
  } catch (err) {
    console.error('================ SQL ERROR IN GET DASHBOARD ================');
    console.error('[officerController.getDashboard] FULL ERROR:', err);
    console.error('============================================================');
    return res.status(500).json({ status: 'error', message: 'Unable to load dashboard. Check server console for full SQL error.' });
  }
}

// ── POST /api/officer/visit ──────────────────────────────────────────────────
// Body: FormData with Application_ID, StatusAction, OfficerNotes, home_visit_photo
async function submitVisit(req, res) {
  const conn = await pool.getConnection();
  try {
    const officerId      = req.user.User_ID;
    const applicationId  = parseInt(req.body?.Application_ID, 10);
    const statusAction   = String(req.body?.StatusAction || '').trim(); // 'Approve', 'Reject', 'Pending'
    const remarks        = String(req.body?.OfficerNotes || '').trim();
    const photoFilename  = req.file ? req.file.filename : null;

    if (!applicationId || applicationId < 1) {
      conn.release();
      return res.status(422).json({ status: 'error', message: 'A valid Application ID is required.' });
    }
    if (!['Approve', 'Reject', 'Pending'].includes(statusAction)) {
      conn.release();
      return res.status(422).json({ status: 'error', message: 'Invalid status action.' });
    }

    await conn.beginTransaction();

    // Verify application exists and is currently Pending
    const [[application]] = await conn.execute(
      'SELECT \`Status\` FROM \`WELFARE_APPLICATION\` WHERE \`Application_ID\` = ? LIMIT 1 FOR UPDATE',
      [applicationId]
    );

    if (!application) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ status: 'error', message: 'Application not found.' });
    }

    if (application.Status !== 'Pending') {
      await conn.rollback();
      conn.release();
      return res.status(409).json({ status: 'error', message: 'Application is no longer pending.' });
    }

    let newStatus = 'Pending';
    if (statusAction === 'Approve') newStatus = 'Officer_Approved';
    if (statusAction === 'Reject') newStatus = 'Rejected';
    if (statusAction === 'Pending') newStatus = 'Pending';

    // Update Application Status
    await conn.execute(
      'UPDATE \`WELFARE_APPLICATION\` SET \`Status\` = ? WHERE \`Application_ID\` = ?',
      [newStatus, applicationId]
    );

    // If it's a decision, insert into HOME_VISIT
    if (statusAction === 'Approve' || statusAction === 'Reject') {
      const recommendation = statusAction === 'Approve' ? 'Recommended' : 'Not Recommended';
      
      // Since ALTER TABLE failed due to permissions on the remote DB, we append the photo to remarks safely.
      const finalRemarks = photoFilename 
        ? `${remarks} | [Attached Photo: ${photoFilename}]` 
        : remarks;

      await conn.execute(
        `INSERT INTO \`HOME_VISIT\` 
          (Application_ID, Officer_ID, Remarks, Recommendation, Date_Visited) 
         VALUES (?, ?, ?, ?, CURDATE())`,
        [applicationId, officerId, finalRemarks, recommendation]
      );
    }

    await conn.commit();
    conn.release();

    return res.status(200).json({
      status: 'success',
      message: `Application successfully updated to ${newStatus}.`,
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('[officerController.submitVisit]', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error processing review.' });
  }
}

async function review(req, res) {
  return res.status(400).json({ 
    status: 'error', 
    message: 'Officer approval is now handled exclusively by submitting a Home Visit report.' 
  });
}

module.exports = { getDashboard, review, submitVisit };

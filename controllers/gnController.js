'use strict';
const path = require('path');
const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/gn/dashboard
// Returns stats + all Officer_Approved applications with HOME_VISIT details
// ─────────────────────────────────────────────────────────────────────────────
async function getDashboard(req, res) {
  try {
    // Aggregate stats
    const [[totals]] = await pool.execute(`
      SELECT
        COUNT(*)                                  AS total_applications,
        SUM(Status = 'Officer_Approved')          AS pending_gn,
        SUM(Status = 'GN_Approved')               AS forwarded
      FROM \`WELFARE_APPLICATION\`
    `);

    // Fetch Officer_Approved applications joined with HOME_VISIT, APPLICANT, USERS
    const [rows] = await pool.execute(`
      SELECT
        wa.Application_ID,
        wa.Date_Submitted,
        wa.Status,
        wa.Monthly_Income,
        wa.Dependents,
        wa.Reason,
        wa.House_Photo,
        a.User_ID         AS Applicant_ID,
        a.Full_Name       AS applicant_name,
        a.NIC,
        a.Address,
        u.Phone_Num,
        hv.Remarks        AS officer_remarks,
        hv.Recommendation AS officer_recommendation,
        hv.Home_Visit_Photo
      FROM \`WELFARE_APPLICATION\` wa
      JOIN \`APPLICANT\` a ON a.User_ID = wa.Applicant_ID
      JOIN \`USERS\`     u ON u.User_ID = a.User_ID
      LEFT JOIN \`HOME_VISIT\` hv ON hv.Application_ID = wa.Application_ID
      WHERE wa.Status = 'Officer_Approved'
      ORDER BY wa.Date_Submitted ASC
    `);

    return res.status(200).json({
      status: 'success',
      stats: {
        total_applications: Number(totals.total_applications || 0),
        pending_gn:         Number(totals.pending_gn         || 0),
        forwarded:          Number(totals.forwarded          || 0),
      },
      applications: rows,
    });
  } catch (err) {
    console.error('[gnController.getDashboard]', err);
    return res.status(500).json({ status: 'error', message: 'Unable to load GN dashboard.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/gn/action
// Body: { application_id, action: 'approve'|'reject'|'return', gn_remarks }
// ─────────────────────────────────────────────────────────────────────────────
async function action(req, res) {
  const conn = await pool.getConnection();
  try {
    const gnId          = req.user.User_ID;
    const applicationId = parseInt(req.body?.application_id, 10);
    const act           = String(req.body?.action || '').toLowerCase();
    const gnRemarks     = String(req.body?.gn_remarks || '').trim();

    if (!applicationId || applicationId < 1) {
      conn.release();
      return res.status(422).json({ status: 'error', message: 'A valid Application ID is required.' });
    }

    if (!['approve', 'reject', 'return'].includes(act)) {
      conn.release();
      return res.status(422).json({ status: 'error', message: 'Action must be approve, reject, or return.' });
    }

    await conn.beginTransaction();

    // Lock and verify application state
    const [[application]] = await conn.execute(
      'SELECT `Status` FROM `WELFARE_APPLICATION` WHERE `Application_ID` = ? LIMIT 1 FOR UPDATE',
      [applicationId]
    );

    if (!application) {
      await conn.rollback(); conn.release();
      return res.status(404).json({ status: 'error', message: 'Application not found.' });
    }

    if (application.Status !== 'Officer_Approved') {
      await conn.rollback(); conn.release();
      return res.status(409).json({ status: 'error', message: `Application is no longer Officer_Approved (current: ${application.Status}).` });
    }

    let newStatus;
    let message;

    if (act === 'approve') {
      newStatus = 'GN_Approved';
      message   = 'Application approved and forwarded to Minister.';

      // Create MINISTER_APPROVAL record
      await conn.execute(
        'INSERT INTO `MINISTER_APPROVAL` (`Application_ID`, `GN_ID`, `Final_Status`) VALUES (?, ?, ?)',
        [applicationId, gnId, 'Pending']
      );

    } else if (act === 'reject') {
      newStatus = 'Rejected';
      message   = 'Application rejected.';

    } else {
      // return to officer — set back to Pending so officer can re-visit
      newStatus = 'Pending';
      message   = 'Application returned to Officer for further review.';
    }

    // Update application status
    await conn.execute(
      'UPDATE `WELFARE_APPLICATION` SET `Status` = ? WHERE `Application_ID` = ?',
      [newStatus, applicationId]
    );

    // Save GN remarks into HOME_VISIT table if remarks provided
    if (gnRemarks) {
      await conn.execute(
        `UPDATE \`HOME_VISIT\`
         SET \`Remarks\` = CONCAT(COALESCE(\`Remarks\`,''), ' | [GN Feedback: ', ?, ']')
         WHERE \`Application_ID\` = ?`,
        [gnRemarks, applicationId]
      );
    }

    await conn.commit();
    conn.release();

    return res.status(200).json({ status: 'success', message, new_status: newStatus });

  } catch (err) {
    await conn.rollback().catch(() => {});
    conn.release();
    console.error('[gnController.action]', err);
    return res.status(500).json({ status: 'error', message: 'Unable to process GN decision.' });
  }
}

// Keep existing exports alongside new ones
async function getStats(req, res) {
  // Redirect to getDashboard for backward compat
  return getDashboard(req, res);
}

async function getApplications(req, res) {
  try {
    const [rows] = await pool.execute(`
      SELECT
        wa.Application_ID,
        wa.Date_Submitted,
        wa.Status,
        wa.Monthly_Income,
        a.Full_Name AS applicant_name,
        a.NIC
      FROM \`WELFARE_APPLICATION\` wa
      JOIN \`APPLICANT\` a ON a.User_ID = wa.Applicant_ID
      ORDER BY wa.Date_Submitted DESC
      LIMIT 200
    `);
    return res.status(200).json({ status: 'success', applications: rows });
  } catch (err) {
    console.error('[gnController.getApplications]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to load applications.' });
  }
}

async function getApplicationDetail(req, res) {
  try {
    const applicationId = parseInt(req.params.id, 10);
    if (!applicationId || applicationId < 1) {
      return res.status(400).json({ status: 'error', message: 'Invalid application ID.' });
    }

    const [[row]] = await pool.execute(`
      SELECT
        wa.Application_ID,
        wa.Date_Submitted,
        wa.Status,
        wa.Monthly_Income,
        wa.Dependents,
        wa.Reason,
        wa.House_Photo,
        a.Full_Name   AS applicant_name,
        a.NIC,
        a.Address,
        u.Phone_Num,
        hv.Remarks        AS officer_remarks,
        hv.Recommendation AS officer_recommendation,
        hv.Home_Visit_Photo
      FROM \`WELFARE_APPLICATION\` wa
      JOIN \`APPLICANT\` a ON a.User_ID = wa.Applicant_ID
      JOIN \`USERS\`     u ON u.User_ID = a.User_ID
      LEFT JOIN \`HOME_VISIT\` hv ON hv.Application_ID = wa.Application_ID
      WHERE wa.Application_ID = ?
      LIMIT 1
    `, [applicationId]);

    if (!row) {
      return res.status(404).json({ status: 'error', message: 'Application not found.' });
    }

    return res.status(200).json({ status: 'success', application: row });
  } catch (err) {
    console.error('[gnController.getApplicationDetail]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to load application details.' });
  }
}

async function review(req, res) {
  // Legacy route — redirect to new action endpoint
  req.body.action = req.body.action === 'approve' ? 'approve' : 'reject';
  return action(req, res);
}

async function getPayments(req, res) {
  try {
    const gnId = req.user.User_ID;
    const [payments] = await pool.execute(`
      SELECT
        sp.Payment_ID   AS sp_id,
        u.Username      AS applicant_name,
        sp.Status       AS p_status,
        sp.Date         AS date,
        sp.Amount       AS payment,
        ma.GN_ID        AS gn_id
      FROM \`SAMURDHI_PAYMENT\` sp
      JOIN \`APPLICANT\`        a  ON a.User_ID       = sp.Applicant_ID
      JOIN \`USERS\`            u  ON u.User_ID       = a.User_ID
      JOIN \`MINISTER_APPROVAL\` ma ON ma.Request_ID  = sp.Request_ID
      WHERE ma.GN_ID = ?
      ORDER BY sp.Date DESC
    `, [gnId]);

    return res.status(200).json({ status: 'success', payments });
  } catch (err) {
    console.error('[gnController.getPayments]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to load payments.' });
  }
}

module.exports = { getDashboard, getStats, getApplications, getApplicationDetail, review, action, getPayments };

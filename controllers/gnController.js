'use strict';
const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// GN Controller
// ─────────────────────────────────────────────────────────────────────────────

async function getStats(req, res) {
  try {
    const gnId = req.user.User_ID;

    // GN's division info
    const [[gnRow]] = await pool.execute(
      'SELECT `Division` FROM `GRAMA_NILADHARI` WHERE `GN_ID` = ? LIMIT 1',
      [gnId]
    );
    const division = gnRow ? String(gnRow.Division || 'Unassigned') : 'Unassigned';

    // Aggregate counts
    const [[totals]] = await pool.execute(`
      SELECT
        COUNT(*)                        AS total_applications,
        SUM(Status = 'Under Review')    AS pending_gn_approvals
      FROM \`WELFARE_APPLICATION\`
    `);

    // Pending applications awaiting GN review (Under Review implies visited by Officer, waiting for GN)
    const [pending] = await pool.execute(`
      SELECT
        wa.Application_ID   AS application_id,
        u.Username          AS applicant_name,
        wa.Date             AS date,
        wa.Status           AS status,
        a.Monthly_Income    AS monthly_income
      FROM \`WELFARE_APPLICATION\` wa
      JOIN \`APPLICANT\` a ON a.Applicant_ID = wa.Applicant_ID
      JOIN \`USERS\` u ON u.User_ID = a.Applicant_ID
      WHERE wa.Status = 'Under Review'
      ORDER BY wa.Date DESC
      LIMIT 20
    `);

    return res.status(200).json({
      status: 'success',
      division,
      stats: {
        total_applications:   Number(totals.total_applications  || 0),
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

async function getApplications(req, res) {
  try {
    const gnId = req.user.User_ID;

    const [[gnRow]] = await pool.execute(
      'SELECT `Division` FROM `GRAMA_NILADHARI` WHERE `GN_ID` = ? LIMIT 1',
      [gnId]
    );
    const division = gnRow ? String(gnRow.Division || 'Unassigned') : 'Unassigned';

    const [applications] = await pool.execute(`
      SELECT
        wa.Application_ID   AS application_id,
        u.Username          AS applicant_name,
        wa.Date             AS submitted_date,
        wa.Status           AS status
      FROM \`WELFARE_APPLICATION\` wa
      JOIN \`APPLICANT\` a ON a.Applicant_ID = wa.Applicant_ID
      JOIN \`USERS\` u ON u.User_ID = a.Applicant_ID
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

async function getApplicationDetail(req, res) {
  try {
    const applicationId = parseInt(req.params.id, 10);
    if (!applicationId || applicationId < 1) {
      return res.status(400).json({ status: 'error', message: 'Invalid application ID.' });
    }

    const [[row]] = await pool.execute(`
      SELECT
        wa.Application_ID     AS application_id,
        u.Username            AS applicant_name,
        a.Address             AS address,
        u.Phone_Num           AS phone_num,
        a.Monthly_Income      AS monthly_income,
        wa.Date               AS submitted_date,
        wa.Status             AS status,
        hv.Recommendation     AS visit_recommendation,
        hv.Remarks            AS visit_remarks,
        ma.Status             AS minister_approval_status
      FROM \`WELFARE_APPLICATION\` wa
      JOIN \`APPLICANT\` a ON a.Applicant_ID = wa.Applicant_ID
      JOIN \`USERS\` u ON u.User_ID = a.Applicant_ID
      LEFT JOIN \`HOME_VISIT\` hv ON hv.Visit_ID = wa.Visit_ID
      LEFT JOIN \`MINISTER_APPROVAL\` ma ON ma.Application_ID = wa.Application_ID
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
        submitted_date:   row.submitted_date,
        status:           row.status,
        visit_recommendation: row.visit_recommendation || 'Pending Visit',
        visit_remarks:    row.visit_remarks || '',
        minister_approval_status: row.minister_approval_status || 'Not Forwarded'
      },
    });
  } catch (err) {
    console.error('[gnController.getApplicationDetail]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to load application details.' });
  }
}

// ── POST /api/gn/review ──────────────────────────────────────────────────────
// Body: { application_id, action: 'approve'|'reject' }
// GN "approving" means forwarding to the Minister by creating a MINISTER_APPROVAL.
async function review(req, res) {
  const conn = await pool.getConnection();
  try {
    const gnId = req.user.User_ID;
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
      'SELECT \`Status\` FROM \`WELFARE_APPLICATION\` WHERE \`Application_ID\` = ? LIMIT 1 FOR UPDATE',
      [applicationId]
    );

    if (!application) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ status: 'error', message: 'Application not found.' });
    }

    // Check if it was already forwarded
    const [[existingApproval]] = await conn.execute(
      'SELECT 1 FROM \`MINISTER_APPROVAL\` WHERE \`Application_ID\` = ? LIMIT 1',
      [applicationId]
    );

    if (existingApproval) {
      await conn.rollback();
      conn.release();
      return res.status(409).json({ status: 'error', message: 'Application was already forwarded to Minister.' });
    }

    const isApprove = action === 'approve';

    if (isApprove) {
      // Forward to minister
      await conn.execute(
        'INSERT INTO \`MINISTER_APPROVAL\` (\`GN_ID\`, \`Application_ID\`, \`Status\`) VALUES (?, ?, ?)',
        [gnId, applicationId, 'Pending']
      );
      
      // Update app status to Forwarded
      await conn.execute(
        'UPDATE \`WELFARE_APPLICATION\` SET \`Status\` = ? WHERE \`Application_ID\` = ?',
        ['Forwarded', applicationId]
      );
    } else {
      // Rejecting terminates the application
      await conn.execute(
        'UPDATE \`WELFARE_APPLICATION\` SET \`Status\` = ? WHERE \`Application_ID\` = ?',
        ['Rejected', applicationId]
      );
    }

    await conn.commit();
    conn.release();

    return res.status(200).json({
      status:              'success',
      message:             isApprove ? 'Application forwarded to Minister.' : 'Application rejected.',
      application_id:      applicationId,
      application_status:  isApprove ? 'Forwarded' : 'Rejected',
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    conn.release();
    console.error('[gnController.review]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to process review.' });
  }
}

async function getPayments(req, res) {
  try {
    const gnId = req.user.User_ID;

    const [[gnRow]] = await pool.execute(
      'SELECT `Division` FROM `GRAMA_NILADHARI` WHERE `GN_ID` = ? LIMIT 1',
      [gnId]
    );
    const division = gnRow ? String(gnRow.Division || 'Unassigned') : 'Unassigned';

    const [payments] = await pool.execute(`
      SELECT
        sp.Payment_ID    AS sp_id,
        sp.Applicant_ID  AS applicant_id,
        u.Username       AS applicant_name,
        sp.Status        AS p_status,
        sp.Date          AS date,
        sp.Amount        AS payment
      FROM \`SAMURDHI_PAYMENT\` sp
      JOIN \`APPLICANT\` a ON a.Applicant_ID = sp.Applicant_ID
      JOIN \`USERS\` u ON u.User_ID = a.Applicant_ID
      JOIN \`MINISTER_APPROVAL\` ma ON ma.Request_ID = sp.Request_ID
      WHERE ma.GN_ID = ?
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

'use strict';
const path = require('path');
const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// Applicant Controller
// ─────────────────────────────────────────────────────────────────────────────

async function submitApplication(req, res) {
  try {
    const applicantId = req.user.User_ID;
    
    // NOTE: The ER diagram schema removed Monthly_Income (moved to APPLICANT table), 
    // Family_Size, and House_Photo_Path. We will insert what the new schema allows.
    // If the frontend sends house_photo, multer processes it, but we drop the path here
    // unless the DB is updated to store it.

    const [result] = await pool.execute(
      `INSERT INTO \`WELFARE_APPLICATION\` (\`Applicant_ID\`) VALUES (?)`,
      [applicantId]
    );

    return res.status(201).json({
      status: 'success',
      message: 'Application submitted successfully.',
      application_id: result.insertId,
    });
  } catch (err) {
    console.error('[applicantController.submitApplication]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to submit application.' });
  }
}

async function getDashboard(req, res) {
  try {
    const applicantId = req.user.User_ID;

    // Join APPLICANT with USERS to get Name and Income
    const [[applicant]] = await pool.execute(
      `SELECT u.Username AS Full_Name, a.Monthly_Income 
       FROM \`APPLICANT\` a 
       JOIN \`USERS\` u ON u.User_ID = a.Applicant_ID 
       WHERE a.Applicant_ID = ? LIMIT 1`,
      [applicantId]
    );

    if (!applicant) {
      return res.status(404).json({ status: 'error', message: 'Applicant record not found.' });
    }

    // Fetch from the new WELFARE_APPLICATION schema
    const [[appRow]] = await pool.execute(
      `SELECT \`Application_ID\`, \`Status\`, \`Date\`
       FROM \`WELFARE_APPLICATION\`
       WHERE \`Applicant_ID\` = ?
       ORDER BY \`Date\` DESC LIMIT 1`,
      [applicantId]
    );

    return res.status(200).json({
      status: 'success',
      name: applicant.Full_Name,
      profile: {
        monthly_income: applicant.Monthly_Income,
      },
      latest_application: appRow
        ? {
            application_id: appRow.Application_ID,
            app_status: appRow.Status,
            date: appRow.Date,
          }
        : null,
    });
  } catch (err) {
    console.error('[applicantController.getDashboard]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to load dashboard.' });
  }
}

async function getPayments(req, res) {
  try {
    const applicantId = req.user.User_ID;

    // Using the exact columns from new SAMURDHI_PAYMENT table
    const [payments] = await pool.execute(
      `SELECT 
        sp.Payment_ID AS sp_id, 
        sp.Status     AS p_status, 
        sp.Date       AS date, 
        sp.Amount     AS payment,
        ma.GN_ID      AS gn_id
       FROM \`SAMURDHI_PAYMENT\` sp
       LEFT JOIN \`MINISTER_APPROVAL\` ma ON ma.Request_ID = sp.Request_ID
       WHERE sp.Applicant_ID = ?
       ORDER BY sp.Date DESC`,
      [applicantId]
    );

    return res.status(200).json({
      status: 'success',
      payments: payments.map((row) => ({
        sp_id: row.sp_id,
        p_status: row.p_status,
        date: row.date,
        payment: row.payment,
        gn_id: row.gn_id,
      })),
    });
  } catch (err) {
    console.error('[applicantController.getPayments]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to load payments.' });
  }
}

module.exports = { submitApplication, getDashboard, getPayments };

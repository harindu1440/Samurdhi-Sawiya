'use strict';

const path = require('path');
const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// Applicant Controller — Applicant endpoints
// Routes require authMiddleware + requireRole('Applicant')
// ─────────────────────────────────────────────────────────────────────────────

// ── POST /api/applications/submit ────────────────────────────────────────────
// Multipart form (multer already ran before this controller).
// req.file contains the uploaded house photo.
// Body fields: monthly_income, family_size
async function submitApplication(req, res) {
  try {
    const applicantId   = req.user.id;
    const monthlyIncome = parseFloat(req.body?.monthly_income);
    const familySize    = parseInt(req.body?.family_size, 10);

    // ── Validation ────────────────────────────────────────────────────────────
    const errors = [];

    if (isNaN(monthlyIncome) || monthlyIncome < 0) {
      errors.push('Monthly Income must be a valid non-negative number.');
    }

    if (!Number.isInteger(familySize) || familySize < 1) {
      errors.push('Family Size must be a whole number of at least 1.');
    }

    if (!req.file) {
      errors.push('House photograph is required.');
    }

    if (errors.length > 0) {
      return res.status(422).json({ status: 'error', message: errors.join(' '), errors });
    }

    // Relative path stored in DB (served via express.static on /public)
    const photoRelativePath = `uploads/houses/${req.file.filename}`;

    // ── Insert into DB ────────────────────────────────────────────────────────
    const [result] = await pool.execute(
      `INSERT INTO \`Welfare_Application\`
        (\`Monthly_Income\`, \`Family_Size\`, \`House_Photo_Path\`, \`Applicant_ID\`)
       VALUES (?, ?, ?, ?)`,
      [monthlyIncome, familySize, photoRelativePath, applicantId]
    );

    return res.status(201).json({
      status:         'success',
      message:        'Application submitted successfully.',
      application_id: result.insertId,
    });
  } catch (err) {
    console.error('[applicantController.submitApplication]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to submit application.' });
  }
}

// ── GET /api/applicant/dashboard ─────────────────────────────────────────────
// Returns the applicant's profile and latest application status.
async function getDashboard(req, res) {
  try {
    const applicantId = req.user.id;

    const [[applicant]] = await pool.execute(
      'SELECT `Full_Name`, `Status`, `Monthly_Income`, `Registered_Date` FROM `Applicant` WHERE `Applicant_ID` = ? LIMIT 1',
      [applicantId]
    );

    if (!applicant) {
      return res.status(404).json({ status: 'error', message: 'Applicant record not found.' });
    }

    const [[appRow]] = await pool.execute(
      `SELECT \`Application_ID\`, \`App_Status\`, \`Date\`
       FROM \`Welfare_Application\`
       WHERE \`Applicant_ID\` = ?
       ORDER BY \`Date\` DESC LIMIT 1`,
      [applicantId]
    );

    return res.status(200).json({
      status: 'success',
      name:   applicant.Full_Name,
      profile: {
        status:          applicant.Status,
        monthly_income:  applicant.Monthly_Income,
        registered_date: applicant.Registered_Date,
      },
      latest_application: appRow
        ? {
            application_id: appRow.Application_ID,
            app_status:     appRow.App_Status,
            date:           appRow.Date,
          }
        : null,
    });
  } catch (err) {
    console.error('[applicantController.getDashboard]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to load dashboard.' });
  }
}

// ── GET /api/applicant/payments ───────────────────────────────────────────────
// Returns all payment records for the logged-in applicant.
async function getPayments(req, res) {
  try {
    const applicantId = req.user.id;

    const [payments] = await pool.execute(
      `SELECT
        sp.SP_ID    AS sp_id,
        sp.P_Status  AS p_status,
        sp.Date      AS date,
        sp.Payment   AS payment,
        sp.GN_ID     AS gn_id
       FROM \`Samurdhi_payment\` sp
       WHERE sp.Applicant_ID = ?
       ORDER BY sp.Date DESC`,
      [applicantId]
    );

    return res.status(200).json({
      status: 'success',
      payments: payments.map((row) => ({
        sp_id:    row.sp_id,
        p_status: row.p_status,
        date:     row.date,
        payment:  row.payment,
        gn_id:    row.gn_id,
      })),
    });
  } catch (err) {
    console.error('[applicantController.getPayments]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to load payments.' });
  }
}

module.exports = { submitApplication, getDashboard, getPayments };

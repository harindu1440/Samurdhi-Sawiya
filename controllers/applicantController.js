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

    // Get applicant's Full_Name from APPLICANT table
    const [[applicant]] = await pool.execute(
      `SELECT Full_Name 
       FROM \`APPLICANT\`
       WHERE User_ID = ? LIMIT 1`,
      [applicantId]
    );

    if (!applicant) {
      return res.status(404).json({ status: 'error', message: 'Applicant record not found.' });
    }

    // Fetch from the new WELFARE_APPLICATION schema
    const [[appRow]] = await pool.execute(
      `SELECT \`Application_ID\`, \`Status\`, \`Update_Reason\`, \`Date_Submitted\`, \`Monthly_Income\`
       FROM \`WELFARE_APPLICATION\`
       WHERE \`Applicant_ID\` = ?
       ORDER BY \`Date_Submitted\` DESC LIMIT 1`,
      [applicantId]
    );

    return res.status(200).json({
      status: 'success',
      name: applicant.Full_Name,
      profile: {
        monthly_income: appRow ? appRow.Monthly_Income : 0.00,
      },
      latest_application: appRow
        ? {
            application_id: appRow.Application_ID,
            app_status: appRow.Status,
            update_reason: appRow.Update_Reason,
            date: appRow.Date_Submitted,
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

    // --- RECURRING PAYMENT CATCH-UP LOGIC ---
    // Fetch all existing payments for the user
    let [payments] = await pool.execute(
      `SELECT * FROM \`SAMURDHI_PAYMENT\` WHERE Applicant_ID = ? ORDER BY Payment_Date ASC`,
      [applicantId]
    );

    if (payments.length > 0) {
      const firstPayment = payments[0];
      const amount = firstPayment.Amount;
      const reqId = firstPayment.Request_ID;
      
      const firstDate = new Date(firstPayment.Payment_Date);
      const currentDate = new Date();
      
      // Calculate total expected months (inclusive of first month)
      const monthsElapsed = (currentDate.getFullYear() - firstDate.getFullYear()) * 12 + (currentDate.getMonth() - firstDate.getMonth());
      
      let newPaymentsAdded = false;
      
      // Check each month from the first payment up to current month
      for (let i = 1; i <= monthsElapsed; i++) {
        const expectedDate = new Date(firstDate.getFullYear(), firstDate.getMonth() + i, firstDate.getDate());
        
        // Skip future dates if the calculation slightly overshoots due to days in month
        if (expectedDate > currentDate) continue;
        
        // Check if a payment for this specific year & month already exists
        const exists = payments.some(p => {
          const pDate = new Date(p.Payment_Date);
          return pDate.getFullYear() === expectedDate.getFullYear() && pDate.getMonth() === expectedDate.getMonth();
        });
        
        if (!exists) {
          // Insert missing monthly payment
          await pool.execute(
            `INSERT INTO \`SAMURDHI_PAYMENT\` (Request_ID, Applicant_ID, Amount, Status, Payment_Date) VALUES (?, ?, ?, 'Completed', ?)`,
            [reqId, applicantId, amount, `${expectedDate.getFullYear()}-${(expectedDate.getMonth() + 1).toString().padStart(2, '0')}-${expectedDate.getDate().toString().padStart(2, '0')}`]
          );
          newPaymentsAdded = true;
        }
      }
    }
    // --- END CATCH-UP LOGIC ---

    // Fetch the final, updated list of payments with GN info
    [payments] = await pool.execute(
      `SELECT 
        sp.Payment_ID AS sp_id, 
        sp.Status     AS p_status, 
        sp.Payment_Date AS date, 
        sp.Amount     AS payment,
        ma.GN_ID      AS gn_id
       FROM \`SAMURDHI_PAYMENT\` sp
       LEFT JOIN \`MINISTER_APPROVAL\` ma ON ma.Request_ID = sp.Request_ID
       WHERE sp.Applicant_ID = ?
       ORDER BY sp.Payment_Date DESC`,
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

async function updateApplication(req, res) {
  const conn = await pool.getConnection();
  try {
    const applicantId = req.user.User_ID;
    const { Monthly_Income, Dependents, Reason, Name, NIC, Address, DOB, Gender, Division, Bank_Name, Account_Name, Account_Number, Branch } = req.body;

    if (!Monthly_Income || !Dependents || !Reason) {
      return res.status(400).json({ status: 'error', message: 'Please provide all required application fields.' });
    }

    await conn.beginTransaction();

    // 1. Update APPLICANT table profile data
    await conn.execute(
      `UPDATE \`APPLICANT\`
       SET Full_Name = ?, NIC = ?, Address = ?, DOB = ?, Gender = ?, Division = ?, Bank_Name = ?, Account_Name = ?, Account_Number = ?, Branch = ?
       WHERE User_ID = ?`,
      [Name, NIC, Address, DOB, Gender, Division, Bank_Name, Account_Name, Account_Number, Branch, applicantId]
    );

    // 2. Update WELFARE_APPLICATION data and reset Status to Pending
    await conn.execute(
      `UPDATE \`WELFARE_APPLICATION\`
       SET Monthly_Income = ?, Dependents = ?, Reason = ?, Status = 'Pending', Update_Reason = NULL
       WHERE Applicant_ID = ? AND Status = 'Update_Required'`,
      [Monthly_Income, Dependents, Reason, applicantId]
    );

    await conn.commit();
    return res.status(200).json({ status: 'success', message: 'Application updated successfully and is pending review.' });
  } catch (err) {
    await conn.rollback();
    console.error('[applicantController.updateApplication]', err);
    return res.status(500).json({ status: 'error', message: 'Unable to update application.' });
  } finally {
    conn.release();
  }
}

async function getEditData(req, res) {
  try {
    const applicantId = req.user.User_ID;
    
    // Fetch applicant and application data
    const [[applicant]] = await pool.execute(
      `SELECT a.*, w.Monthly_Income, w.Dependents, w.Reason, w.Status, w.Update_Reason
       FROM \`APPLICANT\` a
       JOIN \`WELFARE_APPLICATION\` w ON a.User_ID = w.Applicant_ID
       WHERE a.User_ID = ?
       ORDER BY w.Date_Submitted DESC LIMIT 1`,
      [applicantId]
    );

    if (!applicant) {
      return res.status(404).json({ status: 'error', message: 'Applicant data not found.' });
    }

    return res.status(200).json({ status: 'success', data: applicant });
  } catch (err) {
    console.error('[applicantController.getEditData]', err);
    return res.status(500).json({ status: 'error', message: 'Unable to fetch edit data.' });
  }
}

module.exports = { submitApplication, getDashboard, getPayments, updateApplication, getEditData };

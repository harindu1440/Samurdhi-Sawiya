'use strict';
const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/minister/approvals
// Fetches all applications that are 'Officer_Approved' for the Minister to review
// ─────────────────────────────────────────────────────────────────────────────
async function getApprovals(req, res) {
  try {
    const sql = `
      SELECT 
        ma.Request_ID,
        wa.Application_ID,
        wa.Monthly_Income,
        wa.Dependents,
        wa.Reason,
        wa.House_Photo,
        wa.Status,
        a.User_ID AS Applicant_ID,
        a.Full_Name,
        a.NIC,
        a.Address,
        a.DOB,
        a.Gender,
        hv.Remarks AS Officer_Remarks,
        hv.Recommendation
      FROM MINISTER_APPROVAL ma
      JOIN WELFARE_APPLICATION wa ON ma.Application_ID = wa.Application_ID
      JOIN APPLICANT a ON wa.Applicant_ID = a.User_ID
      JOIN HOME_VISIT hv ON wa.Application_ID = hv.Application_ID
      WHERE wa.Status = 'GN_Approved' AND ma.Final_Status = 'Pending'
      ORDER BY wa.Date_Submitted ASC;
    `;
    const [rows] = await pool.execute(sql);
    return res.status(200).json({ status: 'success', data: rows });
  } catch (error) {
    console.error('Error fetching minister approvals:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/minister/approvals/:id/action
// Processes Approval or Rejection
// ─────────────────────────────────────────────────────────────────────────────
async function actionApproval(req, res) {
  const { id } = req.params; // ma.Request_ID
  const { action, amount } = req.body; // 'Approve' or 'Reject', and amount

  if (!action || !['Approve', 'Reject'].includes(action)) {
    return res.status(400).json({ status: 'error', message: 'Invalid action.' });
  }

  if (action === 'Approve' && (!amount || amount <= 0)) {
    return res.status(400).json({ status: 'error', message: 'A valid payment amount must be assigned to approve this application.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Get the approval request details
    const [maRows] = await conn.execute('SELECT * FROM MINISTER_APPROVAL WHERE Request_ID = ?', [id]);
    if (maRows.length === 0) {
      throw new Error('Approval request not found.');
    }
    const ma = maRows[0];

    // Get Welfare Application details
    const [waRows] = await conn.execute('SELECT * FROM WELFARE_APPLICATION WHERE Application_ID = ?', [ma.Application_ID]);
    if (waRows.length === 0) {
      throw new Error('Welfare application not found.');
    }
    const wa = waRows[0];

    if (action === 'Approve') {
      // Update WELFARE_APPLICATION status
      await conn.execute(
        "UPDATE WELFARE_APPLICATION SET Status = 'Minister_Approved' WHERE Application_ID = ?",
        [wa.Application_ID]
      );

      // Update MINISTER_APPROVAL status
      await conn.execute(
        "UPDATE MINISTER_APPROVAL SET Final_Status = 'Approved', Date_Reviewed = CURDATE(), Minister_ID = ? WHERE Request_ID = ?",
        [req.user.User_ID, id]
      );

      // Insert SAMURDHI_PAYMENT using the assigned monthly amount
      await conn.execute(
        "INSERT INTO SAMURDHI_PAYMENT (Request_ID, Applicant_ID, Amount, Status, Payment_Date) VALUES (?, ?, ?, 'Pending', CURDATE())",
        [id, wa.Applicant_ID, amount]
      );

      // Create a notification for the Applicant that they were approved
      await conn.execute(
        "INSERT INTO NOTIFICATION (User_ID, Message) VALUES (?, ?)",
        [wa.Applicant_ID, `Your Samurdhi Welfare Application has been officially approved! You have been assigned a monthly payment of LKR ${amount}.`]
      );

    } else if (action === 'Reject') {
      // Update WELFARE_APPLICATION status
      await conn.execute(
        "UPDATE WELFARE_APPLICATION SET Status = 'Rejected' WHERE Application_ID = ?",
        [wa.Application_ID]
      );

      // Update MINISTER_APPROVAL status
      await conn.execute(
        "UPDATE MINISTER_APPROVAL SET Final_Status = 'Rejected', Date_Reviewed = CURDATE(), Minister_ID = ? WHERE Request_ID = ?",
        [req.user.User_ID, id]
      );
    }

    await conn.commit();
    res.status(200).json({ status: 'success', message: `Application successfully ${action.toLowerCase()}ed.` });

  } catch (error) {
    await conn.rollback();
    console.error('Error processing minister action:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  } finally {
    conn.release();
  }
}

module.exports = { getApprovals, actionApproval };

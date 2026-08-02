'use strict';
const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/applicant/complaints
// Applicant lodges a new complaint
// ─────────────────────────────────────────────────────────────────────────────
async function lodgeComplaint(req, res) {
  try {
    const applicantId = req.user.User_ID;
    const { subject, message } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ status: 'error', message: 'Subject is required.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ status: 'error', message: 'Message is required.' });
    }

    await pool.execute(
      'INSERT INTO `COMPLAINT` (Applicant_ID, Subject, Message, Status) VALUES (?, ?, ?, ?)',
      [applicantId, subject.trim(), message.trim(), 'Pending']
    );

    return res.status(201).json({ status: 'success', message: 'Complaint lodged successfully.' });
  } catch (err) {
    console.error('[complaintController.lodgeComplaint]', err);
    return res.status(500).json({ status: 'error', message: 'Failed to lodge complaint.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/applicant/complaints
// Applicant views their own complaints
// ─────────────────────────────────────────────────────────────────────────────
async function getApplicantComplaints(req, res) {
  try {
    const applicantId = req.user.User_ID;

    const [rows] = await pool.execute(
      'SELECT Complaint_ID, Subject, Message, Status, Created_At FROM `COMPLAINT` WHERE Applicant_ID = ? ORDER BY Created_At DESC',
      [applicantId]
    );

    return res.status(200).json({ status: 'success', data: rows });
  } catch (err) {
    console.error('[complaintController.getApplicantComplaints]', err);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch complaints.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/minister/complaints
// Minister (Admin) views all complaints
// ─────────────────────────────────────────────────────────────────────────────
async function getAllComplaints(req, res) {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        c.Complaint_ID,
        c.Subject,
        c.Message,
        c.Status,
        c.Created_At,
        a.Full_Name AS Applicant_Name,
        a.NIC AS Applicant_NIC
      FROM \`COMPLAINT\` c
      JOIN \`APPLICANT\` a ON c.Applicant_ID = a.User_ID
      ORDER BY c.Created_At DESC
    `);

    return res.status(200).json({ status: 'success', data: rows });
  } catch (err) {
    console.error('[complaintController.getAllComplaints]', err);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch complaints.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/minister/complaints/:id/resolve
// Minister (Admin) resolves a complaint
// ─────────────────────────────────────────────────────────────────────────────
async function resolveComplaint(req, res) {
  try {
    const complaintId = req.params.id;

    const [result] = await pool.execute(
      'UPDATE `COMPLAINT` SET Status = ? WHERE Complaint_ID = ?',
      ['Resolved', complaintId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Complaint not found.' });
    }

    return res.status(200).json({ status: 'success', message: 'Complaint marked as resolved.' });
  } catch (err) {
    console.error('[complaintController.resolveComplaint]', err);
    return res.status(500).json({ status: 'error', message: 'Failed to resolve complaint.' });
  }
}

module.exports = {
  lodgeComplaint,
  getApplicantComplaints,
  getAllComplaints,
  resolveComplaint,
};

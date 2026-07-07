'use strict';

const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// Admin Controller
// All routes require authMiddleware + requireRole('Admin')
// ─────────────────────────────────────────────────────────────────────────────

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
async function getStats(req, res) {
  try {
    const [[counts]] = await pool.execute(`
      SELECT
        (SELECT COUNT(*) FROM Applicant WHERE Status = 'Accepted')      AS total_beneficiaries,
        (SELECT COALESCE(SUM(Payment), 0) FROM Samurdhi_payment)        AS total_funds_disbursed,
        (SELECT COUNT(*) FROM Welfare_Application WHERE App_Status = 'Pending') AS pending_approvals
    `);

    return res.status(200).json({
      status: 'success',
      metrics: {
        total_beneficiaries:   Number(counts.total_beneficiaries   || 0),
        total_funds_disbursed: Number(counts.total_funds_disbursed || 0),
        pending_approvals:     Number(counts.pending_approvals     || 0),
      },
    });
  } catch (err) {
    console.error('[adminController.getStats]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to load admin stats.' });
  }
}

// ── GET /api/admin/users ──────────────────────────────────────────────────────
// Returns a unified list of all GN and Officer users (mirrors PHP UNION query).
async function listUsers(req, res) {
  try {
    const [users] = await pool.execute(`
      SELECT
        'Grama Niladhari'  AS role,
        GN_ID              AS user_id,
        GN_FullName        AS full_name,
        Division           AS territory,
        GN_P_Num           AS phone_num,
        CASE WHEN Password_Hash IS NULL OR Password_Hash = '' THEN 0 ELSE 1 END AS password_set
      FROM Grama_Niladhari
      UNION ALL
      SELECT
        'Samurdhi Officer' AS role,
        Officer_ID         AS user_id,
        Full_Name          AS full_name,
        Area               AS territory,
        Phone_Num          AS phone_num,
        CASE WHEN Password_Hash IS NULL OR Password_Hash = '' THEN 0 ELSE 1 END AS password_set
      FROM Samurdhi_officer
      ORDER BY role ASC, full_name ASC
    `);

    return res.status(200).json({
      status: 'success',
      users: users.map((u) => ({
        role:         u.role,
        user_id:      u.user_id,
        full_name:    u.full_name,
        territory:    u.territory,
        phone_num:    u.phone_num,
        password_set: Boolean(u.password_set),
      })),
    });
  } catch (err) {
    console.error('[adminController.listUsers]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to load users.' });
  }
}

// Helper: get table config for GN or Officer
function tableConfig(role) {
  if (role === 'Grama Niladhari') {
    return { table: 'Grama_Niladhari', idCol: 'GN_ID', nameCol: 'GN_FullName', territoryCol: 'Division', phoneCol: 'GN_P_Num' };
  }
  if (role === 'Samurdhi Officer') {
    return { table: 'Samurdhi_officer', idCol: 'Officer_ID', nameCol: 'Full_Name', territoryCol: 'Area', phoneCol: 'Phone_Num' };
  }
  return null;
}

// ── POST /api/admin/users ─────────────────────────────────────────────────────
// Body: { role, full_name, territory, phone_num, default_password }
async function createUser(req, res) {
  try {
    const role            = String(req.body?.role            || '').trim();
    const fullName        = String(req.body?.full_name       || '').trim();
    const territory       = String(req.body?.territory       || '').trim();
    const phoneNum        = String(req.body?.phone_num       || '').trim();
    const defaultPassword = String(req.body?.default_password || '').trim();

    const config = tableConfig(role);
    if (!config) {
      return res.status(400).json({ status: 'error', message: 'Invalid role. Must be "Grama Niladhari" or "Samurdhi Officer".' });
    }

    const errors = [];
    if (!fullName || fullName.length > 255)          errors.push('Full name is required (max 255 chars).');
    if (!territory || territory.length > 255)         errors.push('Territory/Division is required.');
    if (!/^[0-9+]{7,15}$/.test(phoneNum))            errors.push('Phone number must be 7-15 digits.');
    if (!defaultPassword || defaultPassword.length < 8) errors.push('Password must be at least 8 characters.');

    if (errors.length > 0) {
      return res.status(422).json({ status: 'error', message: 'Validation failed.', errors });
    }

    // Check phone uniqueness
    const [[existing]] = await pool.execute(
      `SELECT 1 FROM \`${config.table}\` WHERE \`${config.phoneCol}\` = ? LIMIT 1`,
      [phoneNum]
    );
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'Phone number already exists.' });
    }

    const hash = await bcrypt.hash(defaultPassword, 12);

    const [result] = await pool.execute(
      `INSERT INTO \`${config.table}\` (\`${config.nameCol}\`, \`${config.territoryCol}\`, \`${config.phoneCol}\`, \`Password_Hash\`)
       VALUES (?, ?, ?, ?)`,
      [fullName, territory, phoneNum, hash]
    );

    return res.status(201).json({
      status:  'success',
      message: 'User created successfully.',
      user: {
        role,
        user_id:      result.insertId,
        full_name:    fullName,
        territory,
        phone_num:    phoneNum,
        password_set: true,
      },
    });
  } catch (err) {
    console.error('[adminController.createUser]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to create user.' });
  }
}

// ── PUT /api/admin/users/:id ──────────────────────────────────────────────────
// Body: { role, full_name, territory, phone_num, default_password? }
async function updateUser(req, res) {
  try {
    const userId          = parseInt(req.params.id, 10);
    const role            = String(req.body?.role            || '').trim();
    const fullName        = String(req.body?.full_name       || '').trim();
    const territory       = String(req.body?.territory       || '').trim();
    const phoneNum        = String(req.body?.phone_num       || '').trim();
    const defaultPassword = String(req.body?.default_password || '').trim();

    if (!userId || userId < 1) {
      return res.status(400).json({ status: 'error', message: 'Invalid user ID.' });
    }

    const config = tableConfig(role);
    if (!config) {
      return res.status(400).json({ status: 'error', message: 'Invalid role.' });
    }

    const errors = [];
    if (!fullName || fullName.length > 255)          errors.push('Full name is required.');
    if (!territory || territory.length > 255)         errors.push('Territory/Division is required.');
    if (!/^[0-9+]{7,15}$/.test(phoneNum))            errors.push('Phone number must be 7-15 digits.');
    if (defaultPassword && defaultPassword.length < 8) errors.push('New password must be at least 8 characters.');

    if (errors.length > 0) {
      return res.status(422).json({ status: 'error', message: 'Validation failed.', errors });
    }

    const fields = [
      `\`${config.nameCol}\` = ?`,
      `\`${config.territoryCol}\` = ?`,
      `\`${config.phoneCol}\` = ?`,
    ];
    const params = [fullName, territory, phoneNum];

    if (defaultPassword) {
      const hash = await bcrypt.hash(defaultPassword, 12);
      fields.push('`Password_Hash` = ?');
      params.push(hash);
    }

    params.push(userId);

    const [result] = await pool.execute(
      `UPDATE \`${config.table}\` SET ${fields.join(', ')} WHERE \`${config.idCol}\` = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    return res.status(200).json({
      status:  'success',
      message: 'User updated successfully.',
      user: {
        role,
        user_id:      userId,
        full_name:    fullName,
        territory,
        phone_num:    phoneNum,
        password_set: true,
      },
    });
  } catch (err) {
    console.error('[adminController.updateUser]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to update user.' });
  }
}

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────
// Query: ?role=Grama+Niladhari or ?role=Samurdhi+Officer
async function deleteUser(req, res) {
  try {
    const userId = parseInt(req.params.id, 10);
    const role   = String(req.query?.role || req.body?.role || '').trim();

    if (!userId || userId < 1) {
      return res.status(400).json({ status: 'error', message: 'Invalid user ID.' });
    }

    const config = tableConfig(role);
    if (!config) {
      return res.status(400).json({ status: 'error', message: 'Invalid role query parameter.' });
    }

    const [result] = await pool.execute(
      `DELETE FROM \`${config.table}\` WHERE \`${config.idCol}\` = ?`,
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    return res.status(200).json({
      status:  'success',
      message: 'User deleted successfully.',
      deleted: { role, user_id: userId },
    });
  } catch (err) {
    console.error('[adminController.deleteUser]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to delete user.' });
  }
}

// ── GET /api/admin/reports ────────────────────────────────────────────────────
// Query: ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
async function getReport(req, res) {
  try {
    const startDate = String(req.query?.start_date || '').trim();
    const endDate   = String(req.query?.end_date   || '').trim();

    if (!startDate || !endDate) {
      return res.status(400).json({ status: 'error', message: 'start_date and end_date query params are required.' });
    }

    const [records] = await pool.execute(`
      SELECT
        wa.Application_ID    AS application_id,
        a.Full_Name           AS applicant_name,
        a.Applicant_ID        AS applicant_id,
        wa.Date               AS application_date,
        wa.App_Status         AS application_status,
        wa.Monthly_Income     AS monthly_income,
        wa.Family_Size        AS family_size,
        a.Address             AS applicant_address,
        sp.SP_ID              AS payment_id,
        sp.Date               AS payment_date,
        sp.Payment            AS payment_amount,
        sp.P_Status           AS payment_status,
        gn.GN_ID              AS gn_id,
        gn.GN_FullName        AS gn_name,
        gn.Division           AS division
      FROM Welfare_Application wa
      JOIN Applicant a ON a.Applicant_ID = wa.Applicant_ID
      LEFT JOIN Samurdhi_payment sp ON sp.Applicant_ID = a.Applicant_ID
      LEFT JOIN Grama_Niladhari gn  ON gn.GN_ID = sp.GN_ID
      WHERE wa.App_Status = 'Accepted'
        AND DATE(wa.Date) BETWEEN ? AND ?
      ORDER BY wa.Date DESC
    `, [startDate, endDate]);

    const totalPaymentAmount = records.reduce((sum, r) => sum + Number(r.payment_amount || 0), 0);

    return res.status(200).json({
      status: 'success',
      records: records.map((r) => ({
        application_id:     r.application_id,
        applicant_name:     r.applicant_name,
        applicant_id:       r.applicant_id,
        application_date:   r.application_date,
        application_status: r.application_status,
        monthly_income:     r.monthly_income,
        family_size:        r.family_size,
        applicant_address:  r.applicant_address,
        payment_id:         r.payment_id,
        payment_date:       r.payment_date,
        payment_amount:     r.payment_amount,
        payment_status:     r.payment_status,
        gn_id:              r.gn_id,
        gn_name:            r.gn_name,
        division:           r.division,
      })),
      summary: {
        approved_applications: records.filter((r, i, a) =>
          a.findIndex((x) => x.application_id === r.application_id) === i
        ).length,
        payment_rows:         records.length,
        total_payment_amount: totalPaymentAmount,
        start_date:           startDate,
        end_date:             endDate,
      },
    });
  } catch (err) {
    console.error('[adminController.getReport]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to generate report.' });
  }
}

module.exports = { getStats, listUsers, createUser, updateUser, deleteUser, getReport };

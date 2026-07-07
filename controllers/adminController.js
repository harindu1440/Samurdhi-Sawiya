'use strict';
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// Admin Controller
// ─────────────────────────────────────────────────────────────────────────────

async function getStats(req, res) {
  try {
    const [[counts]] = await pool.execute(`
      SELECT
        (SELECT COUNT(*) FROM \`WELFARE_APPLICATION\` WHERE \`Status\` = 'Accepted')  AS total_beneficiaries,
        (SELECT COALESCE(SUM(\`Amount\`), 0) FROM \`SAMURDHI_PAYMENT\`)                 AS total_funds_disbursed,
        (SELECT COUNT(*) FROM \`WELFARE_APPLICATION\` WHERE \`Status\` = 'Pending' OR \`Status\` = 'Under Review' OR \`Status\` = 'Forwarded') AS pending_approvals
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

async function listUsers(req, res) {
  try {
    const [users] = await pool.execute(`
      SELECT
        'Grama Niladhari'  AS role,
        u.User_ID          AS user_id,
        u.Username         AS full_name,
        gn.Division        AS territory,
        u.Phone_Num        AS phone_num,
        1                  AS password_set
      FROM \`GRAMA_NILADHARI\` gn
      JOIN \`USERS\` u ON u.User_ID = gn.GN_ID
      UNION ALL
      SELECT
        'Samurdhi Officer' AS role,
        u.User_ID          AS user_id,
        u.Username         AS full_name,
        so.Area            AS territory,
        u.Phone_Num        AS phone_num,
        1                  AS password_set
      FROM \`SAMURDHI_OFFICER\` so
      JOIN \`USERS\` u ON u.User_ID = so.Officer_ID
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

function tableConfig(role) {
  if (role === 'Grama Niladhari') {
    return { dbRole: 'Grama_Niladhari', table: 'GRAMA_NILADHARI', idCol: 'GN_ID', territoryCol: 'Division' };
  }
  if (role === 'Samurdhi Officer') {
    return { dbRole: 'Samurdhi_Officer', table: 'SAMURDHI_OFFICER', idCol: 'Officer_ID', territoryCol: 'Area' };
  }
  return null;
}

async function createUser(req, res) {
  const conn = await pool.getConnection();
  try {
    const role            = String(req.body?.role            || '').trim();
    const fullName        = String(req.body?.full_name       || '').trim();
    const territory       = String(req.body?.territory       || '').trim();
    const phoneNum        = String(req.body?.phone_num       || '').trim();
    const defaultPassword = String(req.body?.default_password || '').trim();

    const config = tableConfig(role);
    if (!config) {
      conn.release();
      return res.status(400).json({ status: 'error', message: 'Invalid role.' });
    }

    const errors = [];
    if (!fullName || fullName.length > 255)          errors.push('Full name/Username is required (max 255 chars).');
    if (!territory || territory.length > 255)         errors.push('Territory/Division is required.');
    if (!/^[0-9+]{7,15}$/.test(phoneNum))            errors.push('Phone number must be 7-15 digits.');
    if (!defaultPassword || defaultPassword.length < 8) errors.push('Password must be at least 8 characters.');

    if (errors.length > 0) {
      conn.release();
      return res.status(422).json({ status: 'error', message: 'Validation failed.', errors });
    }

    // Check unique username
    const [[existing]] = await conn.execute(
      `SELECT 1 FROM \`USERS\` WHERE \`Username\` = ? LIMIT 1`,
      [fullName]
    );
    if (existing) {
      conn.release();
      return res.status(409).json({ status: 'error', message: 'Username (Full Name) already exists.' });
    }

    const hash = await bcrypt.hash(defaultPassword, 12);

    await conn.beginTransaction();

    // 1. Insert USERS superclass
    const [userResult] = await conn.execute(
      `INSERT INTO \`USERS\` (\`Username\`, \`Password\`, \`Role\`, \`Phone_Num\`) VALUES (?, ?, ?, ?)`,
      [fullName, hash, config.dbRole, phoneNum]
    );
    const newUserId = userResult.insertId;

    // 2. Insert subclass
    await conn.execute(
      `INSERT INTO \`${config.table}\` (\`${config.idCol}\`, \`${config.territoryCol}\`) VALUES (?, ?)`,
      [newUserId, territory]
    );

    await conn.commit();
    conn.release();

    return res.status(201).json({
      status:  'success',
      message: 'User created successfully.',
      user: {
        role,
        user_id:      newUserId,
        full_name:    fullName,
        territory,
        phone_num:    phoneNum,
        password_set: true,
      },
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    conn.release();
    console.error('[adminController.createUser]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to create user.' });
  }
}

async function updateUser(req, res) {
  const conn = await pool.getConnection();
  try {
    const userId          = parseInt(req.params.id, 10);
    const role            = String(req.body?.role            || '').trim();
    const fullName        = String(req.body?.full_name       || '').trim();
    const territory       = String(req.body?.territory       || '').trim();
    const phoneNum        = String(req.body?.phone_num       || '').trim();
    const defaultPassword = String(req.body?.default_password || '').trim();

    if (!userId || userId < 1) {
      conn.release();
      return res.status(400).json({ status: 'error', message: 'Invalid user ID.' });
    }

    const config = tableConfig(role);
    if (!config) {
      conn.release();
      return res.status(400).json({ status: 'error', message: 'Invalid role.' });
    }

    const errors = [];
    if (!fullName || fullName.length > 255)          errors.push('Full name is required.');
    if (!territory || territory.length > 255)         errors.push('Territory/Division is required.');
    if (!/^[0-9+]{7,15}$/.test(phoneNum))            errors.push('Phone number must be 7-15 digits.');
    if (defaultPassword && defaultPassword.length < 8) errors.push('New password must be at least 8 characters.');

    if (errors.length > 0) {
      conn.release();
      return res.status(422).json({ status: 'error', message: 'Validation failed.', errors });
    }

    await conn.beginTransaction();

    const userFields = ['`Username` = ?', '`Phone_Num` = ?'];
    const userParams = [fullName, phoneNum];

    if (defaultPassword) {
      const hash = await bcrypt.hash(defaultPassword, 12);
      userFields.push('`Password` = ?');
      userParams.push(hash);
    }
    userParams.push(userId);

    const [uResult] = await conn.execute(
      `UPDATE \`USERS\` SET ${userFields.join(', ')} WHERE \`User_ID\` = ? AND \`Role\` = ?`,
      [...userParams, config.dbRole]
    );

    if (uResult.affectedRows === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    await conn.execute(
      `UPDATE \`${config.table}\` SET \`${config.territoryCol}\` = ? WHERE \`${config.idCol}\` = ?`,
      [territory, userId]
    );

    await conn.commit();
    conn.release();

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
    await conn.rollback().catch(() => {});
    conn.release();
    console.error('[adminController.updateUser]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to update user.' });
  }
}

async function deleteUser(req, res) {
  try {
    const userId = parseInt(req.params.id, 10);
    // User subclass is deleted via ON DELETE CASCADE in USERS table.
    
    if (!userId || userId < 1) {
      return res.status(400).json({ status: 'error', message: 'Invalid user ID.' });
    }

    const [result] = await pool.execute(
      `DELETE FROM \`USERS\` WHERE \`User_ID\` = ?`,
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    return res.status(200).json({
      status:  'success',
      message: 'User deleted successfully.',
      deleted: { user_id: userId },
    });
  } catch (err) {
    console.error('[adminController.deleteUser]', err.message);
    return res.status(500).json({ status: 'error', message: 'Unable to delete user.' });
  }
}

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
        u.Username           AS applicant_name,
        a.Applicant_ID       AS applicant_id,
        wa.Date              AS application_date,
        wa.Status            AS application_status,
        a.Monthly_Income     AS monthly_income,
        a.Address            AS applicant_address,
        sp.Payment_ID        AS payment_id,
        sp.Date              AS payment_date,
        sp.Amount            AS payment_amount,
        sp.Status            AS payment_status,
        gn.GN_ID             AS gn_id,
        gnUser.Username      AS gn_name,
        gn.Division          AS division
      FROM \`WELFARE_APPLICATION\` wa
      JOIN \`APPLICANT\` a ON a.Applicant_ID = wa.Applicant_ID
      JOIN \`USERS\` u ON u.User_ID = a.Applicant_ID
      LEFT JOIN \`SAMURDHI_PAYMENT\` sp ON sp.Applicant_ID = a.Applicant_ID
      LEFT JOIN \`MINISTER_APPROVAL\` ma ON ma.Request_ID = sp.Request_ID
      LEFT JOIN \`GRAMA_NILADHARI\` gn  ON gn.GN_ID = ma.GN_ID
      LEFT JOIN \`USERS\` gnUser ON gnUser.User_ID = gn.GN_ID
      WHERE wa.Status = 'Accepted'
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

'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Redirect map based on new roles
const ROLE_REDIRECTS = {
  'Applicant': 'applicant_dashboard.html',
  'Grama_Niladhari': 'gn_dashboard.html',
  'Samurdhi_Officer': 'officer_dashboard.html',
  'Admin': 'admin_dashboard.html',
  'Minister': 'minister_dashboard.html'
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { User_ID, Password, Role } (Note: frontend might send User_ID as the username field)
// ─────────────────────────────────────────────────────────────────────────────
async function login(req, res) {
  try {
    // The frontend sends { User_ID: "Username", Password: "pwd", Role: "role" }
    const username = String(req.body?.User_ID || '').trim();
    const password = String(req.body?.Password || '').trim();
    const role     = String(req.body?.Role || '').trim();

    if (!username || !password || !role) {
      return res.status(400).json({ status: 'error', message: 'Username, password, and role are required.' });
    }

    // Since the frontend role string might not match the ENUM exactly (e.g. 'Grama Niladhari' vs 'Grama_Niladhari')
    // we should normalize it.
    let dbRole = role;
    if (role === 'Grama Niladhari') dbRole = 'Grama_Niladhari';
    if (role === 'Samurdhi Officer') dbRole = 'Samurdhi_Officer';

    const redirectUrl = ROLE_REDIRECTS[dbRole];
    if (!redirectUrl) {
      return res.status(400).json({ status: 'error', message: 'Invalid role selected.' });
    }

    // ── Fetch from USERS superclass ──────────────────────────────────────────
    const sql = `SELECT * FROM \`USERS\` WHERE \`Username\` = ? AND \`Role\` = ? LIMIT 1`;
    const [rows] = await pool.execute(sql, [username, dbRole]);

    if (!rows || rows.length === 0) {
      await bcrypt.compare(password, '$2a$10$invalidhashpaddingtomatchtime000000000000000000000000000');
      return res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
    }

    const user = rows[0];
    const storedHash = String(user.Password || '');

    // ── Verify password ──────────────────────────────────────────────────────
    const isValid = await bcrypt.compare(password, storedHash);
    if (!isValid) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
    }

    // ── Issue JWT with new schema keys ───────────────────────────────────────
    const payload = {
      User_ID: user.User_ID,
      Role: user.Role,      // This is the DB ENUM (e.g., 'Grama_Niladhari')
      name: user.Username,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    return res.status(200).json({
      status: 'success',
      token: token,
      role: user.Role, // Return DB normalized role
      name: payload.name,
      redirect: redirectUrl,
    });
  } catch (err) {
    console.error('[authController.login]', err.message);
    return res.status(500).json({ status: 'error', message: 'Login failed. Please try again.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// Body: { Username, Phone_Num, Password }
// ─────────────────────────────────────────────────────────────────────────────
async function register(req, res) {
  let conn;
  try {
    conn = await pool.getConnection();
    const username = String(req.body?.Username  || '').trim();
    const phoneNum = String(req.body?.Phone_Num || '').trim();
    const password = String(req.body?.Password  || '');
    const fullName = String(req.body?.Full_Name || '').trim();
    const nic      = String(req.body?.NIC       || '').trim();
    const address  = String(req.body?.Address   || '').trim();
    const dob      = String(req.body?.DOB       || '').trim();
    const gender   = String(req.body?.Gender    || '').trim();

    if (!username || username.length < 3) {
      conn.release();
      return res.status(400).json({ status: 'error', message: 'Username must be at least 3 characters long.' });
    }
    if (!password || password.length < 8) {
      conn.release();
      return res.status(400).json({ status: 'error', message: 'Password must be at least 8 characters long.' });
    }
    if (phoneNum && !/^[0-9+]{7,20}$/.test(phoneNum)) {
      conn.release();
      return res.status(400).json({ status: 'error', message: 'Phone number must be 7–20 digits.' });
    }

    const [[existing]] = await conn.execute(
      'SELECT 1 FROM `USERS` WHERE `Username` = ? LIMIT 1',
      [username]
    );
    if (existing) {
      conn.release();
      return res.status(409).json({ status: 'error', message: 'That username is already taken. Please choose another.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await conn.beginTransaction();

    const [userResult] = await conn.execute(
      `INSERT INTO \`USERS\` (\`Username\`, \`Password\`, \`Role\`, \`Phone_Num\`)
       VALUES (?, ?, 'Applicant', ?)`,
      [username, passwordHash, phoneNum || null]
    );
    const newUserId = userResult.insertId;

    await conn.execute(
      'INSERT INTO `APPLICANT` (`Applicant_ID`, `Full_Name`, `NIC`, `Address`, `DOB`, `Gender`) VALUES (?, ?, ?, ?, ?, ?)',
      [newUserId, fullName || null, nic || null, address || null, dob || null, gender || null]
    );

    await conn.commit();
    conn.release();

    return res.status(201).json({
      status:  'success',
      message: 'Account created successfully. You can now log in.',
      user_id: newUserId,
    });

  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    if (conn) conn.release();
    console.error('[authController.register]', err.message);

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ status: 'error', message: 'That username or phone number is already registered.' });
    }
    return res.status(500).json({ status: 'error', message: 'Registration failed. Please try again later.' });
  }
}

module.exports = { login, register };

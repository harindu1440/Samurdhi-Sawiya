'use strict';

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/db');

// Redirect map — no separate Admin role; Minister is the top-level admin
const ROLE_REDIRECTS = {
  'Applicant':        'applicant_dashboard.html',
  'Grama_Niladhari':  'gn_dashboard.html',
  'Samurdhi_Officer': 'officer_dashboard.html',
  'Minister':         'admin_dashboard.html',
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { User_ID, Password, Role }
// ─────────────────────────────────────────────────────────────────────────────
async function login(req, res) {
  try {
    const username = String(req.body?.User_ID   || '').trim();
    const password = String(req.body?.Password  || '').trim();
    const role     = String(req.body?.Role      || '').trim();

    if (!username || !password || !role) {
      return res.status(400).json({ status: 'error', message: 'Username, password, and role are required.' });
    }

    // Normalise display-friendly role strings to DB ENUM values
    let dbRole = role;
    if (role === 'Grama Niladhari')  dbRole = 'Grama_Niladhari';
    if (role === 'Samurdhi Officer') dbRole = 'Samurdhi_Officer';

    const redirectUrl = ROLE_REDIRECTS[dbRole];
    if (!redirectUrl) {
      return res.status(400).json({ status: 'error', message: 'Invalid role selected.' });
    }

    const sql = 'SELECT * FROM `USERS` WHERE `Username` = ? AND `Role` = ? LIMIT 1';
    const [rows] = await pool.execute(sql, [username, dbRole]);

    if (!rows || rows.length === 0) {
      // Timing-safe: compare against a dummy hash even on miss
      await bcrypt.compare(password, '$2a$10$invalidhashpaddingtomatchtime000000000000000000000000000');
      return res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
    }

    const user       = rows[0];
    const storedHash = String(user.Password || '');

    const isValid = await bcrypt.compare(password, storedHash);
    if (!isValid) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
    }

    const payload = {
      User_ID: user.User_ID,
      Role:    user.Role,
      name:    user.Username,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    return res.status(200).json({
      status:   'success',
      token,
      role:     user.Role,
      name:     payload.name,
      redirect: redirectUrl,
    });
  } catch (err) {
    console.error('[authController.login]', err.message);
    return res.status(500).json({ status: 'error', message: 'Login failed. Please try again.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
//
// Combines Applicant account creation + Welfare Application submission in a
// single atomic MySQL transaction (3 queries):
//
//   Q1 → INSERT INTO USERS          (Username, Password, Role, Phone_Num)
//   Q2 → INSERT INTO APPLICANT      (Applicant_ID, Full_Name, NIC, Address,
//                                    DOB, Gender, Monthly_Income)
//   Q3 → INSERT INTO WELFARE_APPLICATION
//                                   (Applicant_ID, Status, Date,
//                                    Monthly_Income, Dependents, Reason)
//
// Rollback is triggered if ANY query fails. Commit only on full success.
// ─────────────────────────────────────────────────────────────────────────────
async function register(req, res) {
  let conn;
  try {
    // ── Parse & sanitise body ─────────────────────────────────────────────────
    // Section 1: Personal Information
    const fullName = String(req.body?.Full_Name  || '').trim();
    const nic      = String(req.body?.NIC        || '').trim();
    const dob      = String(req.body?.DOB        || '').trim() || null;
    const gender   = String(req.body?.Gender     || '').trim() || null;
    const phoneNum = String(req.body?.Phone_Num  || '').trim() || null;
    const address  = String(req.body?.Address    || '').trim();

    // Section 2: Credentials
    const username = String(req.body?.Username   || '').trim();
    const password = String(req.body?.Password   || '');

    // Section 3: Application Details
    const rawIncome     = req.body?.Monthly_Income;
    const rawDependents = req.body?.Dependents;
    const reason        = String(req.body?.Reason || '').trim();

    const monthlyIncome = rawIncome     !== undefined && rawIncome     !== null ? parseFloat(rawIncome)      : null;
    const dependents    = rawDependents !== undefined && rawDependents !== null ? parseInt(rawDependents, 10) : null;

    // House photo — provided by multer via upload.single('housePhoto')
    const housePhoto = req.file ? req.file.filename : null;

    // ── Server-side validation ────────────────────────────────────────────────
    const validationErrors = [];

    if (!fullName || fullName.length > 255)
      validationErrors.push('Full name is required (max 255 characters).');

    if (!nic || nic.length > 20)
      validationErrors.push('NIC number is required (max 20 characters).');

    if (!address)
      validationErrors.push('Address is required.');

    if (!username || username.length < 3 || username.length > 100)
      validationErrors.push('Username must be 3–100 characters long.');

    if (!password || password.length < 8)
      validationErrors.push('Password must be at least 8 characters long.');

    if (phoneNum && !/^[0-9+]{7,20}$/.test(phoneNum))
      validationErrors.push('Phone number must be 7–20 digits.');

    if (monthlyIncome === null || isNaN(monthlyIncome) || monthlyIncome < 0)
      validationErrors.push('Monthly income must be a non-negative number.');

    if (dependents === null || isNaN(dependents) || dependents < 0 || dependents > 20)
      validationErrors.push('Number of dependents must be between 0 and 20.');

    if (!reason || reason.length < 10)
      validationErrors.push('Reason for application must be at least 10 characters.');

    if (!housePhoto)
      validationErrors.push('A house photo is required. Please upload a JPEG or PNG image.');

    if (validationErrors.length > 0) {
      return res.status(400).json({
        status:  'error',
        message: validationErrors[0], // surface the first error to the frontend
        errors:  validationErrors,
      });
    }

    // ── Acquire connection and check for duplicate username ───────────────────
    conn = await pool.getConnection();

    const [[existing]] = await conn.execute(
      'SELECT 1 FROM `USERS` WHERE `Username` = ? LIMIT 1',
      [username]
    );
    if (existing) {
      conn.release();
      return res.status(409).json({
        status:  'error',
        message: 'That username is already taken. Please choose another.',
      });
    }

    // ── Hash password before transaction begins ───────────────────────────────
    const passwordHash = await bcrypt.hash(password, 12);

    // ── Begin atomic transaction ──────────────────────────────────────────────
    await conn.beginTransaction();

    // Q1 — Insert USERS superclass row
    const [userResult] = await conn.execute(
      `INSERT INTO \`USERS\` (\`Username\`, \`Password\`, \`Role\`, \`Phone_Num\`)
       VALUES (?, ?, 'Applicant', ?)`,
      [username, passwordHash, phoneNum]
    );
    const newUserId = userResult.insertId;

    // Q2 — Insert APPLICANT subclass row (same PK as USERS; no Monthly_Income in final schema)
    await conn.execute(
      `INSERT INTO \`APPLICANT\`
         (\`User_ID\`, \`Full_Name\`, \`NIC\`, \`Address\`, \`DOB\`, \`Gender\`)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [newUserId, fullName, nic || null, address, dob, gender]
    );

    // Q3 — Immediately create a WELFARE_APPLICATION tied to the new applicant
    const [appResult] = await conn.execute(
      `INSERT INTO \`WELFARE_APPLICATION\`
         (\`Applicant_ID\`, \`Status\`, \`Date_Submitted\`,
          \`Monthly_Income\`, \`Dependents\`, \`Reason\`, \`House_Photo\`)
       VALUES (?, 'Pending', CURDATE(), ?, ?, ?, ?)`,
      [newUserId, monthlyIncome, dependents, reason, housePhoto]
    );
    const newApplicationId = appResult.insertId;

    // ── All three queries succeeded — commit ──────────────────────────────────
    await conn.commit();
    conn.release();

    return res.status(201).json({
      status:         'success',
      message:        'Account created and application submitted successfully. You can now log in.',
      user_id:        newUserId,
      application_id: newApplicationId,
    });

  } catch (err) {
    // ── Rollback on any failure ───────────────────────────────────────────────
    if (conn) {
      await conn.rollback().catch((rbErr) =>
        console.error('[authController.register] rollback failed:', rbErr.message)
      );
      conn.release();
    }
    console.error('[authController.register]', err.message);

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        status:  'error',
        message: 'That username or NIC is already registered. Please check your details.',
      });
    }
    return res.status(500).json({
      status:  'error',
      message: 'Registration failed. Please try again later.',
    });
  }
}

module.exports = { login, register };

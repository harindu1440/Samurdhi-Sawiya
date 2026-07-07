'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// Role → MySQL table configuration
// Mirrors the original PHP tableDefinitionForRole() function.
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  Applicant: {
    table: 'Applicant',
    idColumn: 'Applicant_ID',
    nameColumn: 'Full_Name',
    passwordColumn: 'Password_Hash',
    redirect: 'applicant_dashboard.html',
  },
  'Grama Niladhari': {
    table: 'Grama_Niladhari',
    idColumn: 'GN_ID',
    nameColumn: 'GN_FullName',
    passwordColumn: 'Password_Hash',
    redirect: 'gn_dashboard.html',
  },
  'Samurdhi Officer': {
    table: 'Samurdhi_officer',
    idColumn: 'Officer_ID',
    nameColumn: 'Full_Name',
    passwordColumn: 'Password_Hash',
    redirect: 'officer_dashboard.html',
  },
  Admin: {
    table: 'Admin',
    idColumn: 'Admin_ID',
    nameColumn: 'Full_Name',
    passwordColumn: 'Password_Hash',
    redirect: 'admin_dashboard.html',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { User_ID, Password, Role }
// Returns: { token, role, name, redirect }
// ─────────────────────────────────────────────────────────────────────────────
async function login(req, res) {
  try {
    const userId   = String(req.body?.User_ID   || '').trim();
    const password = String(req.body?.Password   || '').trim();
    const role     = String(req.body?.Role        || '').trim();

    // ── Validate inputs ──────────────────────────────────────────────────────
    if (!userId || !password || !role) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID, password, and role are required.',
      });
    }

    const config = ROLE_CONFIG[role];
    if (!config) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid role selected.',
      });
    }

    if (!/^[A-Za-z0-9_-]+$/.test(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user identifier format.',
      });
    }

    // ── Fetch user from DB ───────────────────────────────────────────────────
    const sql = `SELECT * FROM \`${config.table}\` WHERE \`${config.idColumn}\` = ? LIMIT 1`;
    const [rows] = await pool.execute(sql, [userId]);

    if (!rows || rows.length === 0) {
      // Constant-time failure to prevent user enumeration
      await bcrypt.compare(password, '$2a$10$invalidhashpaddingtomatchtime000000000000000000000000000');
      return res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
    }

    const user = rows[0];
    const storedHash = String(user[config.passwordColumn] || '');

    if (!storedHash) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
    }

    // ── Verify password ──────────────────────────────────────────────────────
    const isValid = await bcrypt.compare(password, storedHash);
    if (!isValid) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
    }

    // ── Issue JWT ─────────────────────────────────────────────────────────────
    const payload = {
      id:   user[config.idColumn],
      role: role,
      name: String(user[config.nameColumn] || ''),
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    return res.status(200).json({
      status:   'success',
      token:    token,
      role:     role,
      name:     payload.name,
      redirect: config.redirect,
    });
  } catch (err) {
    console.error('[authController.login]', err.message);
    return res.status(500).json({ status: 'error', message: 'Login failed. Please try again.' });
  }
}

module.exports = { login };

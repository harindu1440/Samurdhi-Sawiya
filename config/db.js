'use strict';

const mysql = require('mysql2/promise');

// ─────────────────────────────────────────────────────────────────────────────
// Railway MySQL connection pool
// All values come from environment variables — no hardcoded fallbacks.
// In Railway, these are injected automatically when a MySQL service is linked.
// On Render, add them as Environment Variables in the dashboard.
// ─────────────────────────────────────────────────────────────────────────────

const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: Number(process.env.MYSQLPORT),

  // Pool sizing
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  // Keep connections alive through Railway's idle timeout
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,

  // Return JS Date objects for DATETIME columns
  dateStrings: false,

  // Charset
  charset: 'utf8mb4',
});

module.exports = pool;

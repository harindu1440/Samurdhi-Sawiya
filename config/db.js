'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// dotenv MUST be called before mysql.createPool() so that process.env values
// are populated when the pool configuration object is evaluated.
// On Pterodactyl / production, dotenv is a no-op (vars come from the panel).
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config();

const mysql = require('mysql2/promise');

// ─────────────────────────────────────────────────────────────────────────────
// MySQL connection pool
// All credentials come exclusively from environment variables.
// ─────────────────────────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host:     process.env.MYSQLHOST,
  user:     process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,   // dotenv strips surrounding quotes
  database: process.env.MYSQLDATABASE,
  port:     Number(process.env.MYSQLPORT) || 3306,

  // Pool sizing
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,

  // Keep connections alive through provider idle timeouts
  enableKeepAlive:       true,
  keepAliveInitialDelay: 30000,

  // Return JS Date objects for DATETIME columns
  dateStrings: false,

  // Charset
  charset: 'utf8mb4',
});

// ─────────────────────────────────────────────────────────────────────────────
// Startup connectivity test
// Runs immediately when the module is first loaded (i.e. at server boot).
// Logs success or the exact error so you can diagnose credential / network
// issues instantly from the Pterodactyl console without waiting for a request.
// ─────────────────────────────────────────────────────────────────────────────
pool.getConnection()
  .then((conn) => {
    console.log('[Database] Connected to MySQL successfully!');
    conn.release();
  })
  .catch((err) => {
    console.error('[Database] Connection FAILED:');
    console.error('  Code    :', err.code);
    console.error('  Message :', err.message);
    console.error('  Host    :', process.env.MYSQLHOST);
    console.error('  User    :', process.env.MYSQLUSER);
    console.error('  Database:', process.env.MYSQLDATABASE);
    console.error('  Port    :', process.env.MYSQLPORT);
    // Do NOT exit — let the server start; individual requests will surface errors
  });

module.exports = pool;

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Load environment variables from .env (local dev only).
// On Render, variables are set in the dashboard — dotenv is a no-op there.
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config();

const path    = require('path');
const fs      = require('fs');
const express = require('express');
const cors    = require('cors');
const apiRouter = require('./routes/api');

// ─────────────────────────────────────────────────────────────────────────────
// Auto-create upload directory on startup.
// This runs synchronously before the HTTP server is created, so multer always
// has a valid destination folder — no manual folder creation required.
// ─────────────────────────────────────────────────────────────────────────────
const UPLOAD_DIR_HOUSES = path.join(__dirname, 'public', 'uploads', 'houses');
if (!fs.existsSync(UPLOAD_DIR_HOUSES)) {
  fs.mkdirSync(UPLOAD_DIR_HOUSES, { recursive: true });
  console.log(`[startup] Created upload directory: ${UPLOAD_DIR_HOUSES}`);
}

const UPLOAD_DIR_VISITS = path.join(__dirname, 'public', 'uploads', 'home_visits');
if (!fs.existsSync(UPLOAD_DIR_VISITS)) {
  fs.mkdirSync(UPLOAD_DIR_VISITS, { recursive: true });
  console.log(`[startup] Created upload directory: ${UPLOAD_DIR_VISITS}`);
}

const app  = express();
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

// CORS — allow the frontend (same origin on Render, or localhost in dev)
app.use(cors({
  origin: true,      // reflect the request origin
  credentials: true, // allow Authorization header
}));

// Parse incoming JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────────────────────────────────
// API routes — must be mounted BEFORE static file serving
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

// ─────────────────────────────────────────────────────────────────────────────
// Static file serving
// Render serves the project from a single repo. The HTML/CSS/JS frontend lives
// at the project root; we copy/symlink or point express.static at the right dir.
//
// Strategy:
//   • public/  → holds uploads/houses/  (writable on Render disk)
//   • All HTML/CSS/JS/images remain at project root (served from __dirname)
// ─────────────────────────────────────────────────────────────────────────────

// Serve uploaded files (house photos)
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Serve the entire project root as static (HTML, assets/css, assets/js, etc.)
// This lets login.html, gn_dashboard.html, etc. all load from the same server.
app.use(express.static(path.join(__dirname)));

// ─────────────────────────────────────────────────────────────────────────────
// Fallback — serve index.html for any unmatched GET (SPA-style)
// This handles direct URL navigation (e.g. user bookmarks /gn_dashboard.html)
// ─────────────────────────────────────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─────────────────────────────────────────────────────────────────────────────
// Global error handler
// ─────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err.message);
  res.status(500).json({ status: 'error', message: 'Internal server error.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`SamurdhiSaviya server running on port ${PORT}`);
});

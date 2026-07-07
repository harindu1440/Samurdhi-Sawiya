'use strict';

const jwt = require('jsonwebtoken');

// ─────────────────────────────────────────────────────────────────────────────
// JWT Authentication Middleware
// Reads the Authorization: Bearer <token> header, verifies the token using
// JWT_SECRET, and appends the decoded payload to req.user.
// The payload includes: { id, role, name }
// ─────────────────────────────────────────────────────────────────────────────

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'No token provided. Please log in.',
    });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, name, iat, exp }
    return next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Session expired. Please log in again.'
        : 'Invalid token. Please log in.';

    return res.status(401).json({ status: 'error', message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Role guard factory — use after authMiddleware
// Example: router.get('/admin/stats', authMiddleware, requireRole('Admin'), ...)
// ─────────────────────────────────────────────────────────────────────────────
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to access this resource.',
      });
    }
    return next();
  };
}

module.exports = { authMiddleware, requireRole };

'use strict';
const jwt = require('jsonwebtoken');

// ─────────────────────────────────────────────────────────────────────────────
// JWT Authentication Middleware
// Reads the Authorization: Bearer <token> header, verifies the token using
// JWT_SECRET, and appends the decoded payload to req.user.
// The payload includes: { User_ID, Role, name }
// ─────────────────────────────────────────────────────────────────────────────

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'No token provided. Please log in.',
    });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { User_ID, Role, name, iat, exp }
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
// ─────────────────────────────────────────────────────────────────────────────
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // Note: our new DB uses Role as Enum ('Admin', 'Minister', 'Grama_Niladhari', 'Samurdhi_Officer', 'Applicant')
    // We map frontend role names to DB ENUM if needed, but assuming JWT Role matches frontend requested role.
    if (!req.user || !allowedRoles.includes(req.user.Role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to access this resource.',
      });
    }
    return next();
  };
}

module.exports = { authMiddleware, requireRole };

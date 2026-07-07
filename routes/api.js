'use strict';

const path    = require('path');
const express = require('express');
const multer  = require('multer');
const router  = express.Router();

const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const authController      = require('../controllers/authController');
const applicantController = require('../controllers/applicantController');
const gnController        = require('../controllers/gnController');
const officerController   = require('../controllers/officerController');
const adminController     = require('../controllers/adminController');

// ─────────────────────────────────────────────────────────────────────────────
// Multer — house photo upload
// Saves files to public/uploads/houses/ with a timestamped filename.
// NOTE: Render's filesystem is ephemeral. Files survive restarts only on disk.
// ─────────────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'public', 'uploads', 'houses'),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `house_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, name);
  },
});

const uploadFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG and PNG images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter: uploadFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

// ─────────────────────────────────────────────────────────────────────────────
// ── Public routes ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/auth/login
router.post('/auth/login', authController.login);

// POST /api/auth/register  (public — no JWT required)
router.post('/auth/register', authController.register);

// ─────────────────────────────────────────────────────────────────────────────
// ── Applicant routes ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/applications/submit',
  authMiddleware,
  requireRole('Applicant'),
  upload.single('house_photo'),
  applicantController.submitApplication
);

router.get(
  '/applicant/dashboard',
  authMiddleware,
  requireRole('Applicant'),
  applicantController.getDashboard
);

router.get(
  '/applicant/payments',
  authMiddleware,
  requireRole('Applicant'),
  applicantController.getPayments
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Grama Niladhari routes ────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/gn/stats',
  authMiddleware,
  requireRole('Grama Niladhari'),
  gnController.getStats
);

router.get(
  '/gn/applications',
  authMiddleware,
  requireRole('Grama Niladhari'),
  gnController.getApplications
);

router.get(
  '/gn/applications/:id',
  authMiddleware,
  requireRole('Grama Niladhari'),
  gnController.getApplicationDetail
);

router.post(
  '/gn/review',
  authMiddleware,
  requireRole('Grama Niladhari'),
  gnController.review
);

router.get(
  '/gn/payments',
  authMiddleware,
  requireRole('Grama Niladhari'),
  gnController.getPayments
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Samurdhi Officer routes ───────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/officer/dashboard',
  authMiddleware,
  requireRole('Samurdhi Officer'),
  officerController.getDashboard
);

router.post(
  '/officer/review',
  authMiddleware,
  requireRole('Samurdhi Officer'),
  officerController.review
);

router.post(
  '/officer/visit',
  authMiddleware,
  requireRole('Samurdhi Officer'),
  officerController.submitVisit
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Admin routes ──────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/admin/stats',
  authMiddleware,
  requireRole('Admin'),
  adminController.getStats
);

router.get(
  '/admin/users',
  authMiddleware,
  requireRole('Admin'),
  adminController.listUsers
);

router.post(
  '/admin/users',
  authMiddleware,
  requireRole('Admin'),
  adminController.createUser
);

router.put(
  '/admin/users/:id',
  authMiddleware,
  requireRole('Admin'),
  adminController.updateUser
);

router.delete(
  '/admin/users/:id',
  authMiddleware,
  requireRole('Admin'),
  adminController.deleteUser
);

router.get(
  '/admin/reports',
  authMiddleware,
  requireRole('Admin'),
  adminController.getReport
);

// ─────────────────────────────────────────────────────────────────────────────
// Multer error handler (file type/size rejections)
// ─────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError || err.message) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
  return res.status(500).json({ status: 'error', message: 'Unexpected server error.' });
});

module.exports = router;

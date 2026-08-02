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
const ministerController  = require('../controllers/ministerController');
const complaintController = require('../controllers/complaintController');

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

const homeVisitStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'public', 'uploads', 'home_visits'),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `visit_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, name);
  },
});

const uploadHomeVisit = multer({
  storage: homeVisitStorage,
  fileFilter: uploadFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

// ─────────────────────────────────────────────────────────────────────────────
// APPLICANT — Complaints
// ─────────────────────────────────────────────────────────────────────────────
router.post('/applicant/complaints', authMiddleware, requireRole('Applicant'), complaintController.lodgeComplaint);
router.get('/applicant/complaints', authMiddleware, requireRole('Applicant'), complaintController.getApplicantComplaints);

// ─────────────────────────────────────────────────────────────────────────────
// ── Public routes ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/auth/login
router.post('/auth/login', authController.login);

// POST /api/auth/register  (public — no JWT required, multipart/form-data)
router.post('/auth/register', upload.array('housePhoto', 5), authController.register);

// PUT /api/auth/change-password (requires auth)
router.put('/auth/change-password', authMiddleware, authController.changePassword);

// ─────────────────────────────────────────────────────────────────────────────
// ── Applicant routes ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/applications/submit',
  authMiddleware,
  requireRole('Applicant'),
  upload.array('house_photo', 5),
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

router.put(
  '/applicant/application/update',
  authMiddleware,
  requireRole('Applicant'),
  applicantController.updateApplication
);

router.get(
  '/applicant/application/edit-data',
  authMiddleware,
  requireRole('Applicant'),
  applicantController.getEditData
);

router.get(
  '/applicant/notifications',
  authMiddleware,
  requireRole('Applicant'),
  applicantController.getNotifications
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Grama Niladhari routes ────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/gn/dashboard',
  authMiddleware,
  requireRole('Grama_Niladhari'),
  gnController.getDashboard
);

router.get(
  '/gn/stats',
  authMiddleware,
  requireRole('Grama_Niladhari'),
  gnController.getStats
);

router.get(
  '/gn/applications',
  authMiddleware,
  requireRole('Grama_Niladhari'),
  gnController.getApplications
);

router.get(
  '/gn/applications/:id',
  authMiddleware,
  requireRole('Grama_Niladhari'),
  gnController.getApplicationDetail
);

router.post(
  '/gn/action',
  authMiddleware,
  requireRole('Grama_Niladhari'),
  gnController.action
);

router.post(
  '/gn/review',
  authMiddleware,
  requireRole('Grama_Niladhari'),
  gnController.review
);

router.get(
  '/gn/payments',
  authMiddleware,
  requireRole('Grama_Niladhari'),
  gnController.getPayments
);

router.get(
  '/gn/approved',
  authMiddleware,
  requireRole('Grama_Niladhari'),
  gnController.getApprovedApplications
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Samurdhi Officer routes ───────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/officer/profile',
  authMiddleware,
  requireRole('Samurdhi_Officer'),
  officerController.getProfile
);

router.get(
  '/officer/dashboard',
  authMiddleware,
  requireRole('Samurdhi_Officer'),
  officerController.getDashboard
);

router.post(
  '/officer/review',
  authMiddleware,
  requireRole('Samurdhi_Officer'),
  officerController.review
);

router.post(
  '/officer/visit',
  authMiddleware,
  requireRole('Samurdhi_Officer'),
  uploadHomeVisit.array('home_visit_photo', 5),
  officerController.submitVisit
);

router.get(
  '/officer/approved',
  authMiddleware,
  requireRole('Samurdhi_Officer'),
  officerController.getApprovedApplications
);

router.get(
  '/officer/my-applicants',
  authMiddleware,
  requireRole('Samurdhi_Officer'),
  officerController.getMyApplicants
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Minister routes (top-level admin) ─────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/admin/stats',
  authMiddleware,
  requireRole('Minister'),
  adminController.getStats
);

router.get(
  '/admin/users',
  authMiddleware,
  requireRole('Minister'),
  adminController.listUsers
);

router.post(
  '/admin/users',
  authMiddleware,
  requireRole('Minister'),
  adminController.createUser
);

router.put(
  '/admin/users/:id',
  authMiddleware,
  requireRole('Minister'),
  adminController.updateUser
);

router.delete(
  '/admin/users/:id',
  authMiddleware,
  requireRole('Minister'),
  adminController.deleteUser
);

router.get(
  '/admin/reports',
  authMiddleware,
  requireRole('Minister'),
  adminController.getReport
);

router.get(
  '/admin/payments',
  authMiddleware,
  requireRole('Minister'),
  adminController.getPayments
);

// ─────────────────────────────────────────────────────────────────────────────
// MINISTER ROUTES
// ─────────────────────────────────────────────────────────────────────────────
router.get('/minister/approvals', authMiddleware, requireRole('Minister'), ministerController.getApprovals);
router.post('/minister/approvals/:id/action', authMiddleware, requireRole('Minister'), ministerController.actionApproval);

router.get('/minister/complaints', authMiddleware, requireRole('Minister'), complaintController.getAllComplaints);
router.post('/minister/complaints/:id/resolve', authMiddleware, requireRole('Minister'), complaintController.resolveComplaint);

router.get(
  '/minister/approved',
  authMiddleware,
  requireRole('Minister'),
  ministerController.getApprovedApplications
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

/**
 * routes/studentRoutes.js
 * -----------------------
 * Routing and input validation for student placement profile operations.
 */

const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');
const studentController = require('../controllers/studentController');
const { verifyToken, allowRoles } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/errorHandler');

const router = express.Router();

// Enforce student role authentication across all endpoints in this router
router.use(verifyToken, allowRoles('student'));

// ============================================================================
// MULTER STORAGE CONFIGURATION (PDF only, max 2 MB, memory storage)
// ============================================================================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024 // 2 Megabytes
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF documents are allowed.'));
    }
  }
});

// Middleware wrapper to return clear user-friendly errors for file type or size limits
const handleResumeUpload = (req, res, next) => {
  upload.single('resume')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds 2 MB limit. Please upload a smaller PDF.',
          data: null
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
        data: null
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
        data: null
      });
    }
    next();
  });
};

/**
 * @route   GET /api/students/dashboard
 * @desc    Get current student's placement dashboard stats (profile completion, counts by status, eligible drives)
 * @access  Protected (student)
 */
router.get('/dashboard', studentController.getDashboard);

/**
 * @route   POST /api/students/resume
 * @desc    Upload student resume PDF to Supabase Storage and save public URL in student_profiles
 * @access  Protected (student)
 */
router.post('/resume', handleResumeUpload, studentController.uploadResume);

/**
 * @route   GET /api/students/profile
 * @desc    Get current student's placement profile
 * @access  Protected (student)
 */
router.get('/profile', studentController.getProfile);

/**
 * @route   PUT /api/students/profile
 * @desc    Create or update current student's placement details
 * @access  Protected (student)
 */
router.put(
  '/profile',
  [
    body('roll_number')
      .optional({ checkFalsy: true })
      .trim()
      .notEmpty()
      .withMessage('Roll number cannot be empty when provided.'),
    body('current_year')
      .optional({ checkFalsy: true })
      .isInt({ min: 1, max: 6 })
      .withMessage('Current year must be an integer between 1 and 6.'),
    body('graduation_year')
      .optional({ checkFalsy: true })
      .isInt({ min: 1950, max: 2100 })
      .withMessage('Graduation year must be a valid 4-digit year.'),
    body('cgpa')
      .optional({ checkFalsy: true })
      .isFloat({ min: 0.0, max: 10.0 })
      .withMessage('CGPA must be a decimal between 0.00 and 10.00.'),
    body('backlogs')
      .optional({ checkFalsy: true })
      .isInt({ min: 0 })
      .withMessage('Backlogs count cannot be negative.'),
    body('resume_url')
      .optional({ checkFalsy: true })
      .isURL()
      .withMessage('Resume URL must be a valid URL.'),
    validate
  ],
  studentController.updateProfile
);

module.exports = router;

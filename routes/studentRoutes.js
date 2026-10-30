/**
 * routes/studentRoutes.js
 * -----------------------
 * Routing and input validation for student placement profile operations.
 */

const express = require('express');
const { body } = require('express-validator');
const studentController = require('../controllers/studentController');
const { verifyToken, allowRoles } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/errorHandler');

const router = express.Router();

// Enforce student role authentication across all endpoints in this router
router.use(verifyToken, allowRoles('student'));

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

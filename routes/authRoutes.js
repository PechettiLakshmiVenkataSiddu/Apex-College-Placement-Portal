/**
 * routes/authRoutes.js
 * --------------------
 * Express routing and validation middleware for authentication endpoints.
 */

const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new student or recruiter account
 * @access  Public
 */
router.post(
  '/register',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required.'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address.')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long.'),
    body('role')
      .trim()
      .isIn(['student', 'recruiter'])
      .withMessage("Role must be either 'student' or 'recruiter'."),
    validate
  ],
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and retrieve JWT token
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address.')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required.'),
    validate
  ],
  authController.login
);

/**
 * @route   GET /api/auth/me
 * @desc    Get currently logged in user info
 * @access  Protected (Requires Bearer token)
 */
router.get('/me', verifyToken, authController.getMe);

module.exports = router;

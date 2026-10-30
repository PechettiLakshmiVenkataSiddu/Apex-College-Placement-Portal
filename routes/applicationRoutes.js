/**
 * routes/applicationRoutes.js
 * ----------------------------
 * Express routing for job applications.
 */

const express = require('express');
const { body } = require('express-validator');
const applicationController = require('../controllers/applicationController');
const { verifyToken, allowRoles } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/errorHandler');

const router = express.Router();

// All application endpoints require authentication
router.use(verifyToken);

/**
 * @route   GET /api/applications/my
 * @desc    View all applications submitted by the logged-in student
 * @access  Protected (student)
 */
router.get(
  '/my',
  allowRoles('student'),
  applicationController.getMyApplications
);

/**
 * @route   GET /api/applications/job/:jobId
 * @desc    View all applicant profiles for a specific job
 * @access  Protected (recruiter, own jobs only)
 */
router.get(
  '/job/:jobId',
  allowRoles('recruiter'),
  applicationController.getJobApplicants
);

/**
 * @route   POST /api/applications/:jobId
 * @desc    Apply to a job posting
 * @access  Protected (student)
 */
router.post(
  '/:jobId',
  allowRoles('student'),
  applicationController.applyForJob
);

/**
 * @route   PUT /api/applications/:id/status
 * @desc    Update candidate application status
 * @access  Protected (recruiter, own jobs only)
 */
router.put(
  '/:id/status',
  allowRoles('recruiter'),
  [
    body('status')
      .trim()
      .toLowerCase()
      .isIn(['applied', 'shortlisted', 'rejected', 'selected'])
      .withMessage("Status must be one of: 'applied', 'shortlisted', 'rejected', 'selected'."),
    validate
  ],
  applicationController.updateApplicationStatus
);

module.exports = router;

/**
 * routes/jobRoutes.js
 * -------------------
 * Routing table for campus placement drives and job postings.
 */

const express = require('express');
const { body } = require('express-validator');
const jobController = require('../controllers/jobController');
const { verifyToken, allowRoles } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @route   GET /api/jobs
 * @desc    Get all active jobs (public, supports query filters: search, location, job_type)
 * @access  Public
 */
router.get('/', jobController.getAllJobs);

/**
 * @route   GET /api/jobs/my/list
 * @desc    Get all jobs posted by the logged-in company
 * @access  Protected (recruiter)
 */
router.get(
  '/my/list',
  verifyToken,
  allowRoles('recruiter'),
  jobController.getMyJobs
);

/**
 * @route   GET /api/jobs/:id
 * @desc    Get a single job's full details
 * @access  Public
 */
router.get('/:id', jobController.getJobById);

/**
 * @route   POST /api/jobs
 * @desc    Post a new campus job with placement criteria
 * @access  Protected (recruiter)
 */
router.post(
  '/',
  verifyToken,
  allowRoles('recruiter'),
  [
    body('title').trim().notEmpty().withMessage('Job title is required.'),
    body('company').trim().notEmpty().withMessage('Company name is required.'),
    body('description').trim().notEmpty().withMessage('Job description is required.'),
    body('location').trim().notEmpty().withMessage('Job location is required.'),
    body('job_type').trim().notEmpty().withMessage('Job type is required (e.g., Full-time, Internship).'),
    body('deadline')
      .notEmpty()
      .withMessage('Application deadline date is required.')
      .isISO8601()
      .withMessage('Deadline must be a valid date in YYYY-MM-DD format.'),
    body('min_cgpa')
      .optional()
      .isFloat({ min: 0.0, max: 10.0 })
      .withMessage('Minimum CGPA must be a number between 0.00 and 10.00.'),
    body('max_backlogs')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Maximum backlogs must be 0 or a positive integer.'),
    validate
  ],
  jobController.createJob
);

/**
 * @route   PUT /api/jobs/:id
 * @desc    Update a job posting
 * @access  Protected (recruiter, own jobs only)
 */
router.put(
  '/:id',
  verifyToken,
  allowRoles('recruiter'),
  [
    body('deadline')
      .optional()
      .isISO8601()
      .withMessage('Deadline must be a valid date in YYYY-MM-DD format.'),
    body('min_cgpa')
      .optional()
      .isFloat({ min: 0.0, max: 10.0 })
      .withMessage('Minimum CGPA must be a number between 0.00 and 10.00.'),
    body('max_backlogs')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Maximum backlogs must be 0 or a positive integer.'),
    validate
  ],
  jobController.updateJob
);

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Delete a job posting
 * @access  Protected (recruiter for own jobs, admin for any job)
 */
router.delete(
  '/:id',
  verifyToken,
  allowRoles('recruiter', 'admin'),
  jobController.deleteJob
);

module.exports = router;

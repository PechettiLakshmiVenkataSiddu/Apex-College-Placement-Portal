/**
 * routes/adminRoutes.js
 * ---------------------
 * Express routing for College Placement Officer (Admin) operations.
 * All routes require authentication and 'admin' role.
 */

const express = require('express');
const adminController = require('../controllers/adminController');
const { verifyToken, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Enforce Placement Officer (admin) access across all endpoints
router.use(verifyToken, allowRoles('admin'));

/**
 * @route   GET /api/admin/recruiters/pending
 * @desc    View all company recruiter accounts awaiting placement cell approval
 * @access  Protected (admin)
 */
router.get('/recruiters/pending', adminController.getPendingRecruiters);

/**
 * @route   PUT /api/admin/recruiters/:id/approve
 * @desc    Approve a company recruiter account
 * @access  Protected (admin)
 */
router.put('/recruiters/:id/approve', adminController.approveRecruiter);

/**
 * @route   PUT /api/admin/students/:id/verify
 * @desc    Verify student academic credentials (by user_id or profile id)
 * @access  Protected (admin)
 */
router.put('/students/:id/verify', adminController.verifyStudent);

/**
 * @route   GET /api/admin/placements
 * @desc    View list of all placed/selected students with company and job details
 * @access  Protected (admin)
 */
router.get('/placements', adminController.getPlacements);

/**
 * @route   GET /api/admin/stats
 * @desc    Get complete placement metrics (students, verified, companies, approved, jobs, placed %, etc.)
 * @access  Protected (admin)
 */
router.get('/stats', adminController.getStats);

/**
 * @route   GET /api/admin/users
 * @desc    View all system users (students, recruiters, admins) with optional ?role=
 * @access  Protected (admin)
 */
router.get('/users', adminController.getAllUsers);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete a user account
 * @access  Protected (admin)
 */
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;

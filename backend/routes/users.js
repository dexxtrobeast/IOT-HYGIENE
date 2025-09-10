const express = require('express');
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User');
const { requireAdmin } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private (admin only)
router.get('/', requireAdmin, [
  query('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Invalid role'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { role, isActive, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  // Build filter
  let filter = {};
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  // Get users with pagination
  const users = await User.find(filter)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await User.countDocuments(filter);

  res.json({
    users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (admin only)
router.get('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({ user });
}));

// @route   PUT /api/users/:id
// @desc    Update user (admin only)
// @access  Private (admin only)
router.put('/:id', requireAdmin, [
  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  body('phoneNumber')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Invalid role'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { firstName, lastName, phoneNumber, role, isActive } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Prevent admin from deactivating themselves
  if (user._id.toString() === req.user._id.toString() && isActive === false) {
    throw new AppError('Cannot deactivate your own account', 400);
  }

  // Update fields
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
  if (role !== undefined) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;

  await user.save();

  logger.info(`User updated by ${req.user.email}: ${user.email}`);

  res.json({
    message: 'User updated successfully',
    user: user.toPublicJSON()
  });
}));

// @route   DELETE /api/users/:id
// @desc    Delete user (admin only)
// @access  Private (admin only)
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Prevent admin from deleting themselves
  if (user._id.toString() === req.user._id.toString()) {
    throw new AppError('Cannot delete your own account', 400);
  }

  await User.findByIdAndDelete(req.params.id);

  logger.info(`User deleted by ${req.user.email}: ${user.email}`);

  res.json({
    message: 'User deleted successfully'
  });
}));

// @route   POST /api/users/:id/activate
// @desc    Activate user account (admin only)
// @access  Private (admin only)
router.post('/:id/activate', requireAdmin, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.isActive) {
    throw new AppError('User is already active', 400);
  }

  user.isActive = true;
  await user.save();

  logger.info(`User activated by ${req.user.email}: ${user.email}`);

  res.json({
    message: 'User activated successfully',
    user: user.toPublicJSON()
  });
}));

// @route   POST /api/users/:id/deactivate
// @desc    Deactivate user account (admin only)
// @access  Private (admin only)
router.post('/:id/deactivate', requireAdmin, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Prevent admin from deactivating themselves
  if (user._id.toString() === req.user._id.toString()) {
    throw new AppError('Cannot deactivate your own account', 400);
  }

  if (!user.isActive) {
    throw new AppError('User is already inactive', 400);
  }

  user.isActive = false;
  await user.save();

  logger.info(`User deactivated by ${req.user.email}: ${user.email}`);

  res.json({
    message: 'User deactivated successfully',
    user: user.toPublicJSON()
  });
}));

// @route   POST /api/users/:id/promote
// @desc    Promote user to admin (admin only)
// @access  Private (admin only)
router.post('/:id/promote', requireAdmin, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.role === 'admin') {
    throw new AppError('User is already an admin', 400);
  }

  user.role = 'admin';
  await user.save();

  logger.info(`User promoted to admin by ${req.user.email}: ${user.email}`);

  res.json({
    message: 'User promoted to admin successfully',
    user: user.toPublicJSON()
  });
}));

// @route   POST /api/users/:id/demote
// @desc    Demote admin to user (admin only)
// @access  Private (admin only)
router.post('/:id/demote', requireAdmin, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Prevent admin from demoting themselves
  if (user._id.toString() === req.user._id.toString()) {
    throw new AppError('Cannot demote your own account', 400);
  }

  if (user.role === 'user') {
    throw new AppError('User is already a regular user', 400);
  }

  user.role = 'user';
  await user.save();

  logger.info(`User demoted from admin by ${req.user.email}: ${user.email}`);

  res.json({
    message: 'User demoted successfully',
    user: user.toPublicJSON()
  });
}));

// @route   GET /api/users/stats/overview
// @desc    Get user statistics
// @access  Private (admin only)
router.get('/stats/overview', requireAdmin, asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: true });
  const adminUsers = await User.countDocuments({ role: 'admin' });
  const regularUsers = await User.countDocuments({ role: 'user' });

  // Get recent registrations (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentRegistrations = await User.countDocuments({
    createdAt: { $gte: thirtyDaysAgo }
  });

  // Get users by registration month (last 6 months)
  const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
  const registrationsByMonth = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);

  res.json({
    stats: {
      totalUsers,
      activeUsers,
      adminUsers,
      regularUsers,
      recentRegistrations,
      registrationsByMonth
    }
  });
}));

// @route   GET /api/users/search
// @desc    Search users
// @access  Private (admin only)
router.get('/search', requireAdmin, [
  query('q')
    .isLength({ min: 1 })
    .withMessage('Search query is required'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { q, limit = 10 } = req.query;

  // Search in username, email, firstName, and lastName
  const users = await User.find({
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { firstName: { $regex: q, $options: 'i' } },
      { lastName: { $regex: q, $options: 'i' } }
    ]
  })
    .select('-password')
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  res.json({
    users
  });
}));

module.exports = router;

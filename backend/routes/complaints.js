const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Complaint = require('../models/Complaint');
const { requireAdmin, requireOwnershipOrAdmin } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// Validation middleware
const validateComplaint = [
  body('title')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Description must be between 1 and 1000 characters'),
  body('category')
    .isIn(['maintenance', 'cleanliness', 'security', 'other'])
    .withMessage('Invalid category'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid priority level'),
  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object')
];

// @route   GET /api/complaints
// @desc    Get all complaints (filtered by user role)
// @access  Private
router.get('/', [
  query('status')
    .optional()
    .isIn(['pending', 'in-progress', 'resolved', 'closed'])
    .withMessage('Invalid status'),
  query('category')
    .optional()
    .isIn(['maintenance', 'cleanliness', 'security', 'other'])
    .withMessage('Invalid category'),
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid priority'),
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

  const { status, category, priority, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  // Build filter based on user role
  let filter = {};
  
  if (req.user.role !== 'admin') {
    // Regular users can only see their own complaints
    filter.userId = req.user._id;
  }

  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;

  // Get complaints with pagination
  const complaints = await Complaint.find(filter)
    .populate('userId', 'username email firstName lastName')
    .populate('assignedTo', 'username firstName lastName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await Complaint.countDocuments(filter);

  logger.info(`Complaints retrieved by ${req.user.email}: ${complaints.length} complaints`);

  res.json({
    complaints,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// @route   GET /api/complaints/:id
// @desc    Get complaint by ID
// @access  Private
router.get('/:id', asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id)
    .populate('userId', 'username email firstName lastName')
    .populate('assignedTo', 'username firstName lastName')
    .populate('adminResponse.respondedBy', 'username firstName lastName');

  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  // Check if user has access to this complaint
  if (req.user.role !== 'admin' && complaint.userId._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied', 403);
  }

  res.json({ complaint });
}));

// @route   POST /api/complaints
// @desc    Create a new complaint
// @access  Private
router.post('/', validateComplaint, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { title, description, category, priority = 'medium', location } = req.body;

  const complaint = new Complaint({
    title,
    description,
    category,
    priority,
    location,
    userId: req.user._id
  });

  await complaint.save();

  // Populate user info for response
  await complaint.populate('userId', 'username email firstName lastName');

  logger.info(`New complaint created by ${req.user.email}: ${complaint.title}`);

  // Emit socket event for real-time updates
  const io = req.app.get('io');
  io.emit('complaint:created', { complaint });

  res.status(201).json({
    message: 'Complaint created successfully',
    complaint
  });
}));

// @route   PUT /api/complaints/:id
// @desc    Update complaint
// @access  Private (owner or admin)
router.put('/:id', validateComplaint, requireOwnershipOrAdmin('userId'), asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { title, description, category, priority, location } = req.body;

  const complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  // Only allow updates if complaint is not resolved or closed
  if (complaint.status === 'resolved' || complaint.status === 'closed') {
    throw new AppError('Cannot update resolved or closed complaints', 400);
  }

  // Update fields
  if (title !== undefined) complaint.title = title;
  if (description !== undefined) complaint.description = description;
  if (category !== undefined) complaint.category = category;
  if (priority !== undefined) complaint.priority = priority;
  if (location !== undefined) complaint.location = location;

  await complaint.save();

  // Populate user info for response
  await complaint.populate('userId', 'username email firstName lastName');
  await complaint.populate('assignedTo', 'username firstName lastName');

  logger.info(`Complaint updated by ${req.user.email}: ${complaint.title}`);

  // Emit socket event for real-time updates
  const io = req.app.get('io');
  io.emit('complaint:updated', { complaint });

  res.json({
    message: 'Complaint updated successfully',
    complaint
  });
}));

// @route   DELETE /api/complaints/:id
// @desc    Delete complaint
// @access  Private (owner or admin)
router.delete('/:id', requireOwnershipOrAdmin('userId'), asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  // Only allow deletion if complaint is pending
  if (complaint.status !== 'pending') {
    throw new AppError('Can only delete pending complaints', 400);
  }

  await Complaint.findByIdAndDelete(req.params.id);

  logger.info(`Complaint deleted by ${req.user.email}: ${complaint.title}`);

  // Emit socket event for real-time updates
  const io = req.app.get('io');
  io.emit('complaint:deleted', { complaintId: req.params.id });

  res.json({
    message: 'Complaint deleted successfully'
  });
}));

// @route   POST /api/complaints/:id/respond
// @desc    Add admin response to complaint
// @access  Private (admin only)
router.post('/:id/respond', requireAdmin, [
  body('message')
    .isLength({ min: 1, max: 500 })
    .withMessage('Response message must be between 1 and 500 characters')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { message } = req.body;

  const complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  await complaint.addAdminResponse(message, req.user._id);

  // Populate user info for response
  await complaint.populate('userId', 'username email firstName lastName');
  await complaint.populate('assignedTo', 'username firstName lastName');
  await complaint.populate('adminResponse.respondedBy', 'username firstName lastName');

  logger.info(`Admin response added by ${req.user.email} to complaint: ${complaint.title}`);

  // Emit socket event for real-time updates
  const io = req.app.get('io');
  io.emit('complaint:responded', { complaint });

  res.json({
    message: 'Response added successfully',
    complaint
  });
}));

// @route   POST /api/complaints/:id/resolve
// @desc    Resolve complaint
// @access  Private (admin only)
router.post('/:id/resolve', requireAdmin, [
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Resolution notes cannot exceed 500 characters')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { notes } = req.body;

  const complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  if (complaint.status === 'resolved') {
    throw new AppError('Complaint is already resolved', 400);
  }

  await complaint.resolve(notes, req.user._id);

  // Populate user info for response
  await complaint.populate('userId', 'username email firstName lastName');
  await complaint.populate('assignedTo', 'username firstName lastName');

  logger.info(`Complaint resolved by ${req.user.email}: ${complaint.title}`);

  // Emit socket event for real-time updates
  const io = req.app.get('io');
  io.emit('complaint:resolved', { complaint });

  res.json({
    message: 'Complaint resolved successfully',
    complaint
  });
}));

// @route   POST /api/complaints/:id/escalate
// @desc    Escalate complaint
// @access  Private (admin only)
router.post('/:id/escalate', requireAdmin, asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  if (complaint.status === 'resolved' || complaint.status === 'closed') {
    throw new AppError('Cannot escalate resolved or closed complaints', 400);
  }

  await complaint.escalate();

  // Populate user info for response
  await complaint.populate('userId', 'username email firstName lastName');
  await complaint.populate('assignedTo', 'username firstName lastName');

  logger.info(`Complaint escalated by ${req.user.email}: ${complaint.title}`);

  // Emit socket event for real-time updates
  const io = req.app.get('io');
  io.emit('complaint:escalated', { complaint });

  res.json({
    message: 'Complaint escalated successfully',
    complaint
  });
}));

// @route   GET /api/complaints/stats/overview
// @desc    Get complaint statistics
// @access  Private (admin only)
router.get('/stats/overview', requireAdmin, asyncHandler(async (req, res) => {
  const stats = await Complaint.getStats();

  res.json({
    stats
  });
}));

// @route   GET /api/complaints/user/:userId
// @desc    Get complaints by user ID
// @access  Private (admin or owner)
router.get('/user/:userId', requireOwnershipOrAdmin('userId'), asyncHandler(async (req, res) => {
  const complaints = await Complaint.find({ userId: req.params.userId })
    .populate('userId', 'username email firstName lastName')
    .populate('assignedTo', 'username firstName lastName')
    .sort({ createdAt: -1 });

  res.json({
    complaints
  });
}));

module.exports = router;

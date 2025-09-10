const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Feedback = require('../models/Feedback');
const Complaint = require('../models/Complaint');
const { requireAdmin, requireOwnershipOrAdmin } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// Validation middleware
const validateFeedback = [
  body('complaintId')
    .isMongoId()
    .withMessage('Valid complaint ID is required'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('message')
    .isLength({ min: 1, max: 500 })
    .withMessage('Feedback message must be between 1 and 500 characters'),
  body('category')
    .optional()
    .isIn(['resolution-quality', 'response-time', 'communication', 'overall-satisfaction'])
    .withMessage('Invalid feedback category'),
  body('isAnonymous')
    .optional()
    .isBoolean()
    .withMessage('isAnonymous must be a boolean')
];

// @route   GET /api/feedback
// @desc    Get all feedback (filtered by user role)
// @access  Private
router.get('/', [
  query('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  query('category')
    .optional()
    .isIn(['resolution-quality', 'response-time', 'communication', 'overall-satisfaction'])
    .withMessage('Invalid feedback category'),
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

  const { rating, category, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  // Build filter based on user role
  let filter = {};
  
  if (req.user.role !== 'admin') {
    // Regular users can only see their own feedback
    filter.userId = req.user._id;
  }

  if (rating) filter.rating = parseInt(rating);
  if (category) filter.category = category;

  // Get feedback with pagination
  const feedbacks = await Feedback.find(filter)
    .populate('userId', 'username email firstName lastName')
    .populate('complaintId', 'title category')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await Feedback.countDocuments(filter);

  res.json({
    feedbacks,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// @route   GET /api/feedback/:id
// @desc    Get feedback by ID
// @access  Private
router.get('/:id', asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id)
    .populate('userId', 'username email firstName lastName')
    .populate('complaintId', 'title category status')
    .populate('adminResponse.respondedBy', 'username firstName lastName');

  if (!feedback) {
    throw new AppError('Feedback not found', 404);
  }

  // Check if user has access to this feedback
  if (req.user.role !== 'admin' && feedback.userId._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied', 403);
  }

  res.json({ feedback });
}));

// @route   POST /api/feedback
// @desc    Create a new feedback
// @access  Private
router.post('/', validateFeedback, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { complaintId, rating, message, category = 'overall-satisfaction', isAnonymous = false } = req.body;

  // Verify complaint exists and is resolved
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  if (complaint.status !== 'resolved') {
    throw new AppError('Feedback can only be submitted for resolved complaints', 400);
  }

  // Check if user owns the complaint
  if (complaint.userId.toString() !== req.user._id.toString()) {
    throw new AppError('You can only provide feedback for your own complaints', 403);
  }

  // Check if user has already submitted feedback for this complaint
  const existingFeedback = await Feedback.findOne({
    complaintId,
    userId: req.user._id
  });

  if (existingFeedback) {
    throw new AppError('You have already submitted feedback for this complaint', 400);
  }

  const feedback = new Feedback({
    complaintId,
    userId: req.user._id,
    rating,
    message,
    category,
    isAnonymous
  });

  await feedback.save();

  // Populate user and complaint info for response
  await feedback.populate('userId', 'username email firstName lastName');
  await feedback.populate('complaintId', 'title category');

  logger.info(`New feedback submitted by ${req.user.email} for complaint: ${complaint.title}`);

  // Emit socket event for real-time updates
  const io = req.app.get('io');
  io.emit('feedback:created', { feedback });

  res.status(201).json({
    message: 'Feedback submitted successfully',
    feedback
  });
}));

// @route   PUT /api/feedback/:id
// @desc    Update feedback
// @access  Private (owner only)
router.put('/:id', validateFeedback, requireOwnershipOrAdmin('userId'), asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { rating, message, category, isAnonymous } = req.body;

  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    throw new AppError('Feedback not found', 404);
  }

  // Only allow updates within a short time window (e.g., 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (feedback.createdAt < oneHourAgo) {
    throw new AppError('Feedback can only be updated within 1 hour of submission', 400);
  }

  // Update fields
  if (rating !== undefined) feedback.rating = rating;
  if (message !== undefined) feedback.message = message;
  if (category !== undefined) feedback.category = category;
  if (isAnonymous !== undefined) feedback.isAnonymous = isAnonymous;

  await feedback.save();

  // Populate user and complaint info for response
  await feedback.populate('userId', 'username email firstName lastName');
  await feedback.populate('complaintId', 'title category');

  logger.info(`Feedback updated by ${req.user.email}`);

  res.json({
    message: 'Feedback updated successfully',
    feedback
  });
}));

// @route   DELETE /api/feedback/:id
// @desc    Delete feedback
// @access  Private (owner or admin)
router.delete('/:id', requireOwnershipOrAdmin('userId'), asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    throw new AppError('Feedback not found', 404);
  }

  // Only allow deletion within a short time window (e.g., 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (feedback.createdAt < oneHourAgo && req.user.role !== 'admin') {
    throw new AppError('Feedback can only be deleted within 1 hour of submission', 400);
  }

  await Feedback.findByIdAndDelete(req.params.id);

  logger.info(`Feedback deleted by ${req.user.email}`);

  res.json({
    message: 'Feedback deleted successfully'
  });
}));

// @route   POST /api/feedback/:id/helpful
// @desc    Mark feedback as helpful
// @access  Private
router.post('/:id/helpful', asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    throw new AppError('Feedback not found', 404);
  }

  await feedback.markHelpful();

  logger.info(`Feedback marked as helpful by ${req.user.email}`);

  res.json({
    message: 'Feedback marked as helpful',
    helpfulCount: feedback.helpfulCount
  });
}));

// @route   POST /api/feedback/:id/flag
// @desc    Flag feedback (admin only)
// @access  Private (admin only)
router.post('/:id/flag', requireAdmin, [
  body('reason')
    .isLength({ min: 1, max: 200 })
    .withMessage('Flag reason must be between 1 and 200 characters')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { reason } = req.body;

  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    throw new AppError('Feedback not found', 404);
  }

  await feedback.flag(reason);

  // Populate user and complaint info for response
  await feedback.populate('userId', 'username email firstName lastName');
  await feedback.populate('complaintId', 'title category');

  logger.info(`Feedback flagged by ${req.user.email}: ${reason}`);

  res.json({
    message: 'Feedback flagged successfully',
    feedback
  });
}));

// @route   POST /api/feedback/:id/respond
// @desc    Add admin response to feedback
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

  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    throw new AppError('Feedback not found', 404);
  }

  await feedback.addAdminResponse(message, req.user._id);

  // Populate user and complaint info for response
  await feedback.populate('userId', 'username email firstName lastName');
  await feedback.populate('complaintId', 'title category');
  await feedback.populate('adminResponse.respondedBy', 'username firstName lastName');

  logger.info(`Admin response added to feedback by ${req.user.email}`);

  res.json({
    message: 'Response added successfully',
    feedback
  });
}));

// @route   GET /api/feedback/stats/overview
// @desc    Get feedback statistics
// @access  Private (admin only)
router.get('/stats/overview', requireAdmin, asyncHandler(async (req, res) => {
  const stats = await Feedback.getStats();

  res.json({
    stats
  });
}));

// @route   GET /api/feedback/recent
// @desc    Get recent feedback
// @access  Private (admin only)
router.get('/recent', requireAdmin, [
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

  const { limit = 10 } = req.query;

  const feedbacks = await Feedback.getRecent(parseInt(limit));

  res.json({
    feedbacks
  });
}));

// @route   GET /api/feedback/flagged
// @desc    Get flagged feedback
// @access  Private (admin only)
router.get('/flagged', requireAdmin, asyncHandler(async (req, res) => {
  const feedbacks = await Feedback.getFlagged();

  res.json({
    feedbacks
  });
}));

// @route   GET /api/feedback/complaint/:complaintId
// @desc    Get feedback for a specific complaint
// @access  Private (admin or complaint owner)
router.get('/complaint/:complaintId', asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.complaintId);

  if (!complaint) {
    throw new AppError('Complaint not found', 404);
  }

  // Check if user has access to this complaint
  if (req.user.role !== 'admin' && complaint.userId.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied', 403);
  }

  const feedbacks = await Feedback.find({ complaintId: req.params.complaintId })
    .populate('userId', 'username email firstName lastName')
    .sort({ createdAt: -1 });

  res.json({
    feedbacks
  });
}));

module.exports = router;

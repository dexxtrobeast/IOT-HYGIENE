const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Sensor = require('../models/Sensor');
const { requireAdmin } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// Validation middleware
const validateSensor = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Sensor name must be between 1 and 100 characters'),
  body('type')
    .isIn(['door-tracking', 'odor', 'humidity', 'bin-level', 'temperature', 'air-quality'])
    .withMessage('Invalid sensor type'),
  body('deviceId')
    .isLength({ min: 1 })
    .withMessage('Device ID is required'),
  body('currentValue')
    .isNumeric()
    .withMessage('Current value must be a number'),
  body('thresholdValue')
    .isNumeric()
    .withMessage('Threshold value must be a number'),
  body('unit')
    .isLength({ min: 1 })
    .withMessage('Unit is required')
];

// @route   GET /api/sensors
// @desc    Get all sensors
// @access  Private
router.get('/', [
  query('type')
    .optional()
    .isIn(['door-tracking', 'odor', 'humidity', 'bin-level', 'temperature', 'air-quality'])
    .withMessage('Invalid sensor type'),
  query('status')
    .optional()
    .isIn(['normal', 'warning', 'critical', 'offline'])
    .withMessage('Invalid status'),
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

  const { type, status, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  // Build filter
  let filter = { isActive: true };
  if (type) filter.type = type;
  if (status) filter.status = status;

  // Get sensors with pagination
  const sensors = await Sensor.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await Sensor.countDocuments(filter);

  res.json({
    sensors,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// @route   GET /api/sensors/:id
// @desc    Get sensor by ID
// @access  Private
router.get('/:id', asyncHandler(async (req, res) => {
  const sensor = await Sensor.findById(req.params.id);

  if (!sensor) {
    throw new AppError('Sensor not found', 404);
  }

  res.json({ sensor });
}));

// @route   POST /api/sensors
// @desc    Create a new sensor
// @access  Private (admin only)
router.post('/', requireAdmin, validateSensor, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const {
    name,
    type,
    deviceId,
    currentValue,
    thresholdValue,
    unit,
    location,
    manufacturer,
    model,
    firmwareVersion
  } = req.body;

  // Check if device ID already exists
  const existingSensor = await Sensor.findOne({ deviceId });
  if (existingSensor) {
    throw new AppError('Sensor with this device ID already exists', 400);
  }

  const sensor = new Sensor({
    name,
    type,
    deviceId,
    currentValue,
    thresholdValue,
    unit,
    location,
    manufacturer,
    model,
    firmwareVersion
  });

  await sensor.save();

  logger.info(`New sensor created by ${req.user.email}: ${sensor.name}`);

  // Emit socket event for real-time updates
  const io = req.app.get('io');
  io.emit('sensor:created', { sensor });

  res.status(201).json({
    message: 'Sensor created successfully',
    sensor
  });
}));

// @route   PUT /api/sensors/:id
// @desc    Update sensor
// @access  Private (admin only)
router.put('/:id', requireAdmin, validateSensor, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const {
    name,
    type,
    deviceId,
    currentValue,
    thresholdValue,
    unit,
    location,
    manufacturer,
    model,
    firmwareVersion
  } = req.body;

  const sensor = await Sensor.findById(req.params.id);

  if (!sensor) {
    throw new AppError('Sensor not found', 404);
  }

  // Check if device ID is being changed and if it already exists
  if (deviceId !== sensor.deviceId) {
    const existingSensor = await Sensor.findOne({ deviceId });
    if (existingSensor) {
      throw new AppError('Sensor with this device ID already exists', 400);
    }
  }

  // Update fields
  if (name !== undefined) sensor.name = name;
  if (type !== undefined) sensor.type = type;
  if (deviceId !== undefined) sensor.deviceId = deviceId;
  if (currentValue !== undefined) sensor.currentValue = currentValue;
  if (thresholdValue !== undefined) sensor.thresholdValue = thresholdValue;
  if (unit !== undefined) sensor.unit = unit;
  if (location !== undefined) sensor.location = location;
  if (manufacturer !== undefined) sensor.manufacturer = manufacturer;
  if (model !== undefined) sensor.model = model;
  if (firmwareVersion !== undefined) sensor.firmwareVersion = firmwareVersion;

  await sensor.save();

  logger.info(`Sensor updated by ${req.user.email}: ${sensor.name}`);

  // Emit socket event for real-time updates
  const io = req.app.get('io');
  io.emit('sensor:updated', { sensor });

  res.json({
    message: 'Sensor updated successfully',
    sensor
  });
}));

// @route   DELETE /api/sensors/:id
// @desc    Delete sensor
// @access  Private (admin only)
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const sensor = await Sensor.findById(req.params.id);

  if (!sensor) {
    throw new AppError('Sensor not found', 404);
  }

  // Soft delete by setting isActive to false
  sensor.isActive = false;
  await sensor.save();

  logger.info(`Sensor deleted by ${req.user.email}: ${sensor.name}`);

  // Emit socket event for real-time updates
  const io = req.app.get('io');
  io.emit('sensor:deleted', { sensorId: req.params.id });

  res.json({
    message: 'Sensor deleted successfully'
  });
}));

// @route   POST /api/sensors/:id/data
// @desc    Add data point to sensor (for IoT devices)
// @access  Public (for IoT devices)
router.post('/:id/data', [
  body('value')
    .isNumeric()
    .withMessage('Value must be a number'),
  body('batteryLevel')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Battery level must be between 0 and 100'),
  body('signalStrength')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Signal strength must be between 0 and 100')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { value, batteryLevel, signalStrength } = req.body;

  const sensor = await Sensor.findById(req.params.id);

  if (!sensor) {
    throw new AppError('Sensor not found', 404);
  }

  if (!sensor.isActive) {
    throw new AppError('Sensor is inactive', 400);
  }

  // Add data point
  await sensor.addDataPoint(value);

  // Update battery and signal strength if provided
  if (batteryLevel !== undefined) sensor.batteryLevel = batteryLevel;
  if (signalStrength !== undefined) sensor.signalStrength = signalStrength;

  await sensor.save();

  logger.info(`Data point added to sensor ${sensor.name}: ${value} ${sensor.unit}`);

  // Emit socket event for real-time updates
  const io = req.app.get('io');
  io.emit('sensor:data', { sensor });

  res.json({
    message: 'Data point added successfully',
    sensor: {
      id: sensor._id,
      name: sensor.name,
      currentValue: sensor.currentValue,
      status: sensor.status
    }
  });
}));

// @route   POST /api/sensors/:id/alert
// @desc    Add alert to sensor
// @access  Private (admin only)
router.post('/:id/alert', requireAdmin, [
  body('type')
    .isIn(['threshold-exceeded', 'device-offline', 'battery-low', 'calibration-due'])
    .withMessage('Invalid alert type'),
  body('message')
    .isLength({ min: 1, max: 200 })
    .withMessage('Alert message must be between 1 and 200 characters'),
  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity level')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { type, message, severity = 'medium' } = req.body;

  const sensor = await Sensor.findById(req.params.id);

  if (!sensor) {
    throw new AppError('Sensor not found', 404);
  }

  await sensor.addAlert(type, message, severity);

  logger.info(`Alert added to sensor ${sensor.name} by ${req.user.email}`);

  // Emit socket event for real-time updates
  const io = req.app.get('io');
  io.emit('sensor:alert', { sensor });

  res.json({
    message: 'Alert added successfully',
    sensor
  });
}));

// @route   POST /api/sensors/:id/alert/:alertId/acknowledge
// @desc    Acknowledge sensor alert
// @access  Private (admin only)
router.post('/:id/alert/:alertId/acknowledge', requireAdmin, asyncHandler(async (req, res) => {
  const sensor = await Sensor.findById(req.params.id);

  if (!sensor) {
    throw new AppError('Sensor not found', 404);
  }

  await sensor.acknowledgeAlert(req.params.alertId, req.user._id);

  logger.info(`Alert acknowledged by ${req.user.email} for sensor ${sensor.name}`);

  // Emit socket event for real-time updates
  const io = req.app.get('io');
  io.emit('sensor:alert-acknowledged', { sensor });

  res.json({
    message: 'Alert acknowledged successfully',
    sensor
  });
}));

// @route   POST /api/sensors/:id/maintenance
// @desc    Add maintenance record to sensor
// @access  Private (admin only)
router.post('/:id/maintenance', requireAdmin, [
  body('type')
    .isLength({ min: 1 })
    .withMessage('Maintenance type is required'),
  body('description')
    .isLength({ min: 1, max: 500 })
    .withMessage('Maintenance description must be between 1 and 500 characters')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { type, description } = req.body;

  const sensor = await Sensor.findById(req.params.id);

  if (!sensor) {
    throw new AppError('Sensor not found', 404);
  }

  await sensor.addMaintenanceRecord(type, description, req.user.username);

  logger.info(`Maintenance record added to sensor ${sensor.name} by ${req.user.email}`);

  res.json({
    message: 'Maintenance record added successfully',
    sensor
  });
}));

// @route   GET /api/sensors/stats/overview
// @desc    Get sensor statistics
// @access  Private (admin only)
router.get('/stats/overview', requireAdmin, asyncHandler(async (req, res) => {
  const stats = await Sensor.getStats();

  res.json({
    stats
  });
}));

// @route   GET /api/sensors/critical
// @desc    Get critical sensors
// @access  Private (admin only)
router.get('/critical', requireAdmin, asyncHandler(async (req, res) => {
  const sensors = await Sensor.getCritical();

  res.json({
    sensors
  });
}));

// @route   GET /api/sensors/maintenance-required
// @desc    Get sensors requiring maintenance
// @access  Private (admin only)
router.get('/maintenance-required', requireAdmin, asyncHandler(async (req, res) => {
  const sensors = await Sensor.getRequiringMaintenance();

  res.json({
    sensors
  });
}));

// @route   GET /api/sensors/:id/data
// @desc    Get sensor data points
// @access  Private
router.get('/:id/data', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { limit = 100 } = req.query;

  const sensor = await Sensor.findById(req.params.id);

  if (!sensor) {
    throw new AppError('Sensor not found', 404);
  }

  // Get recent data points
  const dataPoints = sensor.dataPoints
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, parseInt(limit));

  res.json({
    sensorId: sensor._id,
    sensorName: sensor.name,
    dataPoints
  });
}));

module.exports = router;

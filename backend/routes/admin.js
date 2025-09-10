const express = require('express');
const { query, validationResult } = require('express-validator');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Sensor = require('../models/Sensor');
const Feedback = require('../models/Feedback');
const { requireAdmin } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard data
// @access  Private (admin only)
router.get('/dashboard', requireAdmin, asyncHandler(async (req, res) => {
  // Get overall statistics
  const totalUsers = await User.countDocuments();
  const totalComplaints = await Complaint.countDocuments();
  const totalSensors = await Sensor.countDocuments({ isActive: true });
  const totalFeedback = await Feedback.countDocuments();

  // Get recent activity
  const recentComplaints = await Complaint.find()
    .populate('userId', 'username email')
    .sort({ createdAt: -1 })
    .limit(5);

  const recentUsers = await User.find()
    .select('username email createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

  const criticalSensors = await Sensor.find({ status: 'critical', isActive: true })
    .limit(5);

  const pendingComplaints = await Complaint.find({ 
    status: { $in: ['pending', 'in-progress'] } 
  })
    .populate('userId', 'username email')
    .sort({ createdAt: -1 })
    .limit(5);

  // Get complaints by status
  const complaintsByStatus = await Complaint.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get complaints by category
  const complaintsByCategory = await Complaint.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get sensors by status
  const sensorsByStatus = await Sensor.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get feedback statistics
  const feedbackStats = await Feedback.aggregate([
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        totalFeedback: { $sum: 1 }
      }
    }
  ]);

  // Get recent system alerts
  const recentAlerts = await Sensor.aggregate([
    {
      $unwind: '$alerts'
    },
    {
      $match: {
        'alerts.timestamp': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }
    },
    {
      $sort: { 'alerts.timestamp': -1 }
    },
    {
      $limit: 10
    },
    {
      $project: {
        sensorName: '$name',
        alertType: '$alerts.type',
        alertMessage: '$alerts.message',
        alertSeverity: '$alerts.severity',
        alertTimestamp: '$alerts.timestamp'
      }
    }
  ]);

  res.json({
    overview: {
      totalUsers,
      totalComplaints,
      totalSensors,
      totalFeedback,
      avgRating: feedbackStats[0]?.avgRating || 0
    },
    recentActivity: {
      complaints: recentComplaints,
      users: recentUsers,
      criticalSensors,
      pendingComplaints
    },
    statistics: {
      complaintsByStatus,
      complaintsByCategory,
      sensorsByStatus
    },
    alerts: recentAlerts
  });
}));

// @route   GET /api/admin/analytics
// @desc    Get detailed analytics data
// @access  Private (admin only)
router.get('/analytics', requireAdmin, [
  query('period')
    .optional()
    .isIn(['7d', '30d', '90d', '1y'])
    .withMessage('Invalid period'),
  query('type')
    .optional()
    .isIn(['complaints', 'users', 'sensors', 'feedback'])
    .withMessage('Invalid analytics type')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { period = '30d', type = 'complaints' } = req.query;

  // Calculate date range
  const now = new Date();
  let startDate;
  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
  }

  let analytics;

  switch (type) {
    case 'complaints':
      analytics = await getComplaintAnalytics(startDate, now);
      break;
    case 'users':
      analytics = await getUserAnalytics(startDate, now);
      break;
    case 'sensors':
      analytics = await getSensorAnalytics(startDate, now);
      break;
    case 'feedback':
      analytics = await getFeedbackAnalytics(startDate, now);
      break;
  }

  res.json({
    period,
    type,
    analytics
  });
}));

// Helper function for complaint analytics
async function getComplaintAnalytics(startDate, endDate) {
  const dailyComplaints = await Complaint.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);

  const complaintsByCategory = await Complaint.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    }
  ]);

  const complaintsByPriority = await Complaint.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);

  const resolutionTime = await Complaint.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'resolved',
        actualResolutionTime: { $exists: true }
      }
    },
    {
      $group: {
        _id: null,
        avgResolutionHours: {
          $avg: {
            $divide: [
              { $subtract: ['$actualResolutionTime', '$createdAt'] },
              1000 * 60 * 60 // Convert to hours
            ]
          }
        }
      }
    }
  ]);

  return {
    dailyComplaints,
    complaintsByCategory,
    complaintsByPriority,
    avgResolutionHours: resolutionTime[0]?.avgResolutionHours || 0
  };
}

// Helper function for user analytics
async function getUserAnalytics(startDate, endDate) {
  const dailyRegistrations = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);

  const usersByRole = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]);

  const activeUsers = await User.countDocuments({
    lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  });

  return {
    dailyRegistrations,
    usersByRole,
    activeUsers
  };
}

// Helper function for sensor analytics
async function getSensorAnalytics(startDate, endDate) {
  const sensorsByType = await Sensor.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    }
  ]);

  const sensorsByStatus = await Sensor.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const avgHealthScore = await Sensor.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: null,
        avgHealthScore: { $avg: '$healthScore' }
      }
    }
  ]);

  return {
    sensorsByType,
    sensorsByStatus,
    avgHealthScore: avgHealthScore[0]?.avgHealthScore || 0
  };
}

// Helper function for feedback analytics
async function getFeedbackAnalytics(startDate, endDate) {
  const dailyFeedback = await Feedback.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);

  const feedbackByRating = await Feedback.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    }
  ]);

  const avgRating = await Feedback.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  return {
    dailyFeedback,
    feedbackByRating,
    avgRating: avgRating[0]?.avgRating || 0
  };
}

// @route   GET /api/admin/system-health
// @desc    Get system health status
// @access  Private (admin only)
router.get('/system-health', requireAdmin, asyncHandler(async (req, res) => {
  // Get critical sensors
  const criticalSensors = await Sensor.countDocuments({ 
    status: 'critical', 
    isActive: true 
  });

  // Get offline sensors
  const offlineSensors = await Sensor.countDocuments({ 
    status: 'offline', 
    isActive: true 
  });

  // Get sensors requiring maintenance
  const maintenanceRequired = await Sensor.countDocuments({
    $or: [
      { batteryLevel: { $lt: 20 } },
      { nextCalibrationDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } }
    ],
    isActive: true
  });

  // Get urgent complaints
  const urgentComplaints = await Complaint.countDocuments({
    $or: [
      { isUrgent: true },
      { priority: 'high', status: { $in: ['pending', 'in-progress'] } }
    ]
  });

  // Get unacknowledged alerts
  const unacknowledgedAlerts = await Sensor.aggregate([
    {
      $unwind: '$alerts'
    },
    {
      $match: {
        'alerts.isAcknowledged': false
      }
    },
    {
      $count: 'total'
    }
  ]);

  // Calculate overall system health score
  const totalSensors = await Sensor.countDocuments({ isActive: true });
  const healthySensors = await Sensor.countDocuments({ 
    status: 'normal', 
    isActive: true 
  });

  const systemHealthScore = totalSensors > 0 ? (healthySensors / totalSensors) * 100 : 100;

  res.json({
    systemHealth: {
      score: Math.round(systemHealthScore),
      status: systemHealthScore >= 90 ? 'excellent' : 
              systemHealthScore >= 75 ? 'good' : 
              systemHealthScore >= 50 ? 'fair' : 'poor'
    },
    alerts: {
      criticalSensors,
      offlineSensors,
      maintenanceRequired,
      urgentComplaints,
      unacknowledgedAlerts: unacknowledgedAlerts[0]?.total || 0
    }
  });
}));

// @route   GET /api/admin/reports
// @desc    Generate system reports
// @access  Private (admin only)
router.get('/reports', requireAdmin, [
  query('type')
    .isIn(['complaints', 'sensors', 'users', 'feedback'])
    .withMessage('Invalid report type'),
  query('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('Invalid format')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { type, format = 'json' } = req.query;

  let reportData;

  switch (type) {
    case 'complaints':
      reportData = await generateComplaintsReport();
      break;
    case 'sensors':
      reportData = await generateSensorsReport();
      break;
    case 'users':
      reportData = await generateUsersReport();
      break;
    case 'feedback':
      reportData = await generateFeedbackReport();
      break;
  }

  if (format === 'csv') {
    // Convert to CSV format (simplified)
    const csvData = convertToCSV(reportData);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report.csv`);
    return res.send(csvData);
  }

  res.json({
    type,
    generatedAt: new Date().toISOString(),
    data: reportData
  });
}));

// Helper functions for report generation
async function generateComplaintsReport() {
  const complaints = await Complaint.find()
    .populate('userId', 'username email')
    .populate('assignedTo', 'username email')
    .sort({ createdAt: -1 });

  return complaints.map(complaint => ({
    id: complaint._id,
    title: complaint.title,
    category: complaint.category,
    status: complaint.status,
    priority: complaint.priority,
    submittedBy: complaint.userId?.username || 'Unknown',
    assignedTo: complaint.assignedTo?.username || 'Unassigned',
    createdAt: complaint.createdAt,
    resolvedAt: complaint.actualResolutionTime,
    resolutionTime: complaint.resolutionTimeHours
  }));
}

async function generateSensorsReport() {
  const sensors = await Sensor.find({ isActive: true });

  return sensors.map(sensor => ({
    id: sensor._id,
    name: sensor.name,
    type: sensor.type,
    status: sensor.status,
    currentValue: sensor.currentValue,
    thresholdValue: sensor.thresholdValue,
    healthScore: sensor.healthScore,
    batteryLevel: sensor.batteryLevel,
    lastReading: sensor.lastReading?.timestamp,
    location: sensor.location
  }));
}

async function generateUsersReport() {
  const users = await User.find().select('-password');

  return users.map(user => ({
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin
  }));
}

async function generateFeedbackReport() {
  const feedbacks = await Feedback.find()
    .populate('userId', 'username email')
    .populate('complaintId', 'title category');

  return feedbacks.map(feedback => ({
    id: feedback._id,
    rating: feedback.rating,
    message: feedback.message,
    category: feedback.category,
    submittedBy: feedback.userId?.username || 'Anonymous',
    complaintTitle: feedback.complaintId?.title || 'Unknown',
    createdAt: feedback.createdAt
  }));
}

function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

module.exports = router;

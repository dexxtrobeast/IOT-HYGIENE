const mongoose = require('mongoose');

const sensorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Sensor name is required'],
    trim: true,
    maxlength: [100, 'Sensor name cannot exceed 100 characters']
  },
  type: {
    type: String,
    enum: ['door-tracking', 'odor', 'humidity', 'bin-level', 'temperature', 'air-quality'],
    required: [true, 'Sensor type is required']
  },
  deviceId: {
    type: String,
    required: [true, 'Device ID is required'],
    unique: true
  },
  location: {
    building: String,
    floor: String,
    room: String,
    area: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  currentValue: {
    type: Number,
    required: [true, 'Current value is required']
  },
  thresholdValue: {
    type: Number,
    required: [true, 'Threshold value is required']
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['normal', 'warning', 'critical', 'offline'],
    default: 'normal'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastReading: {
    value: Number,
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  calibrationDate: Date,
  nextCalibrationDate: Date,
  manufacturer: String,
  model: String,
  firmwareVersion: String,
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100
  },
  signalStrength: {
    type: Number,
    min: 0,
    max: 100
  },
  maintenanceHistory: [{
    date: Date,
    type: String,
    description: String,
    performedBy: String
  }],
  alerts: [{
    type: {
      type: String,
      enum: ['threshold-exceeded', 'device-offline', 'battery-low', 'calibration-due']
    },
    message: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    isAcknowledged: {
      type: Boolean,
      default: false
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    acknowledgedAt: Date
  }],
  dataPoints: [{
    value: Number,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
sensorSchema.index({ deviceId: 1 });
sensorSchema.index({ type: 1 });
sensorSchema.index({ status: 1 });
sensorSchema.index({ location: 1 });
sensorSchema.index({ 'lastReading.timestamp': -1 });

// Virtual for sensor health score
sensorSchema.virtual('healthScore').get(function() {
  let score = 100;
  
  // Deduct points for various issues
  if (this.status === 'critical') score -= 40;
  else if (this.status === 'warning') score -= 20;
  else if (this.status === 'offline') score -= 60;
  
  if (this.batteryLevel < 20) score -= 30;
  else if (this.batteryLevel < 50) score -= 15;
  
  if (this.signalStrength < 30) score -= 20;
  else if (this.signalStrength < 60) score -= 10;
  
  return Math.max(0, score);
});

// Virtual for time since last reading
sensorSchema.virtual('timeSinceLastReading').get(function() {
  if (!this.lastReading || !this.lastReading.timestamp) return null;
  return Date.now() - this.lastReading.timestamp;
});

// Pre-save middleware to update status based on values
sensorSchema.pre('save', function(next) {
  if (this.isModified('currentValue') || this.isModified('thresholdValue')) {
    const ratio = this.currentValue / this.thresholdValue;
    
    if (ratio >= 1.5) {
      this.status = 'critical';
    } else if (ratio >= 1.0) {
      this.status = 'warning';
    } else {
      this.status = 'normal';
    }
  }
  
  // Update last reading
  if (this.isModified('currentValue')) {
    this.lastReading = {
      value: this.currentValue,
      timestamp: new Date()
    };
  }
  
  next();
});

// Instance method to add data point
sensorSchema.methods.addDataPoint = function(value) {
  this.currentValue = value;
  this.dataPoints.push({
    value,
    timestamp: new Date()
  });
  
  // Keep only last 1000 data points
  if (this.dataPoints.length > 1000) {
    this.dataPoints = this.dataPoints.slice(-1000);
  }
  
  return this.save();
};

// Instance method to add alert
sensorSchema.methods.addAlert = function(type, message, severity = 'medium') {
  this.alerts.push({
    type,
    message,
    severity,
    timestamp: new Date()
  });
  return this.save();
};

// Instance method to acknowledge alert
sensorSchema.methods.acknowledgeAlert = function(alertId, userId) {
  const alert = this.alerts.id(alertId);
  if (alert) {
    alert.isAcknowledged = true;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();
  }
  return this.save();
};

// Instance method to add maintenance record
sensorSchema.methods.addMaintenanceRecord = function(type, description, performedBy) {
  this.maintenanceHistory.push({
    date: new Date(),
    type,
    description,
    performedBy
  });
  return this.save();
};

// Static method to get sensors by status
sensorSchema.statics.getByStatus = function(status) {
  return this.find({ status, isActive: true });
};

// Static method to get critical sensors
sensorSchema.statics.getCritical = function() {
  return this.find({ 
    status: 'critical',
    isActive: true 
  });
};

// Static method to get sensors requiring maintenance
sensorSchema.statics.getRequiringMaintenance = function() {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  return this.find({
    $or: [
      { nextCalibrationDate: { $lte: thirtyDaysFromNow } },
      { batteryLevel: { $lt: 20 } },
      { status: 'offline' }
    ],
    isActive: true
  });
};

// Static method to get sensor statistics
sensorSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const typeStats = await this.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const avgHealthScore = await this.aggregate([
    {
      $group: {
        _id: null,
        avgHealthScore: { $avg: '$healthScore' }
      }
    }
  ]);
  
  return {
    byStatus: stats,
    byType: typeStats,
    avgHealthScore: avgHealthScore[0]?.avgHealthScore || 0
  };
};

module.exports = mongoose.model('Sensor', sensorSchema);

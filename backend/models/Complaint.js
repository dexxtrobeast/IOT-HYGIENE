const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    enum: ['maintenance', 'cleanliness', 'security', 'other'],
    required: [true, 'Category is required']
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved', 'closed'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  location: {
    building: String,
    floor: String,
    room: String,
    area: String
  },
  images: [{
    url: String,
    filename: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  adminResponse: {
    message: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date
  },
  resolutionNotes: {
    type: String,
    maxlength: [500, 'Resolution notes cannot exceed 500 characters']
  },
  estimatedResolutionTime: Date,
  actualResolutionTime: Date,
  tags: [String],
  isUrgent: {
    type: Boolean,
    default: false
  },
  escalationLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    submittedAt: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
complaintSchema.index({ userId: 1, createdAt: -1 });
complaintSchema.index({ status: 1, priority: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ assignedTo: 1 });
complaintSchema.index({ createdAt: -1 });

// Virtual for complaint age in days
complaintSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for resolution time in hours
complaintSchema.virtual('resolutionTimeHours').get(function() {
  if (this.actualResolutionTime && this.createdAt) {
    return Math.floor((this.actualResolutionTime - this.createdAt) / (1000 * 60 * 60));
  }
  return null;
});

// Pre-save middleware to update escalation level based on age and priority
complaintSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'resolved') {
    this.actualResolutionTime = new Date();
  }
  
  // Auto-escalate based on age and priority
  const ageInDays = this.ageInDays || 0;
  if (ageInDays >= 7 && this.priority === 'high' && this.status === 'pending') {
    this.escalationLevel = Math.min(3, Math.floor(ageInDays / 7));
  }
  
  next();
});

// Instance method to escalate complaint
complaintSchema.methods.escalate = function() {
  this.escalationLevel = Math.min(3, this.escalationLevel + 1);
  if (this.escalationLevel >= 2) {
    this.isUrgent = true;
  }
  return this.save();
};

// Instance method to add admin response
complaintSchema.methods.addAdminResponse = function(message, adminId) {
  this.adminResponse = {
    message,
    respondedBy: adminId,
    respondedAt: new Date()
  };
  return this.save();
};

// Instance method to resolve complaint
complaintSchema.methods.resolve = function(notes, adminId) {
  this.status = 'resolved';
  this.resolutionNotes = notes;
  this.actualResolutionTime = new Date();
  if (adminId) {
    this.assignedTo = adminId;
  }
  return this.save();
};

// Static method to get complaints by status
complaintSchema.statics.getByStatus = function(status) {
  return this.find({ status }).populate('userId', 'username email').populate('assignedTo', 'username');
};

// Static method to get urgent complaints
complaintSchema.statics.getUrgent = function() {
  return this.find({ 
    $or: [
      { isUrgent: true },
      { priority: 'high', status: { $in: ['pending', 'in-progress'] } }
    ]
  }).populate('userId', 'username email');
};

// Static method to get complaints statistics
complaintSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const priorityStats = await this.aggregate([
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const categoryStats = await this.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    }
  ]);
  
  return {
    byStatus: stats,
    byPriority: priorityStats,
    byCategory: categoryStats
  };
};

module.exports = mongoose.model('Complaint', complaintSchema);

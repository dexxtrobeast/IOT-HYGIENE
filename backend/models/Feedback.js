const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    required: [true, 'Complaint ID is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  message: {
    type: String,
    required: [true, 'Feedback message is required'],
    trim: true,
    maxlength: [500, 'Feedback message cannot exceed 500 characters']
  },
  category: {
    type: String,
    enum: ['resolution-quality', 'response-time', 'communication', 'overall-satisfaction'],
    default: 'overall-satisfaction'
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  isFlagged: {
    type: Boolean,
    default: false
  },
  flaggedReason: String,
  adminResponse: {
    message: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date
  },
  tags: [String]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
feedbackSchema.index({ complaintId: 1 });
feedbackSchema.index({ userId: 1 });
feedbackSchema.index({ rating: 1 });
feedbackSchema.index({ createdAt: -1 });

// Virtual for rating description
feedbackSchema.virtual('ratingDescription').get(function() {
  const descriptions = {
    1: 'Very Dissatisfied',
    2: 'Dissatisfied',
    3: 'Neutral',
    4: 'Satisfied',
    5: 'Very Satisfied'
  };
  return descriptions[this.rating] || 'Unknown';
});

// Virtual for sentiment analysis
feedbackSchema.virtual('sentiment').get(function() {
  if (this.rating >= 4) return 'positive';
  if (this.rating <= 2) return 'negative';
  return 'neutral';
});

// Pre-save middleware to validate complaint exists and is resolved
feedbackSchema.pre('save', async function(next) {
  if (this.isNew) {
    const Complaint = mongoose.model('Complaint');
    const complaint = await Complaint.findById(this.complaintId);
    
    if (!complaint) {
      throw new Error('Complaint not found');
    }
    
    if (complaint.status !== 'resolved') {
      throw new Error('Feedback can only be submitted for resolved complaints');
    }
    
    // Check if user has already submitted feedback for this complaint
    const existingFeedback = await this.constructor.findOne({
      complaintId: this.complaintId,
      userId: this.userId
    });
    
    if (existingFeedback) {
      throw new Error('You have already submitted feedback for this complaint');
    }
  }
  
  next();
});

// Instance method to mark as helpful
feedbackSchema.methods.markHelpful = function() {
  this.helpfulCount += 1;
  return this.save();
};

// Instance method to flag feedback
feedbackSchema.methods.flag = function(reason) {
  this.isFlagged = true;
  this.flaggedReason = reason;
  return this.save();
};

// Instance method to add admin response
feedbackSchema.methods.addAdminResponse = function(message, adminId) {
  this.adminResponse = {
    message,
    respondedBy: adminId,
    respondedAt: new Date()
  };
  return this.save();
};

// Static method to get feedback by rating
feedbackSchema.statics.getByRating = function(rating) {
  return this.find({ rating }).populate('userId', 'username').populate('complaintId', 'title');
};

// Static method to get feedback statistics
feedbackSchema.statics.getStats = async function() {
  const ratingStats = await this.aggregate([
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const avgRating = await this.aggregate([
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        totalFeedback: { $sum: 1 }
      }
    }
  ]);
  
  const sentimentStats = await this.aggregate([
    {
      $addFields: {
        sentiment: {
          $cond: {
            if: { $gte: ['$rating', 4] },
            then: 'positive',
            else: {
              $cond: {
                if: { $lte: ['$rating', 2] },
                then: 'negative',
                else: 'neutral'
              }
            }
          }
        }
      }
    },
    {
      $group: {
        _id: '$sentiment',
        count: { $sum: 1 }
      }
    }
  ]);
  
  return {
    ratingDistribution: ratingStats,
    averageRating: avgRating[0]?.avgRating || 0,
    totalFeedback: avgRating[0]?.totalFeedback || 0,
    sentimentDistribution: sentimentStats
  };
};

// Static method to get recent feedback
feedbackSchema.statics.getRecent = function(limit = 10) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username')
    .populate('complaintId', 'title category');
};

// Static method to get flagged feedback
feedbackSchema.statics.getFlagged = function() {
  return this.find({ isFlagged: true })
    .populate('userId', 'username')
    .populate('complaintId', 'title');
};

module.exports = mongoose.model('Feedback', feedbackSchema);

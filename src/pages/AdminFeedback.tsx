import React, { useState } from 'react';
import { MessageSquare, Star, Search, Filter, User, Calendar } from 'lucide-react';
import { useData } from '../context/DataContext';

const AdminFeedback: React.FC = () => {
  const { complaints, feedbacks } = useData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Get complaints with their feedback
  const complaintsWithFeedback = complaints.map(complaint => {
    const complaintFeedbacks = feedbacks.filter(feedback => feedback.complaintId === complaint.id);
    return {
      ...complaint,
      feedbacks: complaintFeedbacks
    };
  }).filter(complaint => complaint.feedbacks.length > 0);

  const filteredFeedbacks = feedbacks
    .filter(feedback => {
      const complaint = complaints.find(c => c.id === feedback.complaintId);
      const matchesSearch = complaint?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           feedback.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           feedback.id.includes(searchTerm);
      const matchesRating = ratingFilter === 'all' || feedback.rating.toString() === ratingFilter;
      
      return matchesSearch && matchesRating;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'rating-high':
          return b.rating - a.rating;
        case 'rating-low':
          return a.rating - b.rating;
        default: // newest
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Not Rated';
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={`${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="h-10 w-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Feedback</h1>
            <p className="text-gray-600 dark:text-gray-300">Review feedback from resolved complaints</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Feedback</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{feedbacks.length}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">High Rating (4-5)</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {feedbacks.filter(f => f.rating >= 4).length}
                </p>
              </div>
              <Star className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Medium Rating (3)</p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                  {feedbacks.filter(f => f.rating === 3).length}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Low Rating (1-2)</p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                  {feedbacks.filter(f => f.rating <= 2).length}
                </p>
              </div>
              <Star className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search feedback..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          <select
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="rating-high">Highest Rating</option>
            <option value="rating-low">Lowest Rating</option>
          </select>
        </div>
      </div>

      {/* Feedback List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        {filteredFeedbacks.length === 0 ? (
          <div className="text-center py-12 px-6">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Feedback Found</h3>
            <p className="text-gray-600 dark:text-gray-300">No feedback matches your current filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredFeedbacks.map((feedback) => {
              const complaint = complaints.find(c => c.id === feedback.complaintId);
              return (
                <div key={feedback.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Feedback for: {complaint?.title || 'Unknown Complaint'}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {renderStars(feedback.rating)}
                          <span className={`text-sm font-medium ${getRatingColor(feedback.rating)}`}>
                            {getRatingText(feedback.rating)}
                          </span>
                        </div>
                      </div>
                      
                      {complaint && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3">
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-medium">Original Complaint:</span> {complaint.description}
                          </p>
                        </div>
                      )}
                      
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <h4 className="font-medium text-green-900 dark:text-green-200 mb-2">User Feedback:</h4>
                        <p className="text-green-800 dark:text-green-300">{feedback.message}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">User ID: {feedback.userId}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">Submitted: {formatDate(feedback.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-300">Feedback ID: #{feedback.id}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFeedback;

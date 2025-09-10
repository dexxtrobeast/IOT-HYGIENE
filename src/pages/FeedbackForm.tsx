import React, { useState } from 'react';
import { Star, Send, MessageSquare, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const FeedbackForm: React.FC = () => {
  const { user } = useAuth();
  const { complaints, addFeedback } = useData();
  
  const [selectedComplaint, setSelectedComplaint] = useState('');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const resolvedComplaints = complaints.filter(c => 
    c.userId === user?.id && c.status === 'resolved'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    
    try {
      addFeedback({
        complaintId: selectedComplaint,
        rating,
        message,
        userId: user.id
      });
      
      // Reset form
      setSelectedComplaint('');
      setRating(0);
      setMessage('');
      
      // Show success message
      setShowSuccess(true);
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating: React.FC<{ rating: number; onRatingChange: (rating: number) => void }> = ({ 
    rating, 
    onRatingChange 
  }) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className={`p-1 rounded transition-colors ${
              star <= rating 
                ? 'text-yellow-400 hover:text-yellow-500' 
                : 'text-gray-300 hover:text-yellow-400'
            }`}
          >
            <Star size={24} fill={star <= rating ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 md:p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="h-10 w-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Provide Feedback</h1>
            <p className="text-gray-600 dark:text-gray-300">Share your experience with resolved complaints</p>
          </div>
        </div>

        {showSuccess && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Feedback Submitted Successfully!</h3>
              <p className="text-sm text-green-700 dark:text-green-300">Thank you for your valuable feedback. It helps us improve our services.</p>
            </div>
          </div>
        )}

        {resolvedComplaints.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Resolved Complaints</h3>
            <p className="text-gray-600 dark:text-gray-300">You don't have any resolved complaints to provide feedback on yet.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="complaint" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Complaint *
              </label>
              <select
                id="complaint"
                value={selectedComplaint}
                onChange={(e) => setSelectedComplaint(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Choose a resolved complaint...</option>
                {resolvedComplaints.map((complaint) => (
                  <option key={complaint.id} value={complaint.id}>
                    {complaint.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rating *
              </label>
              <div className="flex items-center space-x-4">
                <StarRating rating={rating} onRatingChange={setRating} />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {rating === 0 && 'Please select a rating'}
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Detailed Feedback
              </label>
              <textarea
                id="message"
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Please share your experience with the resolution process, quality of service, timeliness, and any suggestions for improvement..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Your feedback helps us improve</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• Rate the overall resolution experience</li>
                <li>• Share what went well and what could be better</li>
                <li>• Help us understand your satisfaction level</li>
                <li>• Contribute to better service for everyone</li>
              </ul>
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedComplaint('');
                  setRating(0);
                  setMessage('');
                }}
                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 font-medium"
              >
                Reset Form
              </button>
              <button
                type="submit"
                disabled={isSubmitting || rating === 0 || !selectedComplaint}
                className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Submit Feedback</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackForm;
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Clock, 
  MessageSquare, 
  FileText, 
  AlertCircle, 
  Activity,
  Users,
  TrendingUp,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { complaints, sensors } = useData();

  const userComplaints = complaints.filter(c => c.userId === user?.id);
  const pendingComplaints = userComplaints.filter(c => c.status === 'pending');
  const resolvedComplaints = userComplaints.filter(c => c.status === 'resolved');
  const allPendingComplaints = complaints.filter(c => c.status === 'pending' || c.status === 'in-progress');
  const criticalSensors = sensors.filter(s => s.status === 'critical');

  const userQuickActions = [
    {
      title: 'New Complaint',
      description: 'Submit a new complaint or issue',
      icon: Plus,
      link: '/complaint/new',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      title: 'Check Status',
      description: 'View your complaint status',
      icon: Clock,
      link: '/complaint/status',
      color: 'bg-yellow-500',
      hoverColor: 'hover:bg-yellow-600'
    },
    {
      title: 'Give Feedback',
      description: 'Provide feedback on resolved issues',
      icon: MessageSquare,
      link: '/feedback',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600'
    },
    {
      title: 'Previous Complaints',
      description: 'View your complaint history',
      icon: FileText,
      link: '/complaints/previous',
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600'
    }
  ];

  const adminQuickActions = [
    {
      title: 'Sensor Monitoring',
      description: 'Monitor all facility sensors',
      icon: Activity,
      link: '/admin/sensors',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      title: 'All Complaints',
      description: 'Manage all user complaints',
      icon: Users,
      link: '/admin/complaints',
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600'
    }
  ];

  const quickActions = user?.role === 'admin' ? adminQuickActions : userQuickActions;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back!
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          {user?.role === 'admin' 
            ? 'Monitor facility status and manage complaints'
            : 'Manage your complaints and facility issues'
          }
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {user?.role === 'admin' ? (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Complaints</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{complaints.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Pending Issues</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{allPendingComplaints.length}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Critical Sensors</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{criticalSensors.length}</p>
                </div>
                <Activity className="h-8 w-8 text-red-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">System Status</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">Online</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">My Complaints</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{userComplaints.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Pending</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingComplaints.length}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Resolved</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{resolvedComplaints.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">This Month</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{userComplaints.length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className={`${action.color} ${action.hoverColor} text-white p-6 rounded-lg transition-colors duration-200 group`}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <action.icon size={32} className="group-hover:scale-110 transition-transform duration-200" />
                <div>
                  <h3 className="font-semibold">{action.title}</h3>
                  <p className="text-sm opacity-90 mt-1">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      {user?.role !== 'admin' && userComplaints.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Complaints</h2>
          <div className="space-y-4">
            {userComplaints.slice(0, 3).map((complaint) => (
              <div key={complaint.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{complaint.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{complaint.category}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  complaint.status === 'resolved' 
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    : complaint.status === 'in-progress'
                    ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                    : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                }`}>
                  {complaint.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
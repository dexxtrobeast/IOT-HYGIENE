import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Plus, 
  Clock, 
  MessageSquare, 
  FileText, 
  AlertCircle, 
  Activity,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navigation: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const userNavItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/complaint/new', icon: Plus, label: 'New Complaint' },
    { path: '/complaint/status', icon: Clock, label: 'Complaint Status' },
    { path: '/feedback', icon: MessageSquare, label: 'Feedback' },
    { path: '/complaints/previous', icon: FileText, label: 'Previous Complaints' },
    { path: '/complaints/pending', icon: AlertCircle, label: 'Pending Issues' },
  ];

  const adminNavItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/admin/sensors', icon: Activity, label: 'Sensor Monitoring' },
    { path: '/admin/complaints', icon: Users, label: 'All Complaints' },
    { path: '/admin/feedback', icon: MessageSquare, label: 'User Feedback' },
  ];

  const navItems = user?.role === 'admin' ? adminNavItems : userNavItems;

  return (
    <aside className="w-64 bg-white dark:bg-black shadow-sm border-r border-gray-200 dark:border-gray-700 min-h-screen">
      <nav className="p-4">
        <div className="space-y-2">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                isActive(path)
                  ? 'bg-blue-50 dark:bg-black text-blue-700 dark:text-blue-200 border-r-2 border-blue-700 dark:border-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </aside>
  );
};

export default Navigation;
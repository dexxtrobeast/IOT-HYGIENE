import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ComplaintForm from './pages/ComplaintForm';
import ComplaintStatus from './pages/ComplaintStatus';
import FeedbackForm from './pages/FeedbackForm';
import PreviousComplaints from './pages/PreviousComplaints'
import PendingIssues from './pages/PendingIssues';
import AdminSensors from './pages/AdminSensors';
import AdminComplaints from './pages/AdminComplaints';
import AdminFeedback from './pages/AdminFeedback';
import Layout from './components/Layout/Layout';

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ 
  children, 
  adminOnly = false 
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
      
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/complaint/new" element={
        <ProtectedRoute>
          <Layout>
            <ComplaintForm />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/complaint/status" element={
        <ProtectedRoute>
          <Layout>
            <ComplaintStatus />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/feedback" element={
        <ProtectedRoute>
          <Layout>
            <FeedbackForm />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/complaints/previous" element={
        <ProtectedRoute>
          <Layout>
            <PreviousComplaints />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/complaints/pending" element={
        <ProtectedRoute>
          <Layout>
            <PendingIssues />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/sensors" element={
        <ProtectedRoute adminOnly>
          <Layout>
            <AdminSensors />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/complaints" element={
        <ProtectedRoute adminOnly>
          <Layout>
            <AdminComplaints />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/feedback" element={
        <ProtectedRoute adminOnly>
          <Layout>
            <AdminFeedback />
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <Router>
            <div className="min-h-screen bg-gray-50 dark:bg-black">
              <AppContent />
            </div>
          </Router>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
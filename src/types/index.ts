export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: 'maintenance' | 'cleanliness' | 'security' | 'other';
  status: 'pending' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  userId: string;
  createdAt: string;
  updatedAt: string;
  adminResponse?: string;
}

export interface Sensor {
  id: string;
  name: string;
  type: 'door-tracking' | 'odor' | 'humidity' | 'bin-level';
  currentValue: number;
  thresholdValue: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
}

export interface Feedback {
  id: string;
  complaintId?: string;
  rating: number;
  message: string;
  userId: string;
  createdAt: string;
}
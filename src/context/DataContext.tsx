import React, { createContext, useContext, useState } from 'react';
import { Complaint, Sensor, Feedback } from '../types';

interface DataContextType {
  complaints: Complaint[];
  sensors: Sensor[];
  feedbacks: Feedback[];
  addComplaint: (complaint: Omit<Complaint, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateComplaint: (id: string, updates: Partial<Complaint>) => void;
  addFeedback: (feedback: Omit<Feedback, 'id' | 'createdAt'>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Mock data
const mockComplaints: Complaint[] = [
  {
    id: '1',
    title: 'Broken Door Lock',
    description: 'The main entrance door lock is not working properly',
    category: 'maintenance',
    status: 'pending',
    priority: 'high',
    userId: '2',
    createdAt: '2025-01-07T10:00:00Z',
    updatedAt: '2025-01-07T10:00:00Z',
  },
  {
    id: '2',
    title: 'Unpleasant Odor in Hallway',
    description: 'There is a strong smell coming from the waste disposal area',
    category: 'cleanliness',
    status: 'in-progress',
    priority: 'medium',
    userId: '2',
    createdAt: '2025-01-06T14:30:00Z',
    updatedAt: '2025-01-07T09:00:00Z',
    adminResponse: 'Maintenance team has been notified and will address this today.',
  },
  {
    id: '3',
    title: 'Leaking Faucet in Kitchen',
    description: 'The kitchen faucet has been dripping continuously for the past week',
    category: 'maintenance',
    status: 'resolved',
    priority: 'medium',
    userId: '2',
    createdAt: '2025-01-05T08:00:00Z',
    updatedAt: '2025-01-06T16:00:00Z',
    adminResponse: 'The faucet has been repaired and tested. The issue has been resolved.',
  },
  {
    id: '4',
    title: 'Dirty Common Area',
    description: 'The common area needs cleaning and maintenance',
    category: 'cleanliness',
    status: 'resolved',
    priority: 'low',
    userId: '2',
    createdAt: '2025-01-04T12:00:00Z',
    updatedAt: '2025-01-05T10:00:00Z',
    adminResponse: 'Cleaning has been completed. The area is now properly maintained.',
  },
];

const mockSensors: Sensor[] = [
  {
    id: '1',
    name: 'Main Door Tracker',
    type: 'door-tracking',
    currentValue: 15,
    thresholdValue: 20,
    unit: 'entries/hour',
    status: 'normal',
  },
  {
    id: '2',
    name: 'Hallway Odor Monitor',
    type: 'odor',
    currentValue: 8.5,
    thresholdValue: 6.0,
    unit: 'ppm',
    status: 'warning',
  },
  {
    id: '3',
    name: 'Indoor Humidity',
    type: 'humidity',
    currentValue: 65,
    thresholdValue: 60,
    unit: '%',
    status: 'warning',
  },
  {
    id: '4',
    name: 'Waste Bin Level',
    type: 'bin-level',
    currentValue: 85,
    thresholdValue: 80,
    unit: '%',
    status: 'critical',
  },
];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [complaints, setComplaints] = useState<Complaint[]>(mockComplaints);
  const [sensors] = useState<Sensor[]>(mockSensors);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

  const addComplaint = (complaint: Omit<Complaint, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newComplaint: Complaint = {
      ...complaint,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setComplaints(prev => [newComplaint, ...prev]);
  };

  const updateComplaint = (id: string, updates: Partial<Complaint>) => {
    setComplaints(prev => 
      prev.map(complaint => 
        complaint.id === id 
          ? { ...complaint, ...updates, updatedAt: new Date().toISOString() }
          : complaint
      )
    );
  };

  const addFeedback = (feedback: Omit<Feedback, 'id' | 'createdAt'>) => {
    const newFeedback: Feedback = {
      ...feedback,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setFeedbacks(prev => [newFeedback, ...prev]);
  };

  return (
    <DataContext.Provider value={{ 
      complaints, 
      sensors, 
      feedbacks, 
      addComplaint, 
      updateComplaint, 
      addFeedback 
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
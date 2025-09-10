const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Sensor = require('../models/Sensor');
const Feedback = require('../models/Feedback');
const logger = require('./logger');

// Sample data for seeding
const sampleUsers = [
  {
    username: 'admin',
    email: 'admin@example.com',
    password: 'Admin123!',
    firstName: 'System',
    lastName: 'Administrator',
    role: 'admin',
    isActive: true
  },
  {
    username: 'user1',
    email: 'user1@example.com',
    password: 'User123!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'user',
    isActive: true
  },
  {
    username: 'user2',
    email: 'user2@example.com',
    password: 'User123!',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'user',
    isActive: true
  },
  {
    username: 'maintenance',
    email: 'maintenance@example.com',
    password: 'Maintenance123!',
    firstName: 'Mike',
    lastName: 'Johnson',
    role: 'admin',
    isActive: true
  }
];

const sampleSensors = [
  {
    name: 'Main Door Tracker',
    type: 'door-tracking',
    deviceId: 'DOOR001',
    currentValue: 15,
    thresholdValue: 20,
    unit: 'entries/hour',
    location: {
      building: 'Main Building',
      floor: '1st Floor',
      area: 'Main Entrance'
    },
    manufacturer: 'IoT Solutions Inc.',
    model: 'DT-2000',
    firmwareVersion: 'v2.1.0',
    batteryLevel: 85,
    signalStrength: 95
  },
  {
    name: 'Hallway Odor Monitor',
    type: 'odor',
    deviceId: 'ODOR001',
    currentValue: 8.5,
    thresholdValue: 6.0,
    unit: 'ppm',
    location: {
      building: 'Main Building',
      floor: '2nd Floor',
      area: 'Hallway A'
    },
    manufacturer: 'Air Quality Systems',
    model: 'AQM-300',
    firmwareVersion: 'v1.5.2',
    batteryLevel: 72,
    signalStrength: 88
  },
  {
    name: 'Indoor Humidity Sensor',
    type: 'humidity',
    deviceId: 'HUMID001',
    currentValue: 65,
    thresholdValue: 60,
    unit: '%',
    location: {
      building: 'Main Building',
      floor: '1st Floor',
      area: 'Conference Room'
    },
    manufacturer: 'Climate Control Ltd.',
    model: 'HC-150',
    firmwareVersion: 'v3.0.1',
    batteryLevel: 91,
    signalStrength: 92
  },
  {
    name: 'Waste Bin Level Monitor',
    type: 'bin-level',
    deviceId: 'BIN001',
    currentValue: 85,
    thresholdValue: 80,
    unit: '%',
    location: {
      building: 'Main Building',
      floor: '1st Floor',
      area: 'Kitchen Area'
    },
    manufacturer: 'Smart Waste Solutions',
    model: 'WBL-500',
    firmwareVersion: 'v1.8.3',
    batteryLevel: 45,
    signalStrength: 78
  },
  {
    name: 'Temperature Monitor',
    type: 'temperature',
    deviceId: 'TEMP001',
    currentValue: 22.5,
    thresholdValue: 25.0,
    unit: '°C',
    location: {
      building: 'Main Building',
      floor: '2nd Floor',
      area: 'Office Area'
    },
    manufacturer: 'Thermal Systems',
    model: 'TS-100',
    firmwareVersion: 'v2.2.0',
    batteryLevel: 88,
    signalStrength: 94
  }
];

const sampleComplaints = [
  {
    title: 'Broken Door Lock',
    description: 'The main entrance door lock is not working properly. It gets stuck frequently and sometimes doesn\'t respond to key cards.',
    category: 'maintenance',
    priority: 'high',
    status: 'pending'
  },
  {
    title: 'Unpleasant Odor in Hallway',
    description: 'There is a strong smell coming from the waste disposal area. It\'s affecting the entire hallway and nearby offices.',
    category: 'cleanliness',
    priority: 'medium',
    status: 'in-progress'
  },
  {
    title: 'Air Conditioning Issue',
    description: 'The air conditioning in the conference room is not cooling properly. The temperature is too high for comfortable meetings.',
    category: 'maintenance',
    priority: 'medium',
    status: 'resolved'
  },
  {
    title: 'Security Camera Malfunction',
    description: 'One of the security cameras in the parking lot is showing a black screen. This is a security concern.',
    category: 'security',
    priority: 'high',
    status: 'pending'
  },
  {
    title: 'Water Leak in Restroom',
    description: 'There\'s a water leak under the sink in the men\'s restroom on the first floor. Water is pooling on the floor.',
    category: 'maintenance',
    priority: 'high',
    status: 'in-progress'
  }
];

// Seeder function
async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Complaint.deleteMany({});
    await Sensor.deleteMany({});
    await Feedback.deleteMany({});

    logger.info('Cleared existing data');

    // Create users
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      logger.info(`Created user: ${user.username}`);
    }

    // Create sensors
    const createdSensors = [];
    for (const sensorData of sampleSensors) {
      const sensor = new Sensor(sensorData);
      await sensor.save();
      createdSensors.push(sensor);
      logger.info(`Created sensor: ${sensor.name}`);
    }

    // Create complaints (assign to regular users)
    const regularUsers = createdUsers.filter(user => user.role === 'user');
    const createdComplaints = [];
    
    for (let i = 0; i < sampleComplaints.length; i++) {
      const complaintData = sampleComplaints[i];
      const user = regularUsers[i % regularUsers.length];
      
      const complaint = new Complaint({
        ...complaintData,
        userId: user._id
      });
      
      await complaint.save();
      createdComplaints.push(complaint);
      logger.info(`Created complaint: ${complaint.title}`);
    }

    // Add some admin responses to resolved complaints
    const adminUser = createdUsers.find(user => user.role === 'admin');
    const resolvedComplaint = createdComplaints.find(c => c.status === 'resolved');
    
    if (resolvedComplaint && adminUser) {
      resolvedComplaint.adminResponse = {
        message: 'This issue has been resolved. The air conditioning unit has been repaired and is now functioning properly.',
        respondedBy: adminUser._id,
        respondedAt: new Date()
      };
      await resolvedComplaint.save();
      logger.info('Added admin response to resolved complaint');
    }

    // Create some feedback for resolved complaints
    const resolvedComplaints = createdComplaints.filter(c => c.status === 'resolved');
    for (const complaint of resolvedComplaints) {
      const feedback = new Feedback({
        complaintId: complaint._id,
        userId: complaint.userId,
        rating: Math.floor(Math.random() * 3) + 3, // 3-5 stars
        message: 'Thank you for resolving this issue promptly. The service was satisfactory.',
        category: 'overall-satisfaction'
      });
      await feedback.save();
      logger.info(`Created feedback for complaint: ${complaint.title}`);
    }

    // Add some sensor alerts
    const criticalSensor = createdSensors.find(s => s.status === 'critical');
    if (criticalSensor) {
      await criticalSensor.addAlert(
        'threshold-exceeded',
        'Waste bin level has exceeded the threshold limit. Please empty the bin.',
        'high'
      );
      logger.info('Added alert to critical sensor');
    }

    logger.info('Database seeding completed successfully!');
    logger.info(`Created ${createdUsers.length} users`);
    logger.info(`Created ${createdSensors.length} sensors`);
    logger.info(`Created ${createdComplaints.length} complaints`);
    logger.info(`Created ${resolvedComplaints.length} feedback entries`);

    return {
      users: createdUsers.length,
      sensors: createdSensors.length,
      complaints: createdComplaints.length,
      feedback: resolvedComplaints.length
    };

  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  }
}

// Function to check if database is empty
async function isDatabaseEmpty() {
  try {
    const userCount = await User.countDocuments();
    const sensorCount = await Sensor.countDocuments();
    const complaintCount = await Complaint.countDocuments();
    
    return userCount === 0 && sensorCount === 0 && complaintCount === 0;
  } catch (error) {
    logger.error('Error checking database status:', error);
    return false;
  }
}

// Function to create admin user only
async function createAdminUser() {
  try {
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      logger.info('Admin user already exists');
      return existingAdmin;
    }

    const adminData = sampleUsers.find(user => user.role === 'admin');
    const admin = new User(adminData);
    await admin.save();
    
    logger.info('Created admin user:', admin.username);
    return admin;
  } catch (error) {
    logger.error('Error creating admin user:', error);
    throw error;
  }
}

module.exports = {
  seedDatabase,
  isDatabaseEmpty,
  createAdminUser
};

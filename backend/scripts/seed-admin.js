const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { createAdminUser } = require('../utils/seeder');
const logger = require('../utils/logger');

// Load environment variables
dotenv.config();

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/iot-hygiene-system');
    logger.info('Connected to MongoDB');

    // Create admin user
    const admin = await createAdminUser();
    
    logger.info('Admin user created successfully!');
    logger.info('Admin credentials:');
    logger.info(`Email: ${admin.email}`);
    logger.info('Password: Admin123!');

    process.exit(0);
  } catch (error) {
    logger.error('Error creating admin user:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing database connection...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing database connection...');
  await mongoose.connection.close();
  process.exit(0);
});

// Run the admin seeder
main();

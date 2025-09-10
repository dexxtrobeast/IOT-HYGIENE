const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { seedDatabase } = require('../utils/seeder');
const logger = require('../utils/logger');

// Load environment variables
dotenv.config();

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/iot-hygiene-system');
    logger.info('Connected to MongoDB');

    // Seed the database
    const result = await seedDatabase();
    
    logger.info('Database seeding completed successfully!');
    logger.info('Summary:');
    logger.info(`- Users created: ${result.users}`);
    logger.info(`- Sensors created: ${result.sensors}`);
    logger.info(`- Complaints created: ${result.complaints}`);
    logger.info(`- Feedback entries created: ${result.feedback}`);
    
    logger.info('\nDefault login credentials:');
    logger.info('Admin: admin@example.com / Admin123!');
    logger.info('User: user1@example.com / User123!');
    logger.info('User: user2@example.com / User123!');
    logger.info('Maintenance: maintenance@example.com / Maintenance123!');

    process.exit(0);
  } catch (error) {
    logger.error('Error seeding database:', error);
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

// Run the seeder
main();

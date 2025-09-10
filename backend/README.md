# IoT Hygiene Monitoring System - Backend

A comprehensive Node.js/Express backend for the IoT Hygiene Monitoring System, providing RESTful APIs for complaint management, sensor monitoring, user authentication, and administrative functions.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Complaint Management**: Full CRUD operations for complaints with status tracking
- **IoT Sensor Integration**: Real-time sensor data management and monitoring
- **User Management**: Admin and regular user roles with profile management
- **Feedback System**: User feedback collection and management
- **Real-time Updates**: Socket.IO integration for live updates
- **Analytics & Reporting**: Comprehensive analytics and report generation
- **Security**: Input validation, rate limiting, and security headers
- **Logging**: Structured logging with Winston
- **Database**: MongoDB with Mongoose ODM

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.IO
- **Validation**: Express-validator
- **Security**: Helmet, bcryptjs
- **Logging**: Winston
- **File Upload**: Multer
- **Scheduling**: Node-cron

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd iot-hygiene-monitoring-system/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/iot-hygiene-system
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:5173
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Seed the database (optional)**
   ```bash
   npm run seed
   ```

6. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/me` - Update user profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/refresh` - Refresh JWT token

### Complaint Endpoints

- `GET /api/complaints` - Get all complaints (filtered by user role)
- `GET /api/complaints/:id` - Get complaint by ID
- `POST /api/complaints` - Create a new complaint
- `PUT /api/complaints/:id` - Update complaint
- `DELETE /api/complaints/:id` - Delete complaint
- `POST /api/complaints/:id/respond` - Add admin response
- `POST /api/complaints/:id/resolve` - Resolve complaint
- `POST /api/complaints/:id/escalate` - Escalate complaint

### Sensor Endpoints

- `GET /api/sensors` - Get all sensors
- `GET /api/sensors/:id` - Get sensor by ID
- `POST /api/sensors` - Create a new sensor (admin only)
- `PUT /api/sensors/:id` - Update sensor (admin only)
- `DELETE /api/sensors/:id` - Delete sensor (admin only)
- `POST /api/sensors/:id/data` - Add sensor data point
- `POST /api/sensors/:id/alert` - Add sensor alert
- `GET /api/sensors/:id/data` - Get sensor data points

### Feedback Endpoints

- `GET /api/feedback` - Get all feedback
- `GET /api/feedback/:id` - Get feedback by ID
- `POST /api/feedback` - Create a new feedback
- `PUT /api/feedback/:id` - Update feedback
- `DELETE /api/feedback/:id` - Delete feedback
- `POST /api/feedback/:id/helpful` - Mark feedback as helpful

### Admin Endpoints

- `GET /api/admin/dashboard` - Get admin dashboard data
- `GET /api/admin/analytics` - Get detailed analytics
- `GET /api/admin/system-health` - Get system health status
- `GET /api/admin/reports` - Generate system reports

### User Management Endpoints

- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID (admin only)
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)
- `POST /api/users/:id/activate` - Activate user (admin only)
- `POST /api/users/:id/deactivate` - Deactivate user (admin only)

## Database Models

### User Model
- Authentication fields (username, email, password)
- Profile information (firstName, lastName, phoneNumber)
- Role-based access (user, admin)
- Account status and verification

### Complaint Model
- Complaint details (title, description, category)
- Status tracking (pending, in-progress, resolved, closed)
- Priority levels and escalation
- Admin responses and resolution notes

### Sensor Model
- IoT device information (name, type, deviceId)
- Real-time data (currentValue, thresholdValue)
- Health monitoring (battery, signal strength)
- Alert system and maintenance tracking

### Feedback Model
- User feedback (rating, message, category)
- Complaint association
- Moderation features (flagging, admin responses)

## Socket.IO Events

### Complaint Events
- `complaint:created` - New complaint created
- `complaint:updated` - Complaint updated
- `complaint:deleted` - Complaint deleted
- `complaint:responded` - Admin response added
- `complaint:resolved` - Complaint resolved
- `complaint:escalated` - Complaint escalated

### Sensor Events
- `sensor:created` - New sensor created
- `sensor:updated` - Sensor updated
- `sensor:deleted` - Sensor deleted
- `sensor:data` - New sensor data received
- `sensor:alert` - New sensor alert
- `sensor:alert-acknowledged` - Alert acknowledged

### Feedback Events
- `feedback:created` - New feedback submitted

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Admin and user role permissions
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: API rate limiting to prevent abuse
- **Security Headers**: Helmet.js for security headers
- **Password Hashing**: bcryptjs for secure password storage
- **CORS Protection**: Configurable CORS settings

## Development

### Scripts

```bash
npm run dev          # Start development server with nodemon
npm start           # Start production server
npm test            # Run tests
npm run seed        # Seed database with sample data
npm run lint        # Run ESLint
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/iot-hygiene-system |
| `JWT_SECRET` | JWT secret key | Required |
| `JWT_EXPIRES_IN` | JWT expiration time | 7d |
| `CORS_ORIGIN` | CORS allowed origin | http://localhost:5173 |
| `LOG_LEVEL` | Logging level | info |

### Database Seeding

The application includes a database seeder that creates:
- Admin users (admin@example.com / Admin123!)
- Regular users (user1@example.com / User123!)
- Sample sensors with different types
- Sample complaints with various statuses
- Sample feedback entries

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --grep "auth"
```

## Deployment

### Production Setup

1. **Environment Configuration**
   ```bash
   NODE_ENV=production
   MONGODB_URI=your-production-mongodb-uri
   JWT_SECRET=your-production-jwt-secret
   CORS_ORIGIN=your-frontend-domain
   ```

2. **PM2 Deployment**
   ```bash
   npm install -g pm2
   pm2 start server.js --name "iot-hygiene-backend"
   pm2 save
   pm2 startup
   ```

3. **Docker Deployment**
   ```bash
   docker build -t iot-hygiene-backend .
   docker run -p 5000:5000 iot-hygiene-backend
   ```

### Environment Variables for Production

- Use strong, unique JWT secrets
- Configure proper CORS origins
- Set up MongoDB with authentication
- Configure logging for production
- Set up monitoring and alerting

## API Response Format

### Success Response
```json
{
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "error": {
    "message": "Error description",
    "status": "error",
    "statusCode": 400
  }
}
```

### Pagination Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.

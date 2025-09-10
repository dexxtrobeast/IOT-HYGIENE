# IoT Hygiene Monitoring System - Complete Setup Guide

This guide will help you set up both the frontend and backend of the IoT Hygiene Monitoring System.

## Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn**
- **Git**

## Quick Start with Docker

The easiest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone <repository-url>
cd iot-hygiene-monitoring-system

# Start the backend with MongoDB
cd backend
docker-compose up -d

# Start the frontend (in a new terminal)
cd ../frontend
npm install
npm run dev
```

## Manual Setup

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp env.example .env

# Edit .env file with your configuration
# PORT=5000
# NODE_ENV=development
# MONGODB_URI=mongodb://localhost:27017/iot-hygiene-system
# JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
# JWT_EXPIRES_IN=7d
# CORS_ORIGIN=http://localhost:5173

# Start MongoDB (if not already running)
# On Windows: Start MongoDB service
# On macOS: brew services start mongodb-community
# On Linux: sudo systemctl start mongod

# Seed the database with sample data
npm run seed

# Start the development server
npm run dev
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory (root of the project)
cd ..

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Default Login Credentials

After seeding the database, you can use these credentials:

### Admin Users
- **Email**: admin@example.com
- **Password**: Admin123!
- **Role**: System Administrator

- **Email**: maintenance@example.com
- **Password**: Maintenance123!
- **Role**: Maintenance Admin

### Regular Users
- **Email**: user1@example.com
- **Password**: User123!
- **Role**: Regular User

- **Email**: user2@example.com
- **Password**: User123!
- **Role**: Regular User

## API Endpoints

The backend provides the following main API endpoints:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Complaints
- `GET /api/complaints` - Get all complaints
- `POST /api/complaints` - Create new complaint
- `PUT /api/complaints/:id` - Update complaint
- `DELETE /api/complaints/:id` - Delete complaint

### Sensors
- `GET /api/sensors` - Get all sensors
- `POST /api/sensors/:id/data` - Add sensor data
- `GET /api/sensors/:id/data` - Get sensor data

### Admin
- `GET /api/admin/dashboard` - Admin dashboard
- `GET /api/admin/analytics` - Analytics data
- `GET /api/admin/system-health` - System health

## Features

### For Regular Users
- Submit complaints and track their status
- View complaint history
- Provide feedback on resolved complaints
- Real-time updates on complaint status

### For Administrators
- Manage all complaints and users
- Monitor IoT sensors in real-time
- View analytics and generate reports
- System health monitoring
- User management and role assignment

### IoT Integration
- Real-time sensor data collection
- Automatic alert generation
- Sensor health monitoring
- Maintenance scheduling

## Development

### Backend Development

```bash
cd backend

# Start development server with auto-reload
npm run dev

# Run tests
npm test

# Seed database
npm run seed

# Create admin user only
npm run seed:admin
```

### Frontend Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

### Backend (.env)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/iot-hygiene-system
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
```

### Frontend
The frontend automatically connects to `http://localhost:5000/api` for the backend.

## Database Schema

### Users Collection
- Authentication fields (username, email, password)
- Profile information (firstName, lastName, phoneNumber)
- Role-based access (user, admin)
- Account status and verification

### Complaints Collection
- Complaint details (title, description, category)
- Status tracking (pending, in-progress, resolved, closed)
- Priority levels and escalation
- Admin responses and resolution notes

### Sensors Collection
- IoT device information (name, type, deviceId)
- Real-time data (currentValue, thresholdValue)
- Health monitoring (battery, signal strength)
- Alert system and maintenance tracking

### Feedback Collection
- User feedback (rating, message, category)
- Complaint association
- Moderation features (flagging, admin responses)

## Real-time Features

The system uses Socket.IO for real-time updates:

### Events
- `complaint:created` - New complaint created
- `complaint:updated` - Complaint updated
- `complaint:resolved` - Complaint resolved
- `sensor:data` - New sensor data received
- `sensor:alert` - New sensor alert

## Security Features

- JWT-based authentication
- Role-based access control
- Input validation and sanitization
- Rate limiting
- CORS protection
- Password hashing with bcrypt
- Security headers with Helmet

## Deployment

### Backend Deployment

#### Using PM2
```bash
npm install -g pm2
pm2 start server.js --name "iot-hygiene-backend"
pm2 save
pm2 startup
```

#### Using Docker
```bash
docker build -t iot-hygiene-backend .
docker run -p 5000:5000 iot-hygiene-backend
```

### Frontend Deployment

```bash
npm run build
# Deploy the dist folder to your web server
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check the connection string in .env
   - Verify MongoDB port (default: 27017)

2. **CORS Errors**
   - Check CORS_ORIGIN in backend .env
   - Ensure frontend URL matches the CORS configuration

3. **JWT Token Issues**
   - Verify JWT_SECRET is set in .env
   - Check token expiration settings

4. **Port Conflicts**
   - Backend runs on port 5000 by default
   - Frontend runs on port 5173 by default
   - Change ports in respective configuration files if needed

### Logs

- Backend logs are stored in `backend/logs/`
- Check console output for real-time logs
- Use `LOG_LEVEL=debug` for detailed logging

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Check the logs for error details
4. Create an issue in the repository

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.

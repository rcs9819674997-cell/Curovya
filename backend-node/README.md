# HamroDoctor Backend API

A scalable Node.js backend for the HamroDoctor healthcare platform, designed to handle 10,000 concurrent users and 1 million monthly active users.

## Architecture Overview

This backend is built with a focus on high scalability and performance:

- **Express.js** - Fast, minimalist web framework
- **MongoDB** - NoSQL database with connection pooling (100 connections)
- **Redis** - Caching layer and session management
- **Clustering** - Multi-core utilization for horizontal scaling
- **Rate Limiting** - Distributed rate limiting with Redis
- **JWT Authentication** - Secure token-based authentication with RBAC

## Features

- User authentication (signup, login, OTP verification, password reset)
- Doctor management with search and filtering
- Appointment booking with real-time queue management
- Prescription management with medicine reminders
- Lab test booking and report management
- Emergency contacts and services
- AI symptom checker (OpenAI integration)
- Video consultations (Agora integration)
- Payment gateway integration (eSewa)
- Family health management
- Medicine reminders with dose tracking
- Notifications system
- Doctor portal with queue management
- Clinic and lab admin dashboards

## Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 4.4
- Redis >= 6.0
- npm >= 9.0.0

## 🚀 Deployment on Render (via GitHub)

This repository includes full configuration for 1-click deployment on [Render](https://render.com).

- **Render Blueprint File**: [`render.yaml`](file:///Users/mac/Desktop/Curovya/backend-node/render.yaml)
- **Deployment Guide**: [`DEPLOYMENT.md`](file:///Users/mac/Desktop/Curovya/backend-node/DEPLOYMENT.md)

### Quick Steps:
1. Push your repository to GitHub.
2. Go to [Render Dashboard](https://dashboard.render.com) -> **Blueprints** -> **New Blueprint Instance**.
3. Select your repository. Render will automatically configure the Web Service with `npm install` and `node src/server.js`.
4. Add `MONGODB_URI` and `REDIS_URL` under Environment Settings.


## Installation

1. Clone the repository:
```bash
cd backend-node
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start MongoDB and Redis services:
```bash
# Using Docker
docker-compose up -d mongodb redis

# Or start them locally
mongod
redis-server
```

5. Run seed data:
```bash
npm run seed
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode (Single Instance)
```bash
npm start
```

### Production Mode (Clustered)
```bash
npm run cluster
```

The server will start on port 8000 by default.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | Server port | 8000 |
| `CLUSTER_MODE` | Enable clustering | false |
| `MONGO_URL` | MongoDB connection string | mongodb://0.0.0.0:27017 |
| `DB_NAME` | Database name | test_database |
| `MONGO_POOL_SIZE` | MongoDB connection pool size | 100 |
| `REDIS_URL` | Redis connection string | redis://localhost:6379 |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_ALGO` | JWT algorithm | HS256 |
| `ACCESS_TOKEN_MINUTES` | Access token expiry | 1440 |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `ESEWA_ENV` | eSewa environment (UAT/PROD) | UAT |
| `ESEWA_MERCHANT_CODE` | eSewa merchant code | - |
| `ESEWA_SECRET_KEY` | eSewa secret key | - |
| `AGORA_APP_ID` | Agora app ID | - |
| `AGORA_APP_CERTIFICATE` | Agora app certificate | - |
| `AGORA_TOKEN_TTL_SECONDS` | Agora token TTL | 3600 |

## API Documentation

### Authentication

#### Signup
```http
POST /api/auth/signup
Content-Type: application/json

{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "+9779812345678",
  "password": "Secure@123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "Secure@123"
}
```

#### Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}
```

### Doctors

#### List Doctors
```http
GET /api/doctors?q=cardiologist&specialty=Cardiologist&min_rating=4.5
```

#### Get Doctor Details
```http
GET /api/doctors/:doctor_id
```

#### Get Doctor Slots
```http
GET /api/doctors/:doctor_id/slots?date=2024-01-15
```

### Appointments

#### Book Appointment
```http
POST /api/appointments
Authorization: Bearer <token>
Content-Type: application/json

{
  "doctor_id": "doc-1",
  "slot_id": "slot-1",
  "consultation_type": "clinic",
  "payment_method": "esewa",
  "patient_details": {
    "full_name": "John Doe",
    "relation": "Self"
  }
}
```

#### Get Queue View
```http
GET /api/appointments/:appt_id/queue
Authorization: Bearer <token>
```

### Prescriptions

#### List Prescriptions
```http
GET /api/prescriptions
Authorization: Bearer <token>
```

#### Create Prescription (Doctor)
```http
POST /api/prescriptions
Authorization: Bearer <token>
Content-Type: application/json

{
  "patient_id": "patient-1",
  "diagnosis": "Viral Fever",
  "symptoms": ["Fever", "Body ache"],
  "medicines": [
    {
      "name": "Paracetamol 500mg",
      "dosage": "1-0-1",
      "duration": "5 days",
      "instructions": "After food"
    }
  ]
}
```

### Lab Tests

#### List Lab Tests
```http
GET /api/labs/tests
```

#### Book Lab Test
```http
POST /api/labs/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "test_id": "lab-1",
  "home_collection": true,
  "date": "2024-01-15"
}
```

### AI Symptom Checker

```http
POST /api/ai/symptom-check
Authorization: Bearer <token>
Content-Type: application/json

{
  "symptoms": ["fever", "headache", "body ache"],
  "age": 30,
  "gender": "male",
  "duration": "2 days"
}
```

### Video Consultation

#### Generate Video Token
```http
POST /api/video/token
Authorization: Bearer <token>
Content-Type: application/json

{
  "appointment_id": "appt-1"
}
```

#### Start Video Call
```http
POST /api/video/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "appointment_id": "appt-1"
}
```

### Payments

#### Initiate Payment
```http
POST /api/payments/initiate
Authorization: Bearer <token>
Content-Type: application/json

{
  "use_case": "appointment",
  "return_url": "https://app.example.com/payment/callback",
  "doctor_id": "doc-1",
  "slot_id": "slot-1",
  "consultation_type": "clinic"
}
```

## Demo Accounts

After running the seed script, the following demo accounts are available:

### Patient
- Email: `patient@hamrodoctor.np`
- Password: `Patient@123`

### Doctor
- Email: `doctor@hamrodoctor.np`
- Password: `Doctor@123`

### Clinic Admin
- Email: `admin@heartclinic.np`
- Password: `Admin@123`

### Lab Admin
- Email: `lab@hamrodoctor.np`
- Password: `Lab@123`

### Super Admin
- Email: `super@hamrodoctor.np`
- Password: `Super@123`

## Scalability Features

### Connection Pooling
- MongoDB: 100 max connections, 10 min connections
- Automatic reconnection on failure
- Connection health monitoring

### Redis Caching
- Doctor listings cached for 5 minutes
- Lab tests cached for 10 minutes
- User sessions cached for 24 hours
- Distributed cache invalidation

### Rate Limiting
- General: 100 requests per 15 minutes
- Auth: 5 attempts per 15 minutes
- API: 200 requests per minute (authenticated)
- Distributed rate limiting with Redis

### Clustering
- Multi-core utilization
- Automatic worker restart on failure
- Graceful shutdown handling
- Zero-downtime deployments

## Security

- Helmet.js for security headers
- CORS configuration
- JWT token authentication
- Password hashing with bcrypt
- Rate limiting against DDoS
- Input validation
- SQL injection prevention (MongoDB)
- XSS protection

## Monitoring

### Health Check
```http
GET /health
```

Returns:
```json
{
  "uptime": 12345,
  "message": "OK",
  "timestamp": 1705315200000,
  "database": "connected",
  "redis": "connected",
  "env": "production"
}
```

### Logging
- Winston logger with multiple transports
- File logging (error.log, combined.log)
- Log rotation (5MB per file, 5 files max)
- Structured JSON logging in production

## Deployment

### Docker

```bash
# Build image
docker build -t hamrodoctor-backend .

# Run container
docker run -p 8000:8000 \
  --env-file .env \
  hamrodoctor-backend
```

### Docker Compose

```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - CLUSTER_MODE=true
    depends_on:
      - mongodb
      - redis
  
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  mongodb_data:
```

### PM2

```bash
npm install -g pm2
pm2 start src/server.js -i max --name hamrodoctor-backend
pm2 startup
pm2 save
```

## Performance Benchmarks

The system is designed to handle:
- **10,000 concurrent users**
- **1 million monthly active users**
- **Average response time**: < 100ms
- **P95 response time**: < 300ms
- **Throughput**: 5,000+ requests/second

## Troubleshooting

### MongoDB Connection Failed
- Check MongoDB is running: `mongod --version`
- Verify connection string in .env
- Check network connectivity

### Redis Connection Failed
- Check Redis is running: `redis-cli ping`
- Verify Redis URL in .env
- Check Redis authentication if configured

### High Memory Usage
- Reduce MongoDB pool size
- Adjust Redis cache TTL
- Check for memory leaks in custom code

## License

MIT

## Support

For support, email support@hamrodoctor.np or create an issue in the repository.

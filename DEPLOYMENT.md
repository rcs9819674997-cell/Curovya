# Curovya Deployment Guide

This guide covers deploying the Curovya healthcare platform, which consists of a Node.js backend and React Native frontend.

## Architecture

- **Backend**: Node.js with Express.js, MongoDB, Redis
- **Frontend**: React Native with Expo Router
- **Infrastructure**: Docker Compose for containerization

## Prerequisites

- Docker and Docker Compose
- Node.js >= 18 (for local development)
- MongoDB Atlas account (for production database)
- Redis instance (for production caching)

## Environment Configuration

### Backend Environment Variables

Create `.env` file in `backend-node/`:

```env
NODE_ENV=production
PORT=8000
CLUSTER_MODE=true

# Database
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/curovya
DB_NAME=curovya
MONGO_POOL_SIZE=100

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_ALGO=HS256
ACCESS_TOKEN_MINUTES=1440

# OpenAI (optional)
OPENAI_API_KEY=sk-...

# eSewa Payment
ESEWA_ENV=PROD
ESEWA_MERCHANT_CODE=your-merchant-code
ESEWA_SECRET_KEY=your-secret-key
PUBLIC_BASE_URL=https://api.hamrodoctor.np

# Agora Video (optional)
AGORA_APP_ID=your-app-id
AGORA_APP_CERTIFICATE=your-app-certificate
AGORA_TOKEN_TTL_SECONDS=3600

# CORS
CORS_ORIGIN=https://app.hamrodoctor.np,exp://*
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_FAILED_REQUESTS=true

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs
```

### Frontend Environment Variables

Create `.env.production` file in `frontend/`:

```env
EXPO_PUBLIC_BACKEND_URL=https://api.hamrodoctor.np
EXPO_USE_FAST_RESOLVER="1"
```

## Local Development

### Start Backend

```bash
cd backend-node
npm install
npm run seed  # Seed demo data
npm start     # Start server
```

Backend will be available at `http://localhost:8000`

### Start Frontend

```bash
cd frontend
npm install
npx expo start
```

Frontend will be available at:
- Web: `http://localhost:8081`
- Expo Go: Scan QR code
- iOS Simulator: Press `i`
- Android: Press `a`

## Docker Deployment

### Using Root Docker Compose

```bash
cd /path/to/Curovya
docker compose up -d
```

This starts:
- Backend on port 8000
- Redis on port 6379

### Using Backend Docker Compose

```bash
cd backend-node
docker compose up -d
```

### Build and Push Images

```bash
# Build backend
docker build -t your-registry/hamrodoctor-backend:latest ./backend-node

# Push to registry
docker push your-registry/hamrodoctor-backend:latest
```

## Production Deployment

### Option 1: Docker Compose (Simple)

Update `docker-compose.yml` with production values:

```yaml
services:
  backend:
    image: your-registry/hamrodoctor-backend:latest
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - CLUSTER_MODE=true
      - MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/curovya
      - REDIS_URL=redis://redis:6379
      - CORS_ORIGIN=https://app.hamrodoctor.np
    depends_on:
      - redis
    restart: always

  redis:
    image: redis:7-alpine
    restart: always
```

### Option 2: Cloud Deployment

#### Backend on VPS/Cloud

1. **Setup Server** (Ubuntu 20.04+):
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

2. **Deploy Backend**:
```bash
# Clone repository
git clone https://github.com/your-repo/curovya.git
cd curovya

# Build and start
docker compose up -d

# Setup reverse proxy (nginx)
sudo apt install nginx
```

3. **Configure Nginx**:
```nginx
server {
    listen 80;
    server_name api.hamrodoctor.np;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Frontend on Expo Application Services (EAS)

1. **Configure EAS**:
```bash
cd frontend
npx eas-cli login
npx eas-cli build:configure
```

2. **Create `eas.json`**:
```json
{
  "cli": {
    "version": ">= 5.2.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "ios": {
        "autoIncrement": true
      },
      "android": {
        "autoIncrement": true
      }
    }
  }
}
```

3. **Build Production App**:
```bash
npx eas-cli build --platform ios
npx eas-cli build --platform android
```

4. **Submit to App Stores**:
```bash
npx eas-cli submit --platform ios
npx eas-cli submit --platform android
```

### Option 3: Kubernetes (Advanced)

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hamrodoctor-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hamrodoctor-backend
  template:
    metadata:
      labels:
        app: hamrodoctor-backend
    spec:
      containers:
      - name: backend
        image: your-registry/hamrodoctor-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: NODE_ENV
          value: "production"
        - name: CLUSTER_MODE
          value: "true"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: hamrodoctor-backend
spec:
  selector:
    app: hamrodoctor-backend
  ports:
  - port: 80
    targetPort: 8000
  type: LoadBalancer
```

Deploy:
```bash
kubectl apply -f k8s/deployment.yaml
```

## Database Setup

### MongoDB Atlas

1. Create free tier cluster
2. Configure IP whitelist (0.0.0.0/0 for development)
3. Create database user
4. Get connection string
5. Update `MONGO_URL` in environment

### Seed Production Data

```bash
cd backend-node
NODE_ENV=production node src/seed.js
```

## Monitoring

### Health Check

```bash
curl https://api.hamrodoctor.np/health
```

Expected response:
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

### Logs

Backend logs are stored in `backend-node/logs/`:
- `combined.log` - All logs
- `error.log` - Error logs only

### Performance Monitoring

Consider adding:
- Application Performance Monitoring (APM)
- Error tracking (Sentry)
- Uptime monitoring
- Database monitoring

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS with valid SSL certificates
- [ ] Configure firewall rules
- [ ] Enable MongoDB authentication
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Regular security updates
- [ ] Backup strategy in place
- [ ] Monitor for suspicious activity

## Scaling

### Horizontal Scaling

Backend supports clustering out of the box. To scale:

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      replicas: 3
```

### Load Balancing

Use nginx or cloud load balancer:
```nginx
upstream backend {
    server backend1:8000;
    server backend2:8000;
    server backend3:8000;
}

server {
    location / {
        proxy_pass http://backend;
    }
}
```

## Backup Strategy

### MongoDB Backup

```bash
# Manual backup
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/curovya" --out=/backup/path

# Automated backup (cron)
0 2 * * * mongodump --uri="mongodb://..." --out=/backup/$(date +\%Y\%m\%d)
```

### Redis Backup

Redis is ephemeral, but can be persisted:
```yaml
redis:
  image: redis:7-alpine
  command: redis-server --appendonly yes
  volumes:
    - redis_data:/data
```

## Troubleshooting

### Backend won't start

1. Check MongoDB connection: `curl http://localhost:8000/health`
2. Check logs: `docker logs hamrodoctor-backend`
3. Verify environment variables
4. Check Redis connection

### Frontend can't connect to backend

1. Verify `EXPO_PUBLIC_BACKEND_URL` is correct
2. Check CORS configuration
3. Ensure backend is accessible
4. Check network/firewall settings

### Database connection errors

1. Verify MongoDB connection string
2. Check IP whitelist in MongoDB Atlas
3. Ensure database user has correct permissions
4. Check network connectivity

## Support

For deployment issues:
- Check logs in `backend-node/logs/`
- Review Docker container logs
- Verify environment variables
- Check MongoDB Atlas status
- Test API endpoints directly

## Cost Estimates

### Backend (Monthly)
- VPS (2GB RAM, 1 CPU): $10-20
- MongoDB Atlas Free Tier: $0
- Redis (managed): $10-15
- Domain: $10-15/year
- SSL Certificate: $0 (Let's Encrypt)

**Total**: $20-35/month

### Frontend
- EAS Build: Free for development
- App Store: $99/year
- Play Store: $25 one-time

**Total**: $124/year (first year)

## Next Steps

1. Configure production environment variables
2. Set up MongoDB Atlas cluster
3. Deploy backend to production server
4. Configure Nginx reverse proxy
5. Build production frontend app
6. Submit to app stores
7. Set up monitoring and alerts
8. Configure automated backups
9. Test end-to-end functionality
10. Launch to users

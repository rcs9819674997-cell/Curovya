# Expo Go Mobile Testing Setup Guide

This guide will help you set up Curovya for testing on your mobile device using Expo Go.

## Prerequisites

1. **Expo Go App**: Download Expo Go from:
   - iOS: App Store
   - Android: Google Play Store

2. **Same Network**: Your mobile device and development machine must be on the same WiFi network.

3. **Backend Running**: Your backend server must be running and accessible.

## Step 1: Get Your Local IP Address

Find your machine's local IP address:

**Mac:**
```bash
# Terminal
ipconfig getifaddr en0
# or
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```cmd
ipconfig
# Look for "IPv4 Address" under your WiFi adapter
```

**Linux:**
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

Note: Your IP will typically look like `192.168.x.x` or `10.0.x.x`

## Step 2: Update Backend Configuration

The backend is already configured to accept connections from any device:

- MongoDB URL: `mongodb://0.0.0.0:27017`
- CORS: Allows all origins (`allow_origins=["*"]`)

## Step 3: Update Frontend Environment Variables

Edit `frontend/.env` and replace `YOUR_LOCAL_IP` with your actual IP:

```bash
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.100:8000  # Replace with your IP
EXPO_USE_FAST_RESOLVER="1"
```

## Step 4: Start MongoDB

Make sure MongoDB is running and accessible:

```bash
# If using local MongoDB
mongod --bind_ip 0.0.0.0

# Or if using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## Step 5: Start Backend Server

```bash
cd backend
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

The `--host 0.0.0.0` flag makes the server accessible from other devices on your network.

## Step 6: Start Expo Development Server

```bash
cd frontend
yarn start
# or
npm start
```

## Step 7: Connect via Expo Go

1. Open Expo Go app on your mobile device
2. You'll see several options to connect:
   - **Scan QR Code**: Press 'w' in the terminal to show QR code, scan it with Expo Go
   - **Enter URL**: Type the URL shown in your terminal (e.g., `exp://192.168.1.100:8081`)
   - **Search**: Your device should automatically find the development server if on same network

## Troubleshooting

### "Connection Refused" or "Network Error"

- Ensure both devices are on the same WiFi network
- Check firewall settings on your development machine
- Verify backend is running with `--host 0.0.0.0`
- Try using your machine's hostname instead of IP

### Backend Not Accessible from Mobile

- Verify MongoDB is bound to `0.0.0.0` not `localhost`
- Check that port 8000 is not blocked by firewall
- Test backend URL from mobile browser: `http://YOUR_IP:8000/api`

### Expo Go Can't Find Development Server

- Press 'i' in terminal to show IP address
- Manually enter the URL in Expo Go
- Ensure you're not using a VPN that might block local network connections

### App Crashes or Shows White Screen

- Check that `newArchEnabled` is set to `false` in app.json
- Ensure all dependencies are installed: `cd frontend && yarn install`
- Clear Expo Go cache: Shake device → Dev menu → Clear cache

## Testing Checklist

- [ ] Backend server running on `0.0.0.0:8000`
- [ ] MongoDB accessible from network
- [ ] Frontend .env has correct local IP
- [ ] Expo development server running
- [ ] Mobile device on same WiFi network
- [ ] Expo Go can connect to development server
- [ ] App loads without errors
- [ ] API calls work from mobile device

## Quick Start Commands

```bash
# Terminal 1: Start MongoDB
mongod --bind_ip 0.0.0.0

# Terminal 2: Start Backend
cd backend
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload

# Terminal 3: Start Frontend
cd frontend
yarn start
```

Then scan QR code or enter URL in Expo Go app.

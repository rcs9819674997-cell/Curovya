# Render Deployment Guide for `backend-node`

This guide explains how to deploy the **HamroDoctor Node.js Backend API** (`backend-node`) to [Render](https://render.com) using a GitHub repository.

---

## 🚀 Quick Start (Option A: Render Blueprint - Recommended)

1. **Push Code to GitHub**:
   Ensure your code is pushed to your GitHub repository.

2. **Login to Render**:
   Go to [dashboard.render.com](https://dashboard.render.com) and log in.

3. **Deploy via Blueprint**:
   - Click **New +** → **Blueprint**.
   - Connect your GitHub repository.
   - Render will automatically detect `render.yaml` at the root or `backend-node/render.yaml`.
   - Click **Apply**. Render will set up the Web Service automatically.

4. **Add Database Environment Variables**:
   In your Render Web Service Dashboard, go to **Environment** and set:
   - `MONGODB_URI`: `mongodb+srv://<username>:<password>@cluster0.mongodb.net/test_database?retryWrites=true&w=majority`
   - `REDIS_URL`: `redis://default:<password>@<redis-host>:6379` (optional if using cloud Redis or Upstash)

---

## 🛠️ Manual Web Service Setup (Option B: Web Service)

If you prefer configuring the Web Service manually on Render:

### Step 1: Create New Web Service
1. On [Render Dashboard](https://dashboard.render.com), click **New +** → **Web Service**.
2. Select your GitHub repository.

### Step 2: Configure Service Settings
- **Name**: `hamrodoctor-backend-node`
- **Region**: Select closest region (e.g., `Singapore`)
- **Branch**: `main` (or your default branch)
- **Root Directory**: `backend-node`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `node src/server.js`
- **Health Check Path**: `/health`

### Step 3: Configure Environment Variables

| Variable Name | Example Value | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Production environment |
| `PORT` | `10000` or `8000` | Auto-assigned by Render |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` | MongoDB Atlas Connection String |
| `REDIS_URL` | `redis://default:pass@redis-host:6379` | Cloud Redis URI |
| `JWT_SECRET` | `<generate-random-secret-key>` | Random 32+ char secret |
| `CORS_ORIGIN` | `*` | Or comma-separated frontend URLs |
| `ESEWA_MERCHANT_CODE` | `EPAYTEST` | eSewa Merchant Code |
| `ESEWA_SECRET_KEY` | `8gBmpyNKaAbJwXch` | eSewa Secret Key |

---

## 🔍 Verification

Once Render finishes building and deploying:
1. Open your Render Web Service public URL: `https://hamrodoctor-backend-node.onrender.com/health`
2. Expected JSON Response:
```json
{
  "status": "ok",
  "uptime": 42.5,
  "timestamp": 1785339300000,
  "database": "connected",
  "redis": "connected",
  "env": "production"
}
```
3. Update your Expo React Native frontend `.env` or `EXPO_PUBLIC_BACKEND_URL`:
```env
EXPO_PUBLIC_BACKEND_URL=https://hamrodoctor-backend-node.onrender.com/api
```

---

## 📌 Database Auto-Seeding (Optional)

To seed initial doctors, clinics, and test data on first deploy, run the seed command via Render Shell or as a build step:
```bash
node src/seed.js
```

# HamroDoctor Plus - Production Subscription & Payment Credentials Setup Guide

This guide details the complete, step-by-step process for obtaining, configuring, and deploying production credentials for **HamroDoctor Plus** subscription features across **eSewa**, **Khalti**, and **Credit/Debit Card** payment gateways.

---

## 1. Environment Architecture Overview

The subscription architecture consists of:
- **Backend Service**: `backend-node/` handles signature verification, webhook processing, transaction logging, and MongoDB user model subscription updates.
- **Frontend Applications**: `apps/patient/` renders the in-app subscription portal and payment modals.

---

## 2. eSewa Production Credentials Setup

### Step 2.1: Register eSewa Merchant Account
1. Visit the [eSewa Merchant Portal](https://merchant.esewa.com.np) and sign up for a Corporate/Business Merchant Account.
2. Complete KYC submission (Company Registration, PAN/VAT certificate, Bank Account details for payout settlement).

### Step 2.2: Obtain Production Keys
Once approved by eSewa, log into the Merchant Portal to obtain:
- **Merchant Code (Product Code)**: Assigned unique identifier (e.g. `EPAYTEST` for UAT / Testing; assigned business code for Production).
- **Secret Key**: HMAC SHA256 signing secret used for verifying payload integrity.

### Step 2.3: Configure eSewa Environment Variables
In `backend-node/.env`:

```env
# eSewa Production Configuration
ESEWA_ENV=PROD
ESEWA_MERCHANT_CODE=YOUR_PRODUCTION_MERCHANT_CODE
ESEWA_SECRET_KEY=YOUR_PRODUCTION_SECRET_KEY
PUBLIC_BASE_URL=https://api.hamrodoctor.np
```

> [!NOTE]
> Setting `ESEWA_ENV=PROD` automatically points the backend to `https://epay.esewa.com.np/api/epay/main/v2/form` and `https://epay.esewa.com.np/api/epay/transaction/status/`.

---

## 3. Khalti Production Credentials Setup

### Step 3.1: Register Khalti Merchant Account
1. Visit the [Khalti Merchant Portal](https://merchant.khalti.com).
2. Register your business details and link your settlement bank account.

### Step 3.2: Obtain Production Secret & Public Keys
1. Go to **Keys & API Credentials** in the Khalti Dashboard.
2. Toggle from **Test** to **Live Mode**.
3. Copy your:
   - **Secret Key**: `live_secret_key_...`
   - **Public Key**: `live_public_key_...`

### Step 3.3: Configure Khalti Environment Variables
In `backend-node/.env`:

```env
# Khalti Production Configuration
KHALTI_ENV=PROD
KHALTI_SECRET_KEY=live_secret_key_YOUR_KHALTI_SECRET_KEY
KHALTI_PUBLIC_KEY=live_public_key_YOUR_KHALTI_PUBLIC_KEY
```

---

## 4. Credit / Debit Card Gateway Setup (Visa / MasterCard)

For direct in-app credit and debit card processing in Nepal, Curovya supports integration with NIBL / Himalayan Bank / Fonepay Card Gateway or Stripe.

### Step 4.1: Register Card Gateway Merchant Account
1. Partner with your acquiring bank (e.g. NIBL Payment Gateway / Fonepay / Stripe).
2. Complete PCI-DSS merchant compliance verification.

### Step 4.2: Configure Card Gateway Environment Variables
In `backend-node/.env`:

```env
# Card Gateway Production Configuration
CARD_GATEWAY_ENV=PROD
CARD_GATEWAY_MERCHANT_ID=YOUR_CARD_MERCHANT_ID
CARD_GATEWAY_SECRET=YOUR_CARD_GATEWAY_SECRET
```

---

## 5. Complete Production `backend-node/.env` Template

Create or update `/Users/mac/Desktop/Curovya/backend-node/.env`:

```env
# Server Configuration
NODE_ENV=production
PORT=8000
CLUSTER_MODE=true

# MongoDB Configuration
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/curovya?retryWrites=true&w=majority
DB_NAME=curovya
MONGO_POOL_SIZE=100

# Redis Caching (Optional)
REDIS_URL=redis://localhost:6379

# JWT Security
JWT_SECRET=YOUR_RANDOM_SECURE_64_CHAR_JWT_SECRET
ACCESS_TOKEN_MINUTES=1440

# Public Domain API URL
PUBLIC_BASE_URL=https://api.hamrodoctor.np

# eSewa Configuration
ESEWA_ENV=PROD
ESEWA_MERCHANT_CODE=YOUR_PRODUCTION_MERCHANT_CODE
ESEWA_SECRET_KEY=YOUR_PRODUCTION_SECRET_KEY

# Khalti Configuration
KHALTI_ENV=PROD
KHALTI_SECRET_KEY=live_secret_key_YOUR_KHALTI_SECRET_KEY
KHALTI_PUBLIC_KEY=live_public_key_YOUR_KHALTI_PUBLIC_KEY

# Card Gateway Configuration
CARD_GATEWAY_ENV=PROD
CARD_GATEWAY_MERCHANT_ID=YOUR_CARD_MERCHANT_ID
CARD_GATEWAY_SECRET=YOUR_CARD_GATEWAY_SECRET

# CORS Configuration
CORS_ORIGIN=https://app.hamrodoctor.np,curovyapatient://*
CORS_CREDENTIALS=true
```

---

## 6. Frontend Environment Configuration (`apps/patient/.env.production`)

Create or update `/Users/mac/Desktop/Curovya/apps/patient/.env.production`:

```env
EXPO_PUBLIC_BACKEND_URL=https://api.hamrodoctor.np
EXPO_USE_FAST_RESOLVER="1"
```

---

## 7. Production Verification & Go-Live Checklist

- [ ] **Database Connection**: Ensure `MONGO_URL` points to a high-availability MongoDB Atlas production cluster.
- [ ] **Public Domain & SSL**: Ensure `PUBLIC_BASE_URL` uses valid HTTPS (SSL certificate installed).
- [ ] **Webhook Endpoints**: Confirm that eSewa, Khalti, and Card gateways can reach `https://api.hamrodoctor.np/api/payments/verify`.
- [ ] **Testing Live Flow**:
  1. Open Patient App -> Navigate to **HamroDoctor Plus**.
  2. Select payment method (eSewa / Khalti / Card).
  3. Perform a small live test transaction (e.g. Rs 199).
  4. Confirm that the in-app modal closes cleanly and the Plus badge displays **ACTIVE • Renews [Date]**.
  5. Check MongoDB Atlas `users` collection to confirm `user.subscription` contains active subscription details.

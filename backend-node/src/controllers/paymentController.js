const Transaction = require('../models/Transaction');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Slot = require('../models/Slot');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { generateId, formatDate, formatTime, generateBookingId } = require('../utils/helpers');
const config = require('../config');
const logger = require('../utils/logger');

const PLUS_PLAN = {
  id: 'plus_monthly',
  name: 'HamroDoctor Plus',
  price: 199,
  currency: 'NPR',
  period: 'monthly',
  features: [
    'Free follow-ups within 7 days',
    'Priority booking with instant confirmation',
    '24×7 doctor chat support',
    '20% off on all lab tests',
    'Free ambulance dispatch (up to 5 km)',
  ],
};

/**
 * Get eSewa form URL
 */
const getEsewaFormUrl = () => {
  const isProd = config.esewaEnv === 'PROD';
  return isProd
    ? 'https://epay.esewa.com.np/api/epay/main/v2/form'
    : 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
};

/**
 * Get eSewa status URL
 */
const getEsewaStatusUrl = () => {
  const isProd = config.esewaEnv === 'PROD';
  return isProd
    ? 'https://epay.esewa.com.np/api/epay/transaction/status/'
    : 'https://rc-epay.esewa.com.np/api/epay/transaction/status/';
};

/**
 * Generate eSewa signature
 */
const generateEsewaSignature = (totalAmount, txUuid, productCode) => {
  const crypto = require('crypto');
  const message = `total_amount=${totalAmount},transaction_uuid=${txUuid},product_code=${productCode}`;
  const digest = crypto
    .createHmac('sha256', config.esewaSecretKey)
    .update(message)
    .digest();
  return Buffer.from(digest).toString('base64');
};

/**
 * Initiate payment
 */
const initiatePayment = asyncHandler(async (req, res) => {
  const { use_case, return_url, doctor_id, slot_id, consultation_type, patient_details } = req.body;

  const txUuid = generateId();
  let amount;

  if (use_case === 'subscription') {
    amount = PLUS_PLAN.price;
  } else {
    if (!doctor_id || !slot_id) {
      throw new ApiError(400, 'doctor_id and slot_id required for appointment');
    }

    const doctor = await Doctor.findOne({ id: doctor_id }).lean();
    const slot = await Slot.findOne({ id: slot_id, doctor_id }).lean();

    if (!doctor || !slot) {
      throw new ApiError(404, 'Doctor or slot not found');
    }

    if (slot.is_booked) {
      throw new ApiError(400, 'Slot already booked');
    }

    // Apply platform fee
    amount = doctor.consultation_fee + 30;
  }

  // Create transaction record
  await Transaction.create({
    transaction_uuid: txUuid,
    user_id: req.user.sub,
    amount,
    use_case,
    status: 'pending',
    return_url,
    doctor_id,
    slot_id,
    consultation_type,
    patient_details,
  });

  const checkoutUrl = `${config.publicBaseUrl}/api/payments/checkout/${txUuid}`;

  logger.info('Payment initiated', { txUuid, use_case, amount, userId: req.user.sub });

  res.json({
    success: true,
    checkout_url: checkoutUrl,
    transaction_uuid: txUuid,
    amount,
  });
});

/**
 * Payment checkout HTML page
 */
const paymentCheckout = asyncHandler(async (req, res) => {
  const { tx_uuid } = req.params;

  const transaction = await Transaction.findOne({ transaction_uuid: tx_uuid }).lean();
  if (!transaction) {
    throw new ApiError(404, 'Transaction not found');
  }

  const amountStr = transaction.amount.toFixed(2).replace(/\.00$/, '');
  const signature = generateEsewaSignature(amountStr, tx_uuid, config.esewaMerchantCode);
  const successUrl = `${config.publicBaseUrl}/api/payments/verify?tx_uuid=${tx_uuid}`;
  const failureUrl = `${config.publicBaseUrl}/api/payments/failure?tx_uuid=${tx_uuid}`;
  const formUrl = getEsewaFormUrl();

  const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>Redirecting to eSewa</title>
    <style>
      body { font-family: -apple-system, sans-serif; text-align: center; padding: 60px 20px; color:#333; }
      .spin { display:inline-block; width:44px; height:44px; border:4px solid #DC143C; border-top-color:transparent; border-radius:50%; animation: sp 0.8s linear infinite; }
      @keyframes sp { to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <div class="spin"></div>
    <h3>Redirecting to eSewa…</h3>
    <p>Amount: Rs ${amountStr}</p>
    <form id="f" action="${formUrl}" method="POST">
      <input type="hidden" name="amount" value="${amountStr}"/>
      <input type="hidden" name="tax_amount" value="0"/>
      <input type="hidden" name="total_amount" value="${amountStr}"/>
      <input type="hidden" name="transaction_uuid" value="${tx_uuid}"/>
      <input type="hidden" name="product_code" value="${config.esewaMerchantCode}"/>
      <input type="hidden" name="product_service_charge" value="0"/>
      <input type="hidden" name="product_delivery_charge" value="0"/>
      <input type="hidden" name="success_url" value="${successUrl}"/>
      <input type="hidden" name="failure_url" value="${failureUrl}"/>
      <input type="hidden" name="signed_field_names" value="total_amount,transaction_uuid,product_code"/>
      <input type="hidden" name="signature" value="${signature}"/>
    </form>
    <script>document.getElementById('f').submit();</script>
  </body>
</html>`;

  res.set('Content-Type', 'text/html');
  res.send(html);
});

/**
 * Finalize payment after verification
 */
const finalizePayment = asyncHandler(async (transaction) => {
  const userId = transaction.user_id;

  if (transaction.use_case === 'subscription') {
    const now = new Date();
    const exp = new Date(now);
    exp.setDate(exp.getDate() + 30);

    await User.findByIdAndUpdate(userId, {
      subscription: {
        active: true,
        plan: PLUS_PLAN.name,
        price: PLUS_PLAN.price,
        payment_method: 'esewa',
        started_at: now,
        expires_at: exp,
        transaction_uuid: transaction.transaction_uuid,
      },
    });

    return `&plan=plus&expires_at=${exp.toISOString()}`;
  }

  // Appointment booking
  const slot = await Slot.findOne({ id: transaction.slot_id, doctor_id: transaction.doctor_id }).lean();
  const doctor = await Doctor.findOne({ id: transaction.doctor_id }).lean();

  if (!slot || slot.is_booked || !doctor) {
    return null;
  }

  const sameDayCount = await Appointment.countDocuments({ doctor_id: transaction.doctor_id, date: slot.date });
  const tokenNumber = sameDayCount + 5;
  const currentServing = Math.max(1, tokenNumber - Math.floor(Math.random() * 3) - 2);

  const patient = await User.findOne({ id: userId }).select('-password_hash').lean() || {};

  const appointment = await Appointment.create({
    id: generateId(),
    booking_id: generateBookingId(),
    token_number: tokenNumber,
    patient_id: userId,
    doctor_id: doctor.id,
    doctor_name: doctor.name,
    doctor_specialty: doctor.specialty,
    doctor_photo_url: doctor.photo_url,
    clinic_name: doctor.clinic_name,
    clinic_address: doctor.clinic_address,
    date: slot.date,
    time: slot.time,
    consultation_type: transaction.consultation_type || 'clinic',
    consultation_fee: doctor.consultation_fee,
    payment_method: 'esewa',
    payment_status: 'paid',
    status: 'confirmed',
    queue_status: 'waiting',
    current_serving: currentServing,
    patient_details: transaction.patient_details || {
      full_name: patient.full_name || 'Patient',
      relation: 'Self',
    },
    transaction_uuid: transaction.transaction_uuid,
  });

  await Slot.findByIdAndUpdate(slot.id, { is_booked: true });

  return `&appointment_id=${appointment.id}`;
});

/**
 * Verify payment
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { tx_uuid } = req.query;
  const { data } = req.query;

  const transaction = await Transaction.findOne({ transaction_uuid: tx_uuid }).lean();
  if (!transaction) {
    throw new ApiError(404, 'Transaction not found');
  }

  const returnUrl = transaction.return_url;

  // Try server-to-server verification
  let verified = false;
  try {
    const axios = require('axios');
    const statusUrl = getEsewaStatusUrl();
    const params = {
      product_code: config.esewaMerchantCode,
      total_amount: transaction.amount.toFixed(2).replace(/\.00$/, ''),
      transaction_uuid: tx_uuid,
    };

    const response = await axios.get(statusUrl, { params, timeout: 15000 });
    if (response.status === 200 && response.data.status === 'COMPLETE') {
      verified = true;
    }
  } catch (error) {
    logger.error('eSewa S2S verification failed:', error);
  }

  // Fallback to decoded payload for UAT
  if (!verified && data) {
    try {
      const decoded = JSON.parse(Buffer.from(data + '==', 'base64').toString());
      if (decoded.status === 'COMPLETE' && decoded.transaction_uuid === tx_uuid) {
        verified = true;
      }
    } catch (error) {
      logger.error('eSewa payload decode failed:', error);
    }
  }

  if (!verified) {
    await Transaction.findByIdAndUpdate(transaction._id, { status: 'failed' });
    return res.redirect(`${returnUrl}?status=failure&tx_uuid=${tx_uuid}`);
  }

  await Transaction.findByIdAndUpdate(transaction._id, { status: 'completed' });
  const extra = await finalizePayment(transaction) || '';

  logger.info('Payment verified successfully', { txUuid, userId: transaction.user_id });

  res.redirect(`${returnUrl}?status=success&tx_uuid=${tx_uuid}${extra}`);
});

/**
 * Payment failure
 */
const paymentFailure = asyncHandler(async (req, res) => {
  const { tx_uuid } = req.query;

  const transaction = await Transaction.findOne({ transaction_uuid: tx_uuid });
  if (transaction) {
    await Transaction.findByIdAndUpdate(transaction._id, { status: 'failed' });
  }

  const returnUrl = transaction?.return_url || '/';
  res.redirect(`${returnUrl}?status=failure&tx_uuid=${tx_uuid}`);
});

/**
 * Get payment status
 */
const getPaymentStatus = asyncHandler(async (req, res) => {
  const { tx_uuid } = req.params;

  const transaction = await Transaction.findOne({
    transaction_uuid: tx_uuid,
    user_id: req.user.sub,
  }).lean();

  if (!transaction) {
    throw new ApiError(404, 'Transaction not found');
  }

  res.json({
    success: true,
    transaction,
  });
});

/**
 * Get subscription plan
 */
const getSubscriptionPlan = asyncHandler(async (req, res) => {
  res.json(PLUS_PLAN);
});

/**
 * Get my subscription
 */
const getMySubscription = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user.sub;
  const user = await User.findOne({ id: userId }).lean();
  const subscription = user?.subscription || {};

  let active = false;
  if (subscription.expires_at) {
    const exp = new Date(subscription.expires_at);
    active = exp > new Date();
  }

  res.json({
    active,
    plan: subscription.plan || PLUS_PLAN.name,
    price: PLUS_PLAN.price,
    expires_at: subscription.expires_at || null,
    started_at: subscription.started_at || null,
  });
});

/**
 * Subscribe to plan
 */
const subscribe = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user.sub;
  const { payment_method = 'esewa' } = req.body;

  const now = new Date();
  const exp = new Date(now);
  exp.setDate(exp.getDate() + 30);

  const subscription = {
    active: true,
    plan: PLUS_PLAN.name,
    price: PLUS_PLAN.price,
    payment_method,
    started_at: now,
    expires_at: exp,
  };

  await User.findOneAndUpdate({ id: userId }, { subscription });

  logger.info('User subscribed', { userId, plan: PLUS_PLAN.name });

  res.json({
    active: true,
    plan: PLUS_PLAN.name,
    price: PLUS_PLAN.price,
    started_at: now,
    expires_at: exp,
  });
});

/**
 * Cancel subscription
 */
const cancelSubscription = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user.sub;
  await User.findOneAndUpdate({ id: userId }, { $unset: { subscription: '' } });

  logger.info('User cancelled subscription', { userId });

  res.json({
    active: false,
    plan: PLUS_PLAN.name,
    price: PLUS_PLAN.price,
  });
});


module.exports = {
  initiatePayment,
  paymentCheckout,
  verifyPayment,
  paymentFailure,
  getPaymentStatus,
  getSubscriptionPlan,
  getMySubscription,
  subscribe,
  cancelSubscription,
};

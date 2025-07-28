require('dotenv').config();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const twilio = require('twilio');

// Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Helper: generate a 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: Validate input
function validateInput(fields, res) {
  const errors = [];

  // Email
  if (!fields.email || !/^\S+@\S+\.\S+$/.test(fields.email)) {
    errors.push({ field: 'email', msg: 'Invalid email' });
  }

  // Mobile
  if (!fields.mobile || !/^\+?[1-9]\d{7,14}$/.test(fields.mobile)) {
    errors.push({ field: 'mobile', msg: 'Invalid mobile number' });
  }

  // OTP (only for verifyOtp)
  if (fields.otp !== undefined) {
    if (!/^\d{6}$/.test(fields.otp)) {
      errors.push({ field: 'otp', msg: 'OTP must be 6 digits' });
    }
  }

  if (errors.length > 0) {
    res.status(400).json({ errors });
    return false;
  }
  return true;
}

/**
 * 1) Login/Register and Send OTP
 */
exports.loginOrRegister = async (req, res) => {
  const { email, mobile } = req.body;

  // Validate inputs
  if (!validateInput({ email, mobile }, res)) return;

  try {
    // Find or create user
    let user = await User.findOne({ email, mobile });
    if (!user) user = await User.create({ email, mobile });

    // Generate OTP and expiry
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Send OTP via Twilio SMS
    await client.messages.create({
      body: `Your verification code is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: mobile,
    });

    res.json({ message: 'OTP sent to your mobile phone' });
  } catch (err) {
    console.error('Error in loginOrRegister:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * 2) Verify OTP and Issue JWT
 */
exports.verifyOtp = async (req, res) => {
  const { email, mobile, otp } = req.body;

  // Validate inputs
  if (!validateInput({ email, mobile, otp }, res)) return;

  try {
    const user = await User.findOne({ email, mobile });
    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Clear OTP
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Issue JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.json({ token });
  } catch (err) {
    console.error('Error in verifyOtp:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * 3) Middleware: JWT Authentication
 */
exports.requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

require('dotenv').config();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');

// --- Nodemailer Transporter (Gmail via STARTTLS on 587) ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Helper: generate a 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: Validate input (email + optional otp)
function validateInput(fields, res) {
  const errors = [];

  // Email
  if (!fields.email || !/^\S+@\S+\.\S+$/.test(fields.email)) {
    errors.push({ field: 'email', msg: 'Invalid email' });
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

async function sendOtpEmail(to, otp) {
  const brand = 'Zexa';

  // Put Logo.jpeg in: backend/assets/Logo.jpeg  (adjust if needed)
  const logoPath = path.join(__dirname, '..', 'Logo.jpeg');
  const hasLogo = fs.existsSync(logoPath);

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji'; padding:24px; color:#111827;">
      ${hasLogo ? `
        <div style="margin-bottom:16px;">
          <img src="cid:brand-logo" alt="${brand} Logo" style="height:48px; width:auto; display:block;" />
        </div>` : ''
      }
      <h2 style="margin:0 0 8px 0;">Your ${brand} verification code</h2>
      <p style="color:#374151;margin:0 0 16px 0;">Use the code below to finish signing in.</p>
      <div style="font-size:32px; letter-spacing:8px; font-weight:700; padding:16px 24px; border:1px solid #e5e7eb; border-radius:12px; display:inline-block;">
        ${otp}
      </div>
      <p style="color:#6b7280;margin:16px 0 0 0;">This code expires in 10 minutes. If you didn’t request it, you can ignore this email.</p>
    </div>
  `;

  const text = `Your ${brand} verification code is ${otp}.
This code expires in 10 minutes. If you didn’t request it, you can ignore this email.`;

  await transporter.sendMail({
    from: `"${brand} Accounts" <${process.env.SMTP_USER}>`,
    to,
    subject: `${brand} Verification Code: ${otp}`,
    html,
    text,
    ...(hasLogo && {
      attachments: [
        {
          filename: 'Logo.jpeg',
          path: logoPath,
          cid: 'brand-logo', // reference in <img src="cid:brand-logo">
        },
      ],
    }),
  });
}

/**
 * 1) Login / Register and send OTP (EMAIL ONLY)
 *    Route: POST /auth/login
 *    Body: { email }
 */
exports.loginOrRegister = async (req, res) => {
  // normalize email (lowercase/trim)
  const emailRaw = req.body.email;
  const email = typeof emailRaw === 'string' ? emailRaw.toLowerCase().trim() : emailRaw;
  const { mobile } = req.body;

  if (!validateInput({ email }, res)) return;

  // optional mobile validation (accept E.164 or 10-digit India)
  if (mobile) {
    const e164 = /^\+?[1-9]\d{7,14}$/;
    const in10 = /^\d{10}$/;
    if (!e164.test(mobile) && !in10.test(mobile)) {
      return res.status(400).json({ error: 'Invalid mobile number format' });
    }
  }

  try {
    // find or create by email only
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        ...(mobile ? { mobile } : {}),
      });
    } else if (mobile && user.mobile !== mobile) {
      // update/overwrite stored mobile if new one is provided
      user.mobile = mobile;
      await user.save();
    }

    // Generate OTP and expiry (10 minutes)
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Send OTP via email
    await sendOtpEmail(email, otp);

    // Return richer payload (include email & mobile)
    res.json({
      message: 'OTP sent to your email address',
      userId: user._id,
      email: user.email,
      mobile: user.mobile || null,
    });
  } catch (err) {
    console.error('Error in loginOrRegister:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * 2) Verify OTP and issue JWT
 *    Route: POST /auth/verify-otp
 *    Body: { email, otp }
 */
exports.verifyOtp = async (req, res) => {
  // normalize email
  const emailRaw = req.body.email;
  const email = typeof emailRaw === 'string' ? emailRaw.toLowerCase().trim() : emailRaw;
  const { otp } = req.body;

  if (!validateInput({ email, otp }, res)) return;

  try {
    const user = await User.findOne({ email });
    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Clear OTP fields
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Issue JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    // Return token + user basics
    res.json({
      token,
      userId: user._id,
      email: user.email,
      mobile: user.mobile || null,
    });
  } catch (err) {
    console.error('Error in verifyOtp:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * 3) Middleware: JWT authentication
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

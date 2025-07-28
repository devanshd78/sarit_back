const express = require('express');
const ctrl = require('../controllers/authController');

const router = express.Router();

// Send OTP
router.post('/login', ctrl.loginOrRegister);

// Verify OTP
router.post('/verify-otp', ctrl.verifyOtp);

module.exports = router;

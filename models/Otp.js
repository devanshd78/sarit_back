const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema({
  identifier: { type: String, required: true },  // email or mobile
  code:       { type: String, required: true },
  expiresAt:  { type: Date, required: true },
}, { timestamps: true });

// auto-delete expired codes
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', OtpSchema);

// models/User.js
const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
  line1:   { type: String, trim: true },
  line2:   { type: String, trim: true },
  city:    { type: String, trim: true },
  state:   { type: String, trim: true },
  pincode: { type: String, trim: true },
  country: { type: String, trim: true, default: 'India' },
}, { _id: false });

const UserSchema = new mongoose.Schema(
  {
    // ✅ PHASE 1 (email-only auth)
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    mobile: { type: String, trim: true },

    otp:        { type: String, trim: true },
    otpExpires: { type: Date },

    // PHASE 2
    username: { type: String, trim: true, default: '' },
    address:  { type: AddressSchema, default: {} },
  },
  { timestamps: true }
);

// Safety: ensure unique index on email exists
UserSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', UserSchema);

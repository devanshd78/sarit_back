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

const UserSchema = new mongoose.Schema({
  // PHASE 1: only these two are required at signup
  email:      { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  mobile:     { type: String, unique: true, sparse: true, trim: true },

  // OTP authentication fields
  otp:         { type: String, trim: true },
  otpExpires:  { type: Date },

  // PHASE 2: added later
  username:   { type: String, trim: true, default: '' },
  address:    { type: AddressSchema, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);

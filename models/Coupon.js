const mongoose = require('mongoose');

const CouponCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0,
  },
  expiresAt: {
    type: Date,
  },
  usageLimit: {
    type: Number,
    default: 0, // 0 = unlimited
    min: 0,
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  active: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('CouponCode', CouponCodeSchema);

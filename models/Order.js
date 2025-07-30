// models/Order.js

const mongoose = require('mongoose');

/**
 * ---------------------------------------------------------------------------
 * Sub‑schemas
 * ---------------------------------------------------------------------------
 */
const AddressSchema = new mongoose.Schema({
  firstName: String,
  lastName: { type: String, required: true },
  address: { type: String, required: true },
  apartment: String,

  city: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    name: { type: String, required: true },
  },
  state: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'State', required: true },
    name: { type: String, required: true },
  },

  pin: { type: String, required: true },
  phone: { type: String, required: true },
}, { _id: false });

const ItemSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, ref: 'BagCollection', required: true },
  bagName: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
}, { _id: false });

const ShippingChoiceSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  cost: { type: Number, required: true },
}, { _id: false });

const CouponAppliedSchema = new mongoose.Schema({
  code: { type: String, required: true },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true }, // e.g. 10 (10%) or 250 (₹250)
  discountAmount: { type: Number, required: true }, // actual rupee discount on this order
}, { _id: false });

/**
 * ---------------------------------------------------------------------------
 * Order Schema
 * ---------------------------------------------------------------------------
 */
const OrderSchema = new mongoose.Schema({

  orderId: {
    type: String,
    required: true,
    unique: true,            // DB‑level guarantee
    index: true,
  },
  
  items: [ItemSchema],

  contact: {
    email: { type: String, required: true },
    subscribe: { type: Boolean, default: false },
  },

  shippingAddress: { type: AddressSchema, required: true },
  billingAddress: { type: AddressSchema },  // optional if same‑as‑shipping

  paymentMethod: { type: String, enum: ['gateway', 'cod'], required: true },
  // shippingMethod:  { type: ShippingChoiceSchema, required: true },

  // Pricing breakdown
  subtotal: { type: Number, required: true }, // before tax & shipping
  taxes: { type: Number, required: true },
  shippingCost: { type: Number, required: true },
  grossTotal: { type: Number, required: true }, // subtotal + taxes + shipping

  // Discount / coupon
  coupon: CouponAppliedSchema, // null if none applied
  discount: { type: Number, required: true, default: 0 },

  total: { type: Number, required: true }, // final payable amount

  status: { type: String, default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);

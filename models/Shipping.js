// models/ShippingMethod.js
const mongoose = require('mongoose');

const MethodSchema = new mongoose.Schema({
  id:    { type: String, required: true },
  label: { type: String, required: true },
  cost:  { type: Number, required: true },
}, { _id: false });

const ShippingMethodSchema = new mongoose.Schema({
  country:   { type: String, required: true, index: true },
  pinRegex:  { type: String },            // optional RegExp string to match ZIP/PIN codes
  methods:   [MethodSchema],
}, { timestamps: true });

module.exports = mongoose.model('ShippingMethod', ShippingMethodSchema);

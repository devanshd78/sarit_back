// models/ShippingMethod.js
const mongoose = require('mongoose');

const DEFAULT_METHODS = [
  { id: 'standard', label: 'Standard Delivery', cost: 0 },
  { id: 'express',  label: 'Express Delivery',  cost: 150 },
];

// a concise method schema
const MethodSchema = new mongoose.Schema(
  {
    id:    { type: String, required: true, enum: ['standard', 'express'] },
    label: { type: String, required: true, trim: true },
    cost:  { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

// singleton document: _id = "default"
const ShippingMethodSchema = new mongoose.Schema(
  {
    _id:     { type: String, default: 'default' },
    methods: {
      type: [MethodSchema],
      default: DEFAULT_METHODS,
      validate: {
        validator(arr) {
          if (!Array.isArray(arr) || arr.length !== 2) return false;
          const ids = arr.map(m => m.id).sort().join(',');
          return ids === 'express,standard';
        },
        message: 'Exactly two methods are required: standard and express.',
      },
    },
  },
  { timestamps: true, collection: 'shipping_methods' }
);

ShippingMethodSchema.statics.ensureSingleton = async function () {
  const exists = await this.findById('default');
  if (!exists) {
    return this.create({ _id: 'default', methods: DEFAULT_METHODS });
  }
  return exists;
};

ShippingMethodSchema.statics.DEFAULT_METHODS = DEFAULT_METHODS;

module.exports = mongoose.model('ShippingMethod', ShippingMethodSchema);

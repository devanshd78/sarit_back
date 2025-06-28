// models/Order.js
const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName:  { type: String, required: true },
  address:   { type: String, required: true },
  apartment: { type: String },
  city:      { type: String, required: true },
  state:     { type: String, required: true },
  pin:       { type: String, required: true },
  phone:     { type: String, required: true },
}, { _id: false });

const ItemSchema = new mongoose.Schema({
  _id:      { type: mongoose.Schema.Types.ObjectId, ref: 'BagCollection', required: true },
  bagName:  { type: String, required: true },
  price:    { type: Number, required: true },
  quantity: { type: Number, required: true },
}, { _id: false });

const ShippingChoiceSchema = new mongoose.Schema({
  id:    { type: String, required: true },
  label: { type: String, required: true },
  cost:  { type: Number, required: true },
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  items:           [ItemSchema],
  contact: {
    email:     { type: String, required: true },
    subscribe: { type: Boolean, default: false },
  },
  shippingAddress: { type: AddressSchema, required: true },
  billingAddress:  { type: AddressSchema },  // optional if same-as-shipping
  paymentMethod:   { type: String, enum: ['gateway','cod'], required: true },
  shippingMethod:  { type: ShippingChoiceSchema, required: true },
  subtotal:        { type: Number, required: true },
  taxes:           { type: Number, required: true },
  shippingCost:    { type: Number, required: true },
  total:           { type: Number, required: true },
  status:          { type: String, default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);

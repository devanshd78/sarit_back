const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  data: Buffer,
  contentType: String,
});

const DimensionsSchema = new mongoose.Schema({
  width: Number,     // e.g. 30
  height: Number,    // e.g. 25
  depth: Number,     // e.g. 10
  unit: { type: String, default: 'cm' },
}, { _id: false });

const WeightSchema = new mongoose.Schema({
  value: Number,     // e.g. 0.5
  unit: { type: String, default: 'kg' },
}, { _id: false });

const BagCollectionSchema = new mongoose.Schema({
  title:           String,
  bagName:         String,
  description:     String,       // short summary
  productDescription: String,    // rich/detailed description
  href:            String,
  type:            { type: Number, enum: [1, 2], default: 2 },
  price:           Number,
  compareAt:       Number,
  onSale:          { type: Boolean, default: false },
  rating:          Number,
  reviews:         { type: Number, default: 0 },
  deliveryCharge:  Number,
  quantity:        { type: Number, default: 1 },
  dimensions:      DimensionsSchema,
  weight:          WeightSchema,
  material:        String,       // e.g. "Canvas", "Leather"
  colors:          [String],     // e.g. ["red", "navy"]
  capacity:        String,       // e.g. "15L"
  brand:           String,
  features:        [String],     // e.g. ["Water-resistant", "Padded straps"]
  images:          [ImageSchema],
}, { timestamps: true });

module.exports = mongoose.model('BagCollection', BagCollectionSchema);

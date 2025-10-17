// models/Testimonial.js
const mongoose = require('mongoose');

const TestimonialSchema = new mongoose.Schema(
  {
    quote:   { type: String, required: true, trim: true },
    author:  { type: String, required: true, trim: true },
    rating:  { type: Number, required: true, min: 1, max: 5, default: 5 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Testimonial', TestimonialSchema);

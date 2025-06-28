// models/Slide.js
const mongoose = require('mongoose');

const SlideSchema = new mongoose.Schema({
  title:    { type: String, required: true, trim: true },
  subtitle: { type: String, trim: true },
  ctaHref:  { type: String, trim: true },
  ctaText:  { type: String, trim: true },

  // store the binary image
  image: {
    data: Buffer,
    contentType: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('Slide', SlideSchema);

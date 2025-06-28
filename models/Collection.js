// models/Collection.js
const mongoose = require('mongoose');

const CollectionSchema = new mongoose.Schema({
  title:    { type: String, required: true, trim: true },
  subtitle: { type: String, trim: true },
  href:     { type: String, required: true, trim: true },

  // store the binary image
  image: {
    data: Buffer,
    contentType: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('Collection', CollectionSchema);

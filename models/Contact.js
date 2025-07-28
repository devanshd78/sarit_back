const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  email:   { type: String, required: true, lowercase: true, trim: true },
  phone:   { type: String, trim: true },
  comment: { type: String, required: true, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('Contact', ContactSchema);
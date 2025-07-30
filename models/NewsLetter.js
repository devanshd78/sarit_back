// models/Newsletter.js
const mongoose = require("mongoose");

const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("Newsletter", newsletterSchema);

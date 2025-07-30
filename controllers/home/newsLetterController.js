// controllers/newsletterController.js
const Newsletter = require("../../models/NewsLetter");

exports.subscribe = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }
    // normalize
    const normalized = email.trim().toLowerCase();
    // check existing
    const exists = await Newsletter.findOne({ email: normalized });
    if (exists) {
      return res.status(200).json({ success: true, message: "Already subscribed." });
    }
    // create
    const subscriber = new Newsletter({ email: normalized });
    await subscriber.save();
    return res.status(201).json({ success: true, message: "Subscribed successfully." });
  } catch (err) {
    console.error("newsletter error:", err);
    if (err.code === 11000) {
      // unique index error
      return res.status(200).json({ success: true, message: "Already subscribed." });
    }
    return res.status(500).json({ success: false, message: "Server error subscribing." });
  }
};

exports.unsubscribe = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }
    const normalized = email.trim().toLowerCase();
    const result = await Newsletter.findOneAndDelete({ email: normalized });
    if (!result) {
      return res.status(404).json({ success: false, message: "Email not found." });
    }
    return res.json({ success: true, message: "Unsubscribed successfully." });
  } catch (err) {
    console.error("newsletter.unsubscribe error:", err);
    return res.status(500).json({ success: false, message: "Server error unsubscribing." });
  }
};

exports.getSubscribers = async (req, res) => {
  try {
    // you can add auth check here if needed
    const subs = await Newsletter.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: subs });
  } catch (err) {
    console.error("newsletter.getSubscribers error:", err);
    return res.status(500).json({ success: false, message: "Server error listing subscribers." });
  }
};

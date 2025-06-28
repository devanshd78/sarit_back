// controllers/shippingController.js
const ShippingMethod = require('../models/Shipping');

exports.getMethods = async (req, res) => {
  try {
    const { country, pin } = req.query;
    if (!country || !pin) {
      return res.status(400).json({ success: false, message: 'country and pin are required' });
    }

    // Find by country
    const doc = await ShippingMethod.findOne({ country });
    let methods = doc ? doc.methods : [];

    // If pinRegex is provided, filter by it
    if (doc && doc.pinRegex) {
      const re = new RegExp(doc.pinRegex);
      if (!re.test(pin)) {
        methods = []; // no methods if PIN doesn't match
      }
    }

    // Fallback default if none found
    if (!methods.length) {
      methods = [
        { id: 'intl', label: 'International Standard (10–15 days)', cost: 200 }
      ];
    }

    res.json({ success: true, methods });
  } catch (err) {
    console.error('shippingController.getMethods error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching shipping methods.' });
  }
};

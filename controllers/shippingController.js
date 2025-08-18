// controllers/shop/shippingController.js
const ShippingMethod = require('../models/Shipping');

const DEFAULTS = ShippingMethod.DEFAULT_METHODS;

/**
 * GET /api/shipping/available
 * Public: returns the two shipping methods.
 */
exports.getAvailableMethods = async (_req, res) => {
  try {
    const doc = await ShippingMethod.ensureSingleton();
    return res.json({
      success: true,
      source: doc ? 'db' : 'default',
      items: (doc?.methods?.length ? doc.methods : DEFAULTS).map(m => ({
        id: m.id, label: m.label, cost: m.cost,
      })),
    });
  } catch (err) {
    console.error('Error fetching shipping methods:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/shipping/config
 * Admin: read current config (two methods).
 */
exports.getConfig = async (_req, res) => {
  try {
    const doc = await ShippingMethod.ensureSingleton();
    return res.json({ success: true, item: doc });
  } catch (err) {
    console.error('Error reading shipping config:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/shipping/update
 * Admin: update labels/costs for the two methods.
 * Body can be either:
 *  A) { methods: [{ id:'standard', label:'...', cost:0 }, { id:'express', label:'...', cost:150 }] }
 *  B) { standard: { label?, cost? }, express: { label?, cost? } }
 */
exports.updateConfig = async (req, res) => {
  try {
    const doc = await ShippingMethod.ensureSingleton();

    let next = [...doc.methods];

    if (Array.isArray(req.body?.methods)) {
      // full replace path
      const incoming = req.body.methods.map(m => ({
        id: String(m.id),
        label: String(m.label || '').trim(),
        cost: Number(m.cost),
      }));

      // basic checks
      if (incoming.length !== 2) {
        return res.status(400).json({ success: false, message: 'Provide exactly two methods.' });
      }
      const ids = incoming.map(m => m.id).sort().join(',');
      if (ids !== 'express,standard') {
        return res.status(400).json({ success: false, message: 'Method ids must be "standard" and "express".' });
      }
      if (incoming.some(m => Number.isNaN(m.cost) || m.cost < 0 || !m.label)) {
        return res.status(400).json({ success: false, message: 'Each method needs a non-negative cost and label.' });
      }

      next = incoming;
    } else if (req.body?.standard || req.body?.express) {
      // partial patch path
      const byId = Object.fromEntries(next.map(m => [m.id, { ...m }]));
      if (req.body.standard) {
        if ('label' in req.body.standard) byId.standard.label = String(req.body.standard.label || '').trim();
        if ('cost' in req.body.standard)  byId.standard.cost  = Number(req.body.standard.cost);
      }
      if (req.body.express) {
        if ('label' in req.body.express) byId.express.label = String(req.body.express.label || '').trim();
        if ('cost' in req.body.express)  byId.express.cost  = Number(req.body.express.cost);
      }
      // Validate
      if (!byId.standard.label || byId.standard.cost < 0 || Number.isNaN(byId.standard.cost)) {
        return res.status(400).json({ success: false, message: 'Invalid standard method.' });
      }
      if (!byId.express.label || byId.express.cost < 0 || Number.isNaN(byId.express.cost)) {
        return res.status(400).json({ success: false, message: 'Invalid express method.' });
      }
      next = [byId.standard, byId.express];
    } else {
      return res.status(400).json({
        success: false,
        message: 'Provide either {methods:[...]} or {standard:{...}, express:{...}}.',
      });
    }

    doc.methods = next;
    await doc.save();

    return res.json({ success: true, item: doc });
  } catch (err) {
    console.error('Error updating shipping config:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/shipping/reset
 * Admin: reset back to defaults (Standard free, Express 150).
 */
exports.resetConfig = async (_req, res) => {
  try {
    const doc = await ShippingMethod.ensureSingleton();
    doc.methods = DEFAULTS;
    await doc.save();
    return res.json({ success: true, item: doc });
  } catch (err) {
    console.error('Error resetting shipping config:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

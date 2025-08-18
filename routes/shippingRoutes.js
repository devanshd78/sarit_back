const express = require('express');
const {
  getAvailableMethods,
  getConfig,
  updateConfig,
  resetConfig,
} = require('../controllers/shippingController');

// Plug your real admin/auth middleware:
const requireAdmin = (req, res, next) => { next(); };

const router = express.Router();

// Public
router.get('/available', getAvailableMethods);

// Admin
router.get('/config', requireAdmin, getConfig);
router.post('/update', requireAdmin, updateConfig);
router.post('/reset', requireAdmin, resetConfig);

module.exports = router;

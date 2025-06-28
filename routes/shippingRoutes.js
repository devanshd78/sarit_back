// routes/api/shipping.js
const express = require('express');
const router = express.Router();
const shippingController = require('../controllers/shippingController');

router.get('/', shippingController.getMethods);

module.exports = router;

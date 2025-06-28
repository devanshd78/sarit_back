// routes/api/checkout.js
const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');

router.post('/', checkoutController.createOrder);

module.exports = router;

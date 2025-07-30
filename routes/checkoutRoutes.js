// routes/api/checkout.js
const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');

router.post('/Create', checkoutController.createOrder);
router.post('/getlist', checkoutController.getOrderList);
router.post('/update-status', checkoutController.updateOrderStatus);
router.post('/getbyId', checkoutController.getOrderById); 

module.exports = router;

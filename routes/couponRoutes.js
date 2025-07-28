const express = require('express');
const ctrl = require('../controllers/couponController');

const router = express.Router();

// Create a new coupon
router.post('/create', ctrl.createCoupon);

// List coupons (paginated & searchable)
router.post('/getlist', ctrl.getCouponList);

// Fetch a single coupon by code
router.post('/:code/get', ctrl.getCoupon);

// Update a coupon by code
router.post('/:code/update', ctrl.updateCoupon);

// Delete a coupon by code
router.post('/:code/delete', ctrl.deleteCoupon);

// Apply a coupon to an order
router.post('/apply', ctrl.applyCoupon);

module.exports = router;

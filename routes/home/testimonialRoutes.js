// routes/testimonialRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllTestimonials,
  createTestimonial,
  deleteTestimonial
} = require('../../controllers/home/testimonialController');

// Public: list all testimonials
router.get('/getList', getAllTestimonials);

// Public: add a new testimonial
router.post('/create', createTestimonial);

// Admin: delete a testimonial
router.post('/delete', deleteTestimonial);

module.exports = router;

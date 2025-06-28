// routes/slideRoutes.js
const express = require('express');
const multer = require('multer');
const {
  getAllSlides,
  getSlideImage,
  createSlide,
  updateSlide,
  deleteSlide
} = require('../../controllers/home/slideController');

const upload = multer(); // memory storage

const router = express.Router();
router.get('/getlist', getAllSlides);
router.get('/:id/image', getSlideImage);
router.post('/create', upload.single('image'), createSlide);
router.post('/update', upload.single('image'), updateSlide);
router.post('/delete', deleteSlide);

module.exports = router;

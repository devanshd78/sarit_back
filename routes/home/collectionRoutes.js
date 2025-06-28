// routes/collectionRoutes.js
const express = require('express');
const multer = require('multer');
const {
  getAllCollections,
  getCollectionImage,
  createCollection,
  updateCollection,
  deleteCollection
} = require('../../controllers/home/collectionController');

const upload = multer();

const router = express.Router();
router.get('/getlist', getAllCollections);
router.get('/:id/image', getCollectionImage);
router.post('/create', upload.single('image'), createCollection);
router.post('/update', upload.single('image'), updateCollection);
router.post('/delete', deleteCollection);

module.exports = router;

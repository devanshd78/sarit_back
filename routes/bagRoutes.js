// routes/bagCollections.js
const express = require('express');
const multer = require('multer');
const upload = multer(); // in-memory
const ctrl = require('../controllers/bagController');
const router = express.Router();

router.get('/getlist', ctrl.getAll);
router.post('/create', upload.array('images', 5), ctrl.create);
router.post('/update', upload.array('images', 5), ctrl.update);
router.post('/delete', ctrl.delete);
router.get('/get/:id', ctrl.getById);

module.exports = router;

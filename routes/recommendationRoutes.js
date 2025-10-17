// routes/recommendations.js
const express = require('express');
const router = express.Router();
const rec = require('../controllers/recommendationController');

router.get('/browse', rec.browse);

module.exports = router;

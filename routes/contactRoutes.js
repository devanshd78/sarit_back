const express = require('express');
const ctrl = require('../controllers/contactController');

const router = express.Router();

// Contact form submission
router.post('/submit', ctrl.submitContact);
router.post('/list', ctrl.getContactList);

module.exports = router;

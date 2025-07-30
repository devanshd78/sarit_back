// routes/stateCityRoutes.js
const express = require('express');
const router  = express.Router();
const controller = require('../controllers/stateCityController');

// GET all states
router.get('/states', controller.getAllStates);

// GET cities by state
router.get('/:stateId/cities', controller.getCitiesByState);

module.exports = router;

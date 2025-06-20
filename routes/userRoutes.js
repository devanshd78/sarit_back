// routes/userRoutes.js
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const ctrl    = require('../controllers/userController');

// apply JWT protection to all /api/users routes
router.use(auth);

// REST endpoints:
router.get('/',          ctrl.getUserList);        // get list
router.get('/:id',       ctrl.getUserById);        // get by id
router.post('/details',  ctrl.addDetails);         // add details
router.post('/update-details', ctrl.updateDetails); // update details

module.exports = router;

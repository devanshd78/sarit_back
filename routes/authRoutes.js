const express = require('express');
const { body, validationResult } = require('express-validator');
const ctrl    = require('../controllers/authController');
const router  = express.Router();

router.post(
  '/login',
  body('email').isEmail(),
  body('mobile').matches(/^\+?[1-9]\d{7,14}$/),
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) {
      return res.status(400).json({ errors: errs.array() });
    }
    await ctrl.loginOrRegister(req, res);
  }
);

module.exports = router;

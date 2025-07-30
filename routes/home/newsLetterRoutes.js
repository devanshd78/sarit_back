// routes/newsletter.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../../controllers/home/newsLetterController");

router.post("/subscribe",   ctrl.subscribe);
router.post("/unsubscribe", ctrl.unsubscribe);
router.get( "/getlist", ctrl.getSubscribers);

module.exports = router;

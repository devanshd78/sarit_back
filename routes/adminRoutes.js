// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const { login, logout, dashboard } = require("../controllers/adminController");
const auth = require("../middleware/auth");

// Public: login
router.post("/login", login);

// Protected: logout and dashboard
router.post("/logout", auth, logout);
router.get("/dashboard", auth, dashboard);

module.exports = router;
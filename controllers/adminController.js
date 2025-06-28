// controllers/adminController.js
const jwt = require("jsonwebtoken");

// 👇 Hard-coded admin credentials
const ADMIN_USER = "admin";
const ADMIN_PASS = "SuperSecret123!";

const { JWT_SECRET, JWT_EXPIRES_IN = "1h" } = process.env;
if (!JWT_SECRET) throw new Error("Missing JWT_SECRET env var");

/**
 * POST /admin/login
 * Body: { username, password }
 * On success: returns { success: true, token }
 */
exports.login = (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ success: false, error: "Username and password are required" });
  }

  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return res
      .status(401)
      .json({ success: false, error: "Invalid username or password" });
  }

  const payload = { id: username, role: "admin" };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  // Return the raw token in JSON instead of setting a cookie
  res.json({ success: true, token });
};

/**
 * POST /admin/logout
 * No cookies to clear—just client side
 */
exports.logout = (_req, res) => {
  res.json({ success: true, message: "Logged out" });
};

/**
 * GET /admin/dashboard
 * Expects Authorization: Bearer <token>
 */
exports.dashboard = (req, res) => {
  // your auth middleware should read token from header,
  // verify it and set req.user
  res.json({
    success: true,
    message: `Welcome, Admin ${req.user.id}!`,
    timestamp: new Date().toISOString(),
  });
};

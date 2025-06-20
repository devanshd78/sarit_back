require('dotenv').config();
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

exports.loginOrRegister = async (req, res) => {
  const { email, mobile } = req.body;

  try {
    // 1) Try to find an existing user
    let user = await User.findOne({ email, mobile });

    // 2) If none exists, create one
    if (!user) {
      user = await User.create({ email, mobile });
    }

    // 3) Issue JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.json({ token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// (unchanged) middleware to protect routes
exports.requireAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided' });

  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

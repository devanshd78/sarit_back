// controllers/userController.js
const User = require('../models/User');

// GET /api/users/        → list all users
exports.getUserList = async (req, res) => {
  try {
    const users = await User.find().select('-__v');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/users/:id     → get by Mongo ObjectID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-__v');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(400).json({ error: 'Invalid user ID' });
  }
};

// POST /api/users/details → add delivery/contact details
exports.addDetails = async (req, res) => {
  try {
    const { username, address } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { username, address },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// POST /api/users/update-details → update existing details
exports.updateDetails = async (req, res) => {
  try {
    const updates = req.body; // e.g. { username, address }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

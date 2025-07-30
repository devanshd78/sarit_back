// controllers/stateCityController.js
const mongoose = require('mongoose');
const State = require('../models/State');
const City  = require('../models/City');

// 1. Return all states
exports.getAllStates = async (req, res) => {
  try {
    const states = await State.find().sort('name');
    res.json(states);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching states' });
  }
};

// 2. Return cities for a given state ID
exports.getCitiesByState = async (req, res) => {
  const { stateId } = req.params;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(stateId)) {
    return res.status(400).json({ message: 'Invalid state ID' });
  }

  try {
    const cities = await City.find({ stateId }).sort('name');
    res.json(cities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching cities' });
  }
};

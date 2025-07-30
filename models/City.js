// models/City.js
const mongoose = require('mongoose');

const CitySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  stateId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'State', 
    required: true 
  }
});

module.exports = mongoose.model('City', CitySchema);

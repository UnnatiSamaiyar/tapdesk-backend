const mongoose = require('mongoose');


const UpdatedServices = new mongoose.Schema({
  destinationName: {
    name: String,
  },
  pricing: String,
  testingStatus: String,
  status: {
    type: String,
    enum: ["Increase", "Decrease", "No Change"],
  },
  effectiveFrom: Date,
});



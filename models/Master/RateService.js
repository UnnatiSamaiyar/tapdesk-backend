const mongoose = require("mongoose");

const rateServiceSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    unique: true, // Prevent duplicates
  },
}, { timestamps: true });

module.exports = mongoose.model("RateService", rateServiceSchema);

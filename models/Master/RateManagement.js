const mongoose = require("mongoose");

const rateManagementSchema = new mongoose.Schema({
  company_name: { type: String, required: true, unique: true },
  services: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model("RateManagement", rateManagementSchema);

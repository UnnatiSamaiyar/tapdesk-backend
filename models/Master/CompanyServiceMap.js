const mongoose = require("mongoose");

const companyServiceMapSchema = new mongoose.Schema({
  company: { type: String, required: true },
  services: [{ type: String }], // Array of service names
}, { timestamps: true });

companyServiceMapSchema.index({ company: 1 }, { unique: true });

module.exports = mongoose.model("CompanyServiceMap", companyServiceMapSchema);
const mongoose = require('mongoose');

const masterServicesSchema = new mongoose.Schema({
  locationName: { type: String },
  dialCode: { type: String },
  platinumUSD: { type: String },
  status: { type: String },
  effectiveDate: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('MasterServices', masterServicesSchema);

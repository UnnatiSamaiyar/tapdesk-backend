const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  locationName: String,
  dialCode: String,
  platinumUSD: String,
  status: String,
  effectiveDate: String,
}, { timestamps: true });

function getDynamicModel(modelName) {
  const formattedName = modelName.charAt(0).toUpperCase() + modelName.slice(1);
  return mongoose.models[formattedName] || mongoose.model(formattedName, serviceSchema, formattedName);
}

module.exports = getDynamicModel;

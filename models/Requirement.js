const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const validatePricingRange = (value) => {
  if (!Array.isArray(value) || value.length !== 2) {
    return false;
  }
  return value.every((num) => typeof num === "number");
};

const requirementSchema = new Schema({
  destinationName: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Destination',
    required:true,
  },

  currency:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Currency',
    required:true,
  },
  qualityCategory: {
    type:mongoose.Schema.Types.ObjectId,
    ref:'QualityCategory',
    required: true,
  },
  product: {
    type: String,
    required:true,
    enum:["SMS","VOICE"]
  },
  pricingRange: {
    type: [Number],
    validate: [
      validatePricingRange,
      "Pricing range must be an array of exactly 2 numbers",
    ],
    required: true,
  },
  volume: {
    type: Number,
    required: true,
  },
  reqStatus: {
    type: String,
    enum: ["OPEN", "CLOSED"],
    default: "OPEN",
  },
  statusUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
  },
  remarks:{
    type:String,
    default:null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required:true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default:null,
  },
  status:{
    type: Boolean,
    default:true
    
  }
  

});

const Requirements = mongoose.model("Requirements", requirementSchema);

module.exports = Requirements;

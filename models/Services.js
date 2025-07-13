const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const validatePricingRange = (value) => {
  if (!Array.isArray(value) || value.length !== 2) {
    return false;
  }
  return value.every((num) => typeof num === "number");
};

const servicesSchema = new Schema({
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
  pricing: {
   type: String,
    required: true,
  },
  ghostPricing:{
    type: String,
    default:null
  },
  ghostVisible:{
    type:Boolean,
    default:false
  },
  testingStatus: {
    type: String,
    enum: ["NOT_YET_TESTED", "FAILED", "PASSED", "ASSIGNED_TO_NOC"],
    default: "NOT_YET_TESTED",
  },
  status:{
    type:Boolean,
    default:true,
  },
  isTopWrokingRoute:{
    type:Boolean,
    default:false,
  },
  isTopRunningRoute:{
    type:Boolean,
    default:false,
  },
  product: {
    type: String,
    required:true
  },
  // assignedTo: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'Employee',
  // },


  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'assignedToModel'
  },
  assignedToModel: {
    type: String,
    enum: ['Employee', 'EmployeeGroup']
  }
,

  mediaType:{
    type:String,
    required:true,
    enum:["CRTP" , "ORTP"]
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
});

const Services = mongoose.model('Services', servicesSchema);

module.exports = Services;

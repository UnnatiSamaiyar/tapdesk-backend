const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AccountSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    
  },
  address: {
    type: String,
    required: true
  },
  country:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Country',
    required: true
  },
  timeZone:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'TimeZone',
    required:true
  },
  companyName: { 
      type: String, 
  },
  ghostName:{
       type: String
  },
  billingEmail: String,
  salesEmail: String,
  skypeId:String,
  paymentCycle:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentCycle',
    default: null
  },
  
  currency:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Currency',
    default: null
  },

  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },

  accountType: {
    type:String,
    enum:["VOICE","SMS"],
    required: true
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
    type:Boolean,
    default:true,
  },
  remarks:{
    type:String
  }
});

const Account = mongoose.model('Account', AccountSchema);

module.exports = Account;

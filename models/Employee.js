const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const employeeSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique : true
  },
  phone: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true,
     
  },
  role: {
    type: String,
    enum: ['admin', 'Account Manager', 'NOC Manager'],
    default: null
  },
  productCategory: {
    type: String,
    enum: ['VOICE', 'SMS'], 
    default: null 
  },
  canEdit: {
    type: Boolean,
    default: false,
    select: false,
  },
  canView: {
    type: Boolean,
    default: false,
    select: false,
  },

  passwordResetToken:{
    type:String,
    default:null,
    select:false

  },

  passwordResetTokenExpiry:{
    type:Date,
    default:null,
    select:false

  },

  lastPasswordChangedAt:{
    type:Date,
    default:null,
    
  },

  createdAt: {
    type: Date,
    default: Date.now,
     
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
     
  },
  updatedAt: {
    type: Date,
    default: Date.now,
     
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default:null,
    
  },
  status:{
    type:Boolean,
    default:true,
     
  }
});

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;

const mongoose = require('mongoose');

const empGroupSchema = new mongoose.Schema({
 
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'Account Manager', 'NOC Manager'],
    default: "NOC Manager"
  },
  productCategory: {
    type: String,
    enum: ['VOICE', 'SMS'], 
    default: null ,
    required:true

  },
  empList:[
    {type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',}
  ],

  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default:null
  },
  status:{
    type:Boolean,
    default:true
  }

});

const EmployeeGroup = mongoose.model('EmployeeGroup', empGroupSchema);

module.exports = EmployeeGroup;

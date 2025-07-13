const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reportSchema = new Schema({
  
  companyName: {
    type: String,
    required: true
  },
  destination: {
    type: mongoose.Schema.Types.ObjectId,
    ref : 'Destination',
    required: true
  }, 
  type: {
    type: String,
    enum: ['vendor', 'customer'],
    required: true
  },
  remark: {
    type: String
  },
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

}, { timestamps: true });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;

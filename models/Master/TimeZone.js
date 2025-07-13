const mongoose = require('mongoose');

const timeZoneSchema = new mongoose.Schema({
 
  name: {
    type: String,
    required: true
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
    default: null
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

const TimeZone = mongoose.model('TimeZone', timeZoneSchema);

module.exports = TimeZone;

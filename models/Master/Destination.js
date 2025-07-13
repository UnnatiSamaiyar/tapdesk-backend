const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema({
 
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

const Destination = mongoose.model('Destination', destinationSchema);

module.exports = Destination;

const mongoose = require('mongoose');

const routingTaskThreadSchema = new mongoose.Schema({


  threadSubject:{
    type:String,
  },
  message: {
    type: String,
    required: true
  },
  attachments:[{ type: String }],

  task:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'RoutingTask',
    required: true,
   
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
  }
});

const Thread = mongoose.model('RoutingTaskThread', routingTaskThreadSchema);

module.exports = Thread;

const mongoose = require('mongoose');

const threadSchema = new mongoose.Schema({


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
    ref:'Task',
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
  },
  status:{
    type:Boolean,
    default:true
  }
});

const Thread = mongoose.model('Thread', threadSchema);

module.exports = Thread;

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const taskSchema = new mongoose.Schema({

  taskSubject:{
    type:String,
    required:true
  },

  service : {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Services',
    unique:true
  },

  // assignedTo: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'Employee',
  //   required:true
  // }
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'assignedToModel'
  },
  assignedToModel: {
    type: String,
    required: true,
    enum: ['Employee', 'EmployeeGroup']
  }
  
  ,
  assignedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required:true
  },

  taskStatus: {
    type: String,
    enum: ["PENDING", "IN_PROGRESS", "DONE"],
    default: "PENDING",
  },

  attachments: [String],

  priority: {
    type: Number,
    enum: [1,2,3],
    required: true
  },
  comments:{
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
  },
  status:{
    type:Boolean,
    default:true
  },


  
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
 
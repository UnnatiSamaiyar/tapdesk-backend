const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const supplierSchema = new mongoose.Schema({
  name: String,
  price: Number,
});

const routingTaskSchema = new mongoose.Schema({

taskSubject:{
    type:String,
    required:true
  },
customerName : {
    type: String  
  },
  destinationName:{
    type:String
  },
// destinationName:{
//   type: mongoose.Schema.Types.ObjectId,
//   ref: 'Destination',
// },
category:{
    type:String
  },
price:{
  type:Number
  },

  destinationName2:{
    type:String
  },
// destinationName2:{
//   type: mongoose.Schema.Types.ObjectId,
//   ref: 'Destination',
// },
price2:{
    type:Number
    },
 suppliers:[supplierSchema],
 assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'assignedToModel'
  },
  assignedToModel: {
    type: String,
    required: true,
    enum: ['Employee', 'EmployeeGroup']
  },
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
  remarks:{
    type: String
  },
  product:{
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

const Task = mongoose.model('RoutingTask', routingTaskSchema);

module.exports = Task;
 
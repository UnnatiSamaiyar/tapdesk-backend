// models/notificationModel.js

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    
    
    message: {
        type: String,
        required: true
    },
    product:{
        type:String,
        enum:["VOICE","SMS"],
        required:true
    },
    notificationType:{
        type:String,
        enum:["AC_CREATION","REQ_CREATION","TASK_CREATION","ROUTE_PASSED","NEW_MAPPING","ROUTING_TASK"],
        required:true
    },
    serviceId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Services',
    },
    accountId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
    },
    emitter:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    toShow:{
        type:[String],
        enum:["ALL_ADMIN","ALL_AM"],
        default:null
    },
    involvedEmp: [ {type: mongoose.Schema.Types.ObjectId,  ref: 'Employee'}]  ,
    readBy: [ {type: mongoose.Schema.Types.ObjectId,  ref: 'Employee'}]  ,
    


});


    //emplist with flag Y or N for all ready read or not

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;

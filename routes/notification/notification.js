
const express = require('express');
const router = express.Router();
const Notification = require('../../models/Notification');
const Employee = require('../../models/Employee');
const { verifyTokenAndRoles, verifyToken,verifyTokenAndAdmin } = require("../../utils/verifyToken");

 
// GET route to fetch all notifications
router.get('/notification',verifyToken, async (req, res) => {
    try {

        const requester = await Employee.findById(req.employee._id);
        if(!requester)
            return res.status(400).json({message:"Invalid Request"});
        
        let notification = [];
        if(requester.role==='admin'){

            notification =await Notification.find({toShow :"ALL_ADMIN" }).populate({
                path: 'emitter',
                select: '_id name'
              }).sort({createdAt: -1});
        
        }else if(requester.role==='Account Manager') {
            notification = await Notification.find({toShow :"ALL_AM",product: requester.productCategory}).populate({
                path: 'emitter',
                select: '_id name'
              }).sort({createdAt: -1});
        }else if(requester.role==='NOC Manager'){
            notification = await Notification.find({involvedEmp:requester._id,product: requester.productCategory} ).populate({
                path: 'emitter',
                select: '_id name'
              }).sort({createdAt: -1});
        }

        res.status(200).json(notification);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



// GET route to fetch all notifications
router.get('/notification/mapper',verifyToken, async (req, res) => {
    try {

        const requester = await Employee.findById(req.employee._id);
        if(!requester)
            return res.status(400).json({message:"Invalid Request"});
        
        let notification = [];
        if(requester.role==='admin'){

            notification =await Notification.find({notificationType:'NEW_MAPPING'}).populate({
                path: 'emitter',
                select: '_id name'
              }).sort({createdAt: -1});
        
        }else if(requester.role==='Account Manager') {
            notification = await Notification.find({product: requester.productCategory,notificationType:'NEW_MAPPING'}).populate({
                path: 'emitter',
                select: '_id name'
              }).sort({createdAt: -1});
        }else if(requester.role==='NOC Manager'){
            notification = await Notification.find({product: requester.productCategory,notificationType:'NEW_MAPPING'} ).populate({
                path: 'emitter',
                select: '_id name'
              }).sort({createdAt: -1});
        }

        res.status(200).json(notification);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



router.get('/notification/personal',verifyToken, async (req, res) => {
    try {

        const requester = await Employee.findById(req.employee._id);
        if(!requester)
            return res.status(400).json({message:"Invalid Request"});
        
        let notification = [];
        if(requester.role==='admin'){

            notification =await Notification.find({involvedEmp : requester._id }).populate({
                path: 'emitter',
                select: '_id name'
              }).sort({createdAt: -1});
        
        }else  {
            notification = await Notification.find({involvedEmp : requester._id ,product: requester.productCategory}).populate({
                path: 'emitter',
                select: '_id name'
              }).sort({createdAt: -1});
        } 

        res.status(200).json(notification);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



router.put('/notification/read/:id',verifyToken, async (req, res) => {
    try {

        const requester = await Employee.findById(req.employee._id);
        if(!requester)
            return res.status(400).json({message:"Invalid Request"});
        
        console.log(req.params.id);
        const noti = await Notification.findById(req.params.id);
        if(!noti)
            return res.status(400).json({message:"Notification not found"});

        await Notification.updateOne(
            { _id: noti._id },
            { $addToSet: { readBy: requester._id } }
          );
        

        res.status(200).json({message:"Marked Successfully"});
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

 



//  // Send notifications to assigned users
//  const assignedUsers = assignTo;
//  assignedUsers.forEach(user => {
//    wss.clients.forEach(client => {
//      if (client.username === user) {
//        client.send(JSON.stringify({ message: 'New task assigned to you', task: newTask }));
//      }
//    });
//  });


module.exports = router;


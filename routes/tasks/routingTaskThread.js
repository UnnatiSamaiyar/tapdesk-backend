const express = require("express");
const router = express.Router();
const Task = require("../../models/RoutingTask");
const Thread = require("../../models/RouttingTaskThread");
const Employee = require("../../models/Employee");
const { verifyToken,verifyTokenAndRoles } = require("../../utils/verifyToken");


const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/thread');
  },
  filename: (req, file, cb) => {
    // const ext = path.extname(file.originalname);
    // const fileName = `${Date.now()}${ext}`;
    cb(null, Date.now()+"_"+file.originalname);
  },
});
const upload = multer({ storage });


router.post("/routingTaskThread",verifyToken,upload.array('attached'), async (req, res) => {
  try {
     
    const {threadSubject, message, attached, task, createdBy } = req.body;

    const tsk  = await Task.findById(task);
    if(!tsk)
      return res.status(404).json({message:"No Task found"});

    const creator = await Employee.findById(createdBy);
    if(!creator)
      return res.status(404).json({message:"Thread creator not found"});

    const attachments=  req.files.map((file) => file.filename);

   
    const newThread = new Thread({
      threadSubject, message, attachments, task, createdBy 
    });

    const savedThread = await newThread.save();

    res.status(201).json(savedThread);

  } catch (error) {
    console.error("Error posting new thread:", error);
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/threadByroutingTask/:id",verifyToken, async (req, res) => {
  try {
    
    const {id} = req.params;
    const threads = await Thread.find({task:id}).populate({path:'createdBy',select:'_id name'});
    return res.status(200).json(threads);
    // if(!threads)
    //   {
    //     return res.status(200).json([]);
    //   }else
    //     return res.status(200).json(threads);
    // });
   

  } catch (error) {
    console.error("Error posting new thread:", error);
    res.status(500).json({ message: "Server error" });
  }
});


router.put('/routingTaskthreadDeleteAttachment/:threadId',verifyTokenAndRoles(["admin", "Account Manager"]), async (req, res) => {
  const {threadId  } = req.params;
 const{fileName, updatedBy, taskId} = req.body; 
 try{
   const thread = await Thread.findOne({ _id: threadId, attachments: { $in: [fileName] } });

   if(!thread){
     return res.status(404).json({message:"Thread with mentioned file not found"});
   }
   const uptBy = await Employee.findById(updatedBy);
   if(!uptBy){
     return res.status(404).json({message:"Attachment deleter employee not found"});
   }     
     const files = await fs.readdir("./uploads/thread");

     const matchingFiles = files.filter((file) => file === fileName);
   
     if (matchingFiles.length === 0) {
       return res.status(404).json({ message: 'File not found' });
     } else if (matchingFiles.length > 1) {
       return res.status(500).json({ message: 'Multiple files found, cannot delete' });
     }
   
     // Delete the file
     

   const result = await Thread.updateOne(
     { _id: threadId },
     { $pull: { attachments: fileName },
     $set: { updatedBy: updatedBy, updatedAt : new Date() } }
   );

   if(result?.modifiedCount){
    filePath = "./uploads/thread/" + fileName;
    fs.unlink(filePath);

    const threadUpdate = new Thread({
    threadSubject:"Update: Attachment deleted from Thread",
    message: fileName+" has been deleted from the Thread, By : "+  uptBy.name+" ["+uptBy.role+", "+ uptBy.email+", "+uptBy.phone +"] " ,
    task:taskId,
    createdBy:null });

    threadUpdate.save();
    res.status(200).json({message:"File deleted Successfully"});

   }else{
    res.status(404).json({message:"File not deleted Successfully"});

   }
   console.log(result);

    
 }catch(error){
   res.status(500).json({message:error.message});
 }


});




module.exports = router;

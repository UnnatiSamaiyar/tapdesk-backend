const router = require("express").Router();
const Task = require("../../models/Task");
const Employee = require("../../models/Employee");
const Services = require("../../models/Services");
const Requirement = require("../../models/Requirement")
const EmployeeGroup = require("../../models/Master/EmployeeGroup");
const { verifyTokenAndRoles, verifyToken } = require("../../utils/verifyToken");
const Thread = require("../../models/Thread");
const multer = require('multer');
const {getUserSocket} = require('../../utils/socketConfig');
const Notification = require("../../models/Notification");
const emailTransporter = require('../../utils/emailConfig');
const fs = require('fs').promises;
const {adminsEmails, upperPartHtml,lowerPartHtml } = require('../../utils/utilsMethod') 


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/task');
  },
  filename: (req, file, cb) => {
    // const ext = path.extname(file.originalname);
    // const fileName = `${Date.now()}${ext}`;
    cb(null, Date.now()+"_"+file.originalname);
  },
});
const upload = multer({ storage });



router.post("/task",verifyTokenAndRoles(["admin", "Account Manager"]),upload.array('attachments'),async(req,res)=>{

  try{
    const {taskSubject, service, assignedTo, assignedFrom, priority, comments, createdBy, groupFlag,assignedToGroup} = req.body;
    const ser = await Services.findById(service).populate({path:'accountId',select :'_id ghostName'});
    if(!ser)
      return res.status(404).json({message:"Service not found"});

    let assgnTo;
    if(groupFlag && groupFlag ==="Y" ){
        assgnTo = await EmployeeGroup.findById(assignedToGroup);
        if(!assgnTo)
          return res.status(404).json({message:"assignedTo Group not found"});
    }else if(groupFlag && groupFlag =="N"){
       assgnTo = await Employee.findById(assignedTo);
      if(!assgnTo)
        return res.status(404).json({message:"assignedTo Employee not found"});
  
    }else{
      res.status(400).json({message:"Issue occured, Group or Individual not able to decide"});
    }

    


    const assgnFrom = await Employee.findById(assignedFrom);
    if(!assgnFrom)
      return res.status(404).json({message:"assignedFrom Employee not found"});

   if(  req.employee.role!=='admin' && (ser.product === assgnTo.productCategory ===assgnFrom.productCategory)){
            return res.status(400).json({message:"Service, Assinger and Assignee must be of same product"});
        }else if ( req.employee.role==='admin' && (ser.product !== assgnTo.productCategory)){
            return res.status(400).json({message:"Service and Assignee must be of same product"});
        }


    const crtBy = await Employee.findById(createdBy);
    if(!crtBy)
      return res.status(404).json({message:"createdBy Employee not found"});

    const attachments=  req.files.map((file) => file.filename);

    const newObj = new Task({taskSubject, service, assignedTo:assgnTo._id, assignedFrom, attachments, priority, comments, createdBy,
      assignedToModel: (groupFlag==="N")?'Employee':'EmployeeGroup'
    });

    if(newObj)
      {

            const initialThread = new Thread({
              threadSubject:"Auto Thread Created: Task Assigned",
              message:"Task Assigned to : "+assgnTo.name+" ["+assgnTo.role+", "+ assgnTo?.email+", "+assgnTo?.phone +"] and  AssignedFrom: "+
              assgnFrom.name+" ["+assgnFrom.role+", "+ assgnFrom.email+", "+assgnFrom.phone +"] "
              ,
              task:newObj._id,
              createdBy:null
            
            });
            const savedThread = initialThread.save();

            ser.testingStatus="ASSIGNED_TO_NOC";
            ser.assignedTo=assgnTo._id;
            ser.assignedToModel= (groupFlag==="N")?'Employee':'EmployeeGroup';
            ser.updatedBy=createdBy;
            ser.updatedAt=new Date();
          const updatedService = await ser.save();
          const savedObj =await newObj.save();
          res.status(201).json(savedObj);

            let involvedList=[]
            let emailTOIds=[]
          if(groupFlag ==="Y"){
            involvedList= assgnTo.empList
            emailTOIds=assgnTo.empList;
          } else {
            involvedList.push(assgnTo._id)
            emailTOIds.push(assgnTo._id)
          }
          
            involvedList.push(req.employee._id) ;

          const notification=new Notification(
            {
              message:"New Task created and  Assigned to : "+assgnTo.name+" ["+assgnTo.role+"] and  AssignedFrom: "+
              assgnFrom.name+" ["+assgnFrom.role+", "+ assgnFrom.email+", "+assgnFrom.phone +"]" ,
              product: ser.product,
              notificationType: "TASK_CREATION",
              serviceId: ser._id,
              accountId: ser.accountId._id,
              emitter: req.employee._id,
              involvedEmp:involvedList,
              toShow:["ALL_ADMIN"]
              
            }
          );

      
        await notification.save();
            
         req.io.emit('admin', notification);
         const forAM = getUserSocket( req.employee._id.toString());
         if(ser.product==='VOICE'){
          if (forAM) {
            forAM.emit('AM_VOICE',notification);
         }}
         else  if(ser.product==='SMS'){
          if (forAM) {
            forAM.emit('AM_VOICE',notification);
         }
        }
             


         
         involvedList.forEach((item) => {
          console.log("entered--",item.toString());
          const userSocket = getUserSocket(item.toString());
          if (userSocket) {
            console.log("sent--",item.toString());

            userSocket.emit('personal', notification);
          }
         });
          
         const toEMailObj = await Employee.find({ _id: { $in: emailTOIds } }, 'email');
         const toEmaiidList = toEMailObj.map(employee => employee.email);

         const adminsEmailList =await adminsEmails ()
         adminsEmailList.push(assgnFrom.email);
         
         console.log(toEmaiidList);
         console.log(adminsEmailList);
         try{  
                const contentHtml =` <div class="header">
              <h1>Task Assigned ${ser.accountId.ghostName}</h1>
            </div>
                      <div class="content">
                          <p>Hi ,</p>
                          <p>Please check below task assigned to '${assgnTo.name}' for testing.</p>
                          <table class="details-table">
                        <tr>
                            <th>Subject:</th>
                            <td>${taskSubject}</td>
                        </tr>
                        <tr>
                            <th>Priority:</th>
                            <td>${ newObj.priority === 1?"HIGH":newObj.priority=== 2 ? "MEDIUM" :newObj.priority === 3?"LOW":"D"}</td>
                        </tr>
                        <tr>
                            <th>comments:</th>
                            <td>${comments}</td>
                        </tr>
                         
                        <tr>
                            <th>Assigned From:</th>
                            <td>${assgnFrom.name}</td>
                        </tr>
                    </table>
                          
                      </div> `
            
            
                      const html= upperPartHtml+contentHtml+lowerPartHtml
            
                  await emailTransporter.sendMail({
                    from: process.env.EMAIL_FROM,
                    to: toEmaiidList,
                   cc:adminsEmailList,
                    subject: `New Task Assigned ${ser.accountId.ghostName}`,
                    html: html,
                  });
                  
       
      
              } 
              catch (error) {
                console.error('Error sending email:', error.message);
              }
      
      }
         
         
     

  }catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message });
  }

});


router.get("/task",verifyToken,async (req,res)=>{


  try{
   
    const requester  = await Employee.findById(req.employee._id);
    
    if(!requester){
      return res.status(404).json({message: "Employee doest not exist"});
    }

   


    // if(requester.role==='admin'  && ( !requester?.productCategory ||requester?.productCategory ===null ) ){
    //   const allObj = await Task.find().populate("service assignedTo assignedFrom createdBy updatedBy");
    //   return res.status(200).json(allObj)
    // }else if( requester.productCategory==='VOICE'){

    //   const voiceServices = await Services.find({ product: 'VOICE' }, '_id');
    //   const voiceServiceIds = voiceServices.map(service => service._id);
    //   const voiceTasks = await Task.find({ service: { $in: voiceServiceIds } }).populate("service assignedTo assignedFrom createdBy updatedBy")
    //   return res.status(200).json(voiceTasks);
    //  }else if (requester.productCategory==='SMS'){
    //     const smsServices = await Services.find({ product: 'SMS' }, '_id');
    //     const smsServiceIds = smsServices.map(service => service._id);
    //     const smsTasks = await Task.find({ service: { $in: smsServiceIds } }).populate("service assignedTo assignedFrom createdBy updatedBy")
    //     return res.status(200).json(smsTasks);
    //  }


     let objList = []
     if(requester.role==='admin'  && ( !requester?.productCategory ||requester?.productCategory ===null )) {
    
      objList = await Task.aggregate([
        {
          $lookup: {
            from: "services",
            let: { serviceID: "$service" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$serviceID"] } } },
              { $project: { _id: 1, accountId: 1, product: 1 ,testingStatus:1 ,destinationName:1 /* include other fields as needed */ } }
            ],
            as: "service"
          }
        },
        {
          $unwind: "$service"
        },
       

        {
          $lookup: {
            from: "accounts",
            let: { accountId: "$service.accountId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$accountId"] } } },
              { $project: { _id: 1, status: 1, companyName: 1,ghostName:1 /* include other fields as needed */ } }
            ],
            as: "accountDetails"
          }
        },
        {
          $unwind: "$accountDetails"
        },
        {
          $match: {
            "accountDetails.status": true
          }
        },


        {
          $lookup: {
            from: "destinations",
            let: { desId: "$service.destinationName" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$desId"] } } },
              { $project: { _id: 1, name: 1 /* include other fields as needed */ } }
            ],
            as: "destinationsDetails"
          }
        },
        {
          $unwind: "$destinationsDetails"
        },
            
        {
          $lookup: {
            from: "employees",
            let: { assignedToID: "$assignedTo" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$assignedToID"] } } },
              { $project: { _id: 1, name: 1 /* include other fields as needed */ } }
            ],
            as: "assignedToEmployee"
          }
        },
        // Lookup for assignedToDetails from EmployeeGroup
        {
          $lookup: {
            from: "employeegroups",
            let: { assignedToID: "$assignedTo" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$assignedToID"] } } },
              { $project: { _id: 1, name: 1 /* include other fields as needed */ } }
            ],
            as: "assignedToEmployeeGroup"
          }
        },
        // Merge the results
        {
          $addFields: {
            assignedTo: {
              $cond: {
                if: { $eq: ["$assignedToModel", "Employee"] },
                then: { $arrayElemAt: ["$assignedToEmployee", 0] },
                else: { $arrayElemAt: ["$assignedToEmployeeGroup", 0] }
              }
            }
          }
        },

        {
          $lookup: {
            from: "employees",
            let: { empId: "$assignedFrom" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$empId"] } } },
              { $project: { _id: 1, name: 1 /* include other fields as needed */ } }
            ],
            as: "assignedFrom"
          }
        },
        {
          $unwind: "$assignedFrom"
        },


        {
          $lookup: {
            from: "employees",
            let: { empId: "$createdBy" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$empId"] } } },
              { $project: { _id: 1, name: 1 /* include other fields as needed */ } }
            ],
            as: "createdBy"
          }
        },
        {
          $unwind: "$createdBy"
        },


        {
          $lookup: {
            from: "employees",
            let: { empId: "$updatedBy" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$empId"] } } },
              { $project: { _id: 1, name: 1 /* include other fields as needed */ } }
            ],
            as: "updatedBy"
          }
        },
        {
          $unwind: {
            path: "$updatedBy",
            preserveNullAndEmptyArrays: true // if assignedTo could be null
          }
        },
        
        {
          $sort: { updatedAt: -1 }
        },

        {
          $project: {
            _id: 1,
          taskSubject  : 1,   
          taskStatus: 1,
          priority: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          assignedToModel: 1,
            service: 1,
            accountDetails: 1,
            destinationsDetails:1,
            assignedTo: 1,
            
             assignedFrom : 1,
             createdBy: 1,
              updatedBy: 1
          }
        }
      ]);
     }else {

      objList = await Task.aggregate([
        {
          $lookup: {
            from: "services",
            let: { serviceID: "$service" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$serviceID"] } } },
              { $project: { _id: 1, accountId: 1, product: 1,testingStatus:1 ,destinationName : 1 /* include other fields as needed */ } }
            ],
            as: "service"
          }
        },
        {
          $unwind: "$service"
        },

        {
          $match:
          { $expr:  { 
             $eq: ["$service.product", requester.productCategory] }
          }
        },
        

        {
          $lookup: {
            from: "accounts",
            let: { accountId: "$service.accountId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$accountId"] } } },
              { $project: { _id: 1, status: 1,ghostName:1 /* include other fields as needed */ } }
            ],
            as: "accountDetails"
          }
        },
        {
          $unwind: "$accountDetails"
        },
        {
          $match: {
            "accountDetails.status": true
          }
        },
        {
          $lookup: {
            from: "destinations",
            let: { desId: "$service.destinationName" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$desId"] } } },
              { $project: { _id: 1, name: 1 /* include other fields as needed */ } }
            ],
            as: "destinationsDetails"
          }
        },
        {
          $unwind: "$destinationsDetails"
        },
            
        {
          $lookup: {
            from: "employees",
            let: { assignedToID: "$assignedTo" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$assignedToID"] } } },
              { $project: { _id: 1, name: 1 /* include other fields as needed */ } }
            ],
            as: "assignedToEmployee"
          }
        },
        // Lookup for assignedToDetails from EmployeeGroup
        {
          $lookup: {
            from: "employeegroups",
            let: { assignedToID: "$assignedTo" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$assignedToID"] } } },
              { $project: { _id: 1, name: 1 /* include other fields as needed */ } }
            ],
            as: "assignedToEmployeeGroup"
          }
        },
        // Merge the results
        {
          $addFields: {
            assignedTo: {
              $cond: {
                if: { $eq: ["$assignedToModel", "Employee"] },
                then: { $arrayElemAt: ["$assignedToEmployee", 0] },
                else: { $arrayElemAt: ["$assignedToEmployeeGroup", 0] }
              }
            }
          }
        },

        {
          $lookup: {
            from: "employees",
            let: { empId: "$assignedFrom" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$empId"] } } },
              { $project: { _id: 1, name: 1 /* include other fields as needed */ } }
            ],
            as: "assignedFrom"
          }
        },
        {
          $unwind: "$assignedFrom"
        },


        {
          $lookup: {
            from: "employees",
            let: { empId: "$createdBy" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$empId"] } } },
              { $project: { _id: 1, name: 1 /* include other fields as needed */ } }
            ],
            as: "createdBy"
          }
        },
        {
          $unwind: "$createdBy"
        },


        {
          $lookup: {
            from: "employees",
            let: { empId: "$updatedBy" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$empId"] } } },
              { $project: { _id: 1, name: 1 /* include other fields as needed */ } }
            ],
            as: "updatedBy"
          }
        },
        {
          $unwind: {
            path: "$updatedBy",
            preserveNullAndEmptyArrays: true // if assignedTo could be null
          }
        },
        {
          $sort: { updatedAt: -1 }
        },

        {
          $project: {
            _id: 1,
          taskSubject  : 1,   
          taskStatus: 1,
          priority: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          assignedToModel: 1,
            service: 1,
            accountDetails: 1,
            assignedTo: 1,
            destinationsDetails:1,
             assignedFrom : 1,
             createdBy: 1,
              updatedBy: 1
          }
        }
      ]);



     }


     return res.status(200).json(objList);











    }catch(error) {

      res.status(500).json({ message: error.message });
    }
  

});

router.get("/task/:id",verifyToken,async (req,res)=>{


  try{
    const  {id} = req.params;
    const tsk = await Task.findById(id).populate({
      path:'service',
      select:'_id accountId',
      populate:{
        path:'accountId',
        select:'companyName ghostName'
      }
    }).populate("assignedTo assignedFrom createdBy updatedBy");

    if(!tsk){
      return res.status(200).json({});
    }else{
       return res.status(200).json(tsk);
    }
     

    

    }catch(error) {
      res.status(500).json({ message: error.message });
    }
  

});

router.get("/taskByService/:id",verifyToken,async (req,res)=>{


  try{
    const  {id} = req.params;
    const tsk = await Task.findOne({service:id}).populate("service assignedTo assignedFrom createdBy updatedBy");

    if(!tsk){
      return res.status(200).json({});
    }else {
          const taskid = tsk._id;
          const threads = await Thread.find({task:taskid}).populate("task createdBy");
            return res.status(200).json({
            ...tsk._doc,
            threads:threads
          });
      }
    

    }catch(error) {
      res.status(500).json({ message: error.message });
    }
  

});


router.get("/taskByEmp/:empid",verifyToken,async(req,res)=>{

  try{
  
      const requester = await Employee.findById(req.employee._id);
      // if(!employee){
      //   return res.status(400).json({messaage:"Employee not found"});
      // }

      if(!requester)
        return res.status(401).json({message:"Not Authorized"});

      const empid = req.employee._id;

      let searchProduct = [];
      if(requester.role==='admin' && ( !requester?.productCategory ||requester?.productCategory ===null )){

        searchProduct=["VOICE","SMS"];
      }else{
        searchProduct=[`${requester.productCategory}`];
      }
      //console.log(searchProduct);
      const taskList = await Task.find({assignedTo:empid,assignedToModel:'Employee'}).populate({
        path:'service',
        select:'_id accountId',
        populate:{
          path:'accountId',
          select:'companyName ghostName'
        }
      }).populate("assignedTo assignedFrom createdBy updatedBy").populate({path:'service',select:'_id testingStatus'}).sort({updatedAt:-1});
      const empInGroup = await EmployeeGroup.find({ empList: { $in: [empid] } });
      const  groupIds = empInGroup.map((item)=>item._id.toString())

      const taskListGroup = await Task.find({assignedTo: { $in: groupIds }  ,assignedToModel:'EmployeeGroup'}).populate({
        path:'service',
        select:'_id accountId',
        populate:{
          path:'accountId',
          select:'companyName ghostName'
        }
      }).populate("assignedTo assignedFrom createdBy updatedBy").populate({path:'service',select:'_id testingStatus'}).sort({updatedAt:-1});

      res.status(200).json([...taskList,...taskListGroup]);

      // res.status(200).json([]);
  }catch(error){

    console.log(error);
    res.status(500).json({message:error.message});
  }

});


router.put("/task/:id",verifyTokenAndRoles(["admin", "Account Manager"]),upload.array('attachments'),async (req,res)=>{

  try{  
    const {id} = req.params;
    const task = await Task.findById(id).populate({path:'service',select:'_id product accountId',  populate:{
      path:'accountId',
      select:'ghostName'
    }});
    if(!task)
      return res.status(404).json({messgage: "Task not found"});

    const {taskSubject, assignedTo , priority, comments, updatedBy,groupFlag,assignedToGroup} = req.body;

    
    let assgnTo;
    if(groupFlag && groupFlag ==="Y" ){
        assgnTo = await EmployeeGroup.findById(assignedToGroup);
        if(!assgnTo)
          return res.status(404).json({message:"assignedTo Group not found"});
    }else if(groupFlag && groupFlag =="N"){
       assgnTo = await Employee.findById(assignedTo);
      if(!assgnTo)
        return res.status(404).json({message:"assignedTo Employee not found"});
  
    }else{
      res.status(400).json({message:"Issue occured, Group or Individual not able to decide"});
    }


    const uptBy = await Employee.findById(updatedBy);
    if(!uptBy)
      return res.status(404).json({message:"Updater Employee not found"});

    const attachments=  req.files.map((file) => file.filename);


    let threadUpdate,flagAssignedChanged="N" ;

    if(task?.assignedTo  && (task?.assignedTo?.toString()!==assgnTo._id.toString()))
      {
         threadUpdate = new Thread({
          threadSubject:"Update: Task Assignee updated",
          message:"Now Task Assigned to : "+assgnTo.name+" ["+assgnTo?.role+", "+ assgnTo?.email+", "+assgnTo?.phone +"] and AssignedFrom: "+
          uptBy.name+" ["+uptBy.role+", "+ uptBy.email+", "+uptBy.phone +"] "
          ,
          task:task._id,
          createdBy:null
        
        });
        
        const ser = await Services.findById(task.service);
        ser.assignedTo=assgnTo._id;
        ser.assignedToModel= (groupFlag==="N")?'Employee':'EmployeeGroup';
        ser.updatedBy=updatedBy;
        ser.updatedAt=new Date();
        const updatedService = await ser.save();

        //sending mail flag if assignee change

        flagAssignedChanged="Y"

      }else{
        threadUpdate = new Thread({
          threadSubject:"Update: Task Details!",
          message:"Please refer the now updated task details",
          task:task._id,
          createdBy:null
        
        });
      }

    task.taskSubject = taskSubject;
    task.assignedTo = assgnTo._id;
    task.assignedToModel= (groupFlag==="N")?'Employee':'EmployeeGroup';
    task.attachments = task.attachments.concat(attachments) ;
    task.priority = priority;
    task.comments = comments;
    task.updatedBy = updatedBy;
   
    const updatedObj = await task.save();
     threadUpdate = threadUpdate.save();

    res.status(200).json(updatedObj);



    if(flagAssignedChanged==="Y"){


                let involvedList=[]
                let emailTOIds=[]
              if(groupFlag ==="Y"){
                involvedList= assgnTo.empList
                emailTOIds=assgnTo.empList;
              } else {
                involvedList.push(assgnTo._id)
                emailTOIds.push(assgnTo._id)
              }
              
              involvedList.push(req.employee._id) ;

              const notification=new Notification(
                {
                  message:"Task Assigned to : "+assgnTo.name+" and  AssignedFrom: "+ uptBy.name+" ["+uptBy.role+"]" ,
                  product: task.service.product,
                  notificationType: "TASK_CREATION",
                  serviceId: task.service._id,
                  accountId: task.service.accountId,
                  emitter: req.employee._id,
                  involvedEmp:involvedList,
                  toShow:["ALL_ADMIN"]
                  
                }
              );

              
                await notification.save();
                    
                req.io.emit('admin', notification);

              
                const forAM = getUserSocket( req.employee._id.toString());
                if(task.service.product==='VOICE'){
                  if (forAM) {
                    forAM.emit('AM_VOICE',notification);
                }}
                else  if(task.service.product==='SMS'){
                  if (forAM) {
                    forAM.emit('AM_SMS',notification);
                }
                }
                    


                
                involvedList.forEach((item) => {
                  // console.log("entered--",item.toString());
                  const userSocket = getUserSocket(item.toString());
                  if (userSocket) {
                    // console.log("sent--",item.toString());

                    userSocket.emit('personal', notification);
                  }
                });


                
                
                const toEMailObj = await Employee.find({ _id: { $in: emailTOIds } }, 'email');
                const toEmaiidList = toEMailObj.map(employee => employee.email);
                
                const adminsEmailList =await adminsEmails ()
                adminsEmailList.push(uptBy.email);
                

                console.log(toEmaiidList);
                console.log(adminsEmailList);
                try{  
                  const contentHtml =` <div class="header"> <h1>Task Assigned ${task.service.accountId?.ghostName}</h1>   </div>
                        <div class="content">
                            <p>Hi ,</p>
                            <p>Please check below task assigned to '${assgnTo.name}' for testing.</p>
                            <table class="details-table">
                          <tr>
                              <th>Subject:</th>
                              <td>${updatedObj.taskSubject}</td>
                          </tr>
                          <tr>
                              <th>Priority:</th>
                              <td>${ updatedObj.priority === 1?"HIGH":updatedObj.priority=== 2 ? "MEDIUM" :updatedObj.priority === 3?"LOW":"D"}</td>
                          </tr>
                          <tr>
                              <th>comments:</th>
                              <td>${updatedObj.comments}</td>
                          </tr>
                          <tr>
                              <th>Assigned From:</th>
                              <td>${uptBy.name}</td>
                          </tr>
                      </table>
                        </div> `
                        const html= upperPartHtml+contentHtml+lowerPartHtml
              
                    await emailTransporter.sendMail({
                      from: process.env.EMAIL_FROM,
                      to: toEmaiidList,
                     cc:adminsEmailList,
                      subject: `New Task Assigned ${task.service.accountId?.ghostName}`,
                      html: html,
                    });
                    
                } 
                catch (error) {
                  console.error('Error sending email:', error.message);
                }
  
    }

   




  }catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message });
  }



});


router.put("/taskStatusInProgress/:id",verifyToken,async (req,res)=>{

  try{  
    const {id} = req.params;
    const task = await Task.findById(id);
    if(!task)
      return res.status(404).json({messgage: "Task not found"});

    const { updatedBy} = req.body;

    const uptBy = await Employee.findById(updatedBy);
    if(!uptBy)
      return res.status(404).json({message:"Updater Employee not found"});


    const threadUpdate = new Thread({
          threadSubject:"Update: Task Status changed in Progress",
          message:" By : "+  uptBy.name+" ["+uptBy.role+", "+ uptBy.email+", "+uptBy.phone +"] " ,
          task:task._id,
          createdBy:null
        
        });
    
    task.taskStatus = "IN_PROGRESS";
    task.updatedBy = updatedBy;
    task.updatedAt = new Date();
    const updatedObj = await task.save();
    const updateThread = threadUpdate.save();

    res.status(200).json(updatedObj);

  }catch (error) {
    res.status(500).json({ message: error.message });
  }



});


router.put("/taskStatus/:id",verifyToken,async (req,res)=>{

  try{  
    const {id} = req.params;

    const task = await Task.findById(id);
    if(!task)
      return res.status(404).json({messgage: "Task not found"});

    const { statusToChange,updatedBy} = req.body;

    const uptBy = await Employee.findById(updatedBy);
    if(!uptBy)
      return res.status(404).json({message:"Updater Employee not found"});



    const service = await Services.findById(task.service).populate('destinationName qualityCategory');
    service.testingStatus=statusToChange;
    service.updatedBy=uptBy;
    service.updatedAt=new Date();
   

    const threadUpdate = new Thread({
          threadSubject:"Update: Task Completed, Route status marked to "+statusToChange,
          message:" By : "+  uptBy.name+" ["+uptBy.role+", "+ uptBy.email+", "+uptBy.phone +"] " ,
          task:task._id,
          createdBy:null
        
        });
    
    task.taskStatus = "DONE";
    task.updatedBy = updatedBy;
    task.updatedAt = new Date();
   
    const updatedObj = await task.save();
    const updateThread = threadUpdate.save();
    await service.save();

    res.status(200).json(updatedObj);



    if (statusToChange==="PASSED") {
      const notification=new Notification(
         {
           message:"Route Marked Passed after Testing by "+uptBy.name,
           notificationType: "ROUTE_PASSED",
           serviceId:service._id,
           product: service.product,
           accountId: service.accountId,
           emitter: req.employee._id,
           toShow:["ALL_ADMIN","ALL_AM"]
         }
        );
        await notification.save();
        req.io.emit('admin', notification);
                if(service.product==='VOICE')
                    req.io.emit('AM_VOICE',notification);
                else  if(service.product==='SMS')
                    req.io.emit('AM_SMS',notification);
        
        const existingReq= await Requirement.find({destinationName: service.destinationName._id,qualityCategory:service.qualityCategory._id ,product:service.product});
        const existingServices= await Services.find({destinationName: service.destinationName._id,qualityCategory:service.qualityCategory._id ,product:service.product,testingStatus:'PASSED'});

        if(existingReq.length>0 && existingServices.length===1){
              const notificationMapper = new Notification(
                {
                  message:"A Route Marked Passed and Mapping found Destination " + service.destinationName.name+" & Quality " +service.qualityCategory.name ,
                  notificationType: "NEW_MAPPING",
                  serviceId:service._id,
                  product: service.product,
                  accountId: service.accountId,
                  emitter: req.employee._id,
                  toShow:["ALL_ADMIN","ALL_AM"]
                }
              );
           await notificationMapper.save();
            req.io.emit('admin', notificationMapper);
            if(service.product==='VOICE')
            req.io.emit('AM_VOICE',notificationMapper);
            else  if(service.product==='SMS')
            req.io.emit('AM_SMS',notificationMapper);
            }
      
     }

  }catch (error) {
    res.status(500).json({ message: error.message });
  }



});


router.put('/taskDeleteAttachment/:taskId',verifyTokenAndRoles(["admin", "Account Manager"]), async (req, res) => {
   const {taskId  } = req.params;
  const{fileName, updatedBy} = req.body; 
  try{
    const task = await Task.findOne({ _id: taskId, attachments: { $in: [fileName] } });

    if(!task){
      return res.status(404).json({message:"Task with mentioned file not found"});
    }
    const uptBy = await Employee.findById(updatedBy);
    if(!uptBy){
      return res.status(404).json({message:"Attachment deleter employee not found"});
    }     
      const files = await fs.readdir("./uploads/task");

      const matchingFiles = files.filter((file) => file === fileName);
    
      if (matchingFiles.length === 0) {
        return res.status(404).json({ message: 'File not found' });
      } else if (matchingFiles.length > 1) {
        return res.status(500).json({ message: 'Multiple files found, cannot delete' });
      }
    
     

    const result = await Task.updateOne(
      { _id: taskId },
      { $pull: { attachments: fileName },
      $set: { updatedBy: updatedBy, updatedAt : new Date() } }
    );

    if(result.modifiedCount){

       // Delete the file
       filePath = "./uploads/task/" + fileName;
       fs.unlink(filePath);

    const threadUpdate = new Thread({
    threadSubject:"Update: Attachment deleted from Task",
    message: fileName+" has been deleted from the Task, By : "+  uptBy.name+" ["+uptBy.role+", "+ uptBy.email+", "+uptBy.phone +"] " ,
    task:task._id,
    createdBy:null });

    threadUpdate.save();
    
    res.status(200).json({message:"File deleted Successfully"});
    }
    else{
      res.status(404).json({message:"File not deleted Successfully"});

    } 
  }catch(error){
    res.status(500).json({message:error.message});
  }


});



router.put("/task/reopen/:id",verifyToken,async (req,res)=>{

    try{
        const requester = await Employee.findById(req.employee._id);
        const task  = await Task.findById(req.params.id).populate({path:'assignedTo',select :'_id empList'}).populate('service');
        if(!task)
          return res.status(400).json({message:"No Task Found!"});

        //route
        const service = await Services.findById(task.service._id).populate({path:'accountId',select:'_id ghostName'});
        const oldRouteStatus =  service.testingStatus;
        service.testingStatus = "ASSIGNED_TO_NOC";
        service.updatedBy = requester._id;
        service.updatedAt= new Date();

        //task
        task.taskStatus = "PENDING";
        task.updatedBy = requester._id;
        task.updatedAt= new Date();

        const updatedTask = await task.save();
        const updatedService = await service.save();

        if(updatedTask &&  updatedService){
          const initialThread = new Thread({
            threadSubject:"Auto: Task Reopened",
            message:"Task Reopened by  "+   requester.name+" ["+requester.role+"] "   ,
            task:task._id,
            createdBy:null
          
          });
          const savedThread = initialThread.save();
        }

          res.status(200).json({message:"Task reopened successfully"});





        let involvedList=[]
        let emailTOIds=[]
      if(task.assignedToModel ==="EmployeeGroup"){
        involvedList= task.assignedTo.empList
        emailTOIds=task.assignedTo.empList;
      } else {
        involvedList.push(task.assignedTo?._id)
        emailTOIds.push(task.assignedTo?._id)
      }
      
      involvedList.push(req.employee?._id) ;

      const notification=new Notification(
        {
          message:"Task reopened by  : "+requester.name ,
          product: task.service.product,
          notificationType: "TASK_CREATION",
          serviceId: task.service?._id,
          accountId: task.service?.accountId,
          emitter: req.employee._id,
          involvedEmp:involvedList,
          toShow:["ALL_ADMIN"]
          
        }
      );

      
        await notification.save();
            
        req.io.emit('admin', notification);

      
        const forAM = getUserSocket( req.employee._id.toString());
        if(task.service.product==='VOICE'){
          if (forAM) {
            forAM.emit('AM_VOICE',notification);
        }}
        else  if(task.service.product==='SMS'){
          if (forAM) {
            forAM.emit('AM_SMS',notification);
        }
        }
            

        involvedList = Array.from(new Set(involvedList));
        
        involvedList.forEach((item) => {
          // console.log("entered--",item.toString());
          const userSocket = getUserSocket(item?.toString());
          if (userSocket) {
            // console.log("sent--",item.toString());

            userSocket.emit('personal', notification);
          }
        });


        
        
        const toEMailObj = await Employee.find({ _id: { $in: emailTOIds } }, 'email');
        const toEmaiidList = toEMailObj.map(employee => employee.email);

        // const adminsEmail = await Employee.find({ role: 'admin',status:true}).select('email -_id').exec();
        // const adminsEmailList = adminsEmail.map(employee => employee.email);
        
        const adminsEmailList =await adminsEmails ()
        adminsEmailList.push(requester.email);
        

        console.log(toEmaiidList);
        console.log(adminsEmailList);
        try{  
          const contentHtml =` <div class="header"> <h1>Task Reopened ${service.accountId.ghostName} </h1>   </div>
                <div class="content">
                    <p>Hi ,</p>
                    <p>Please check below below reopened.</p>
                    <table class="details-table">
                  <tr>
                      <th>Subject:</th>
                      <td>${task.taskSubject}</td>
                  </tr>
                  <tr>
                      <th>Priority:</th>
                      <td>${ task.priority === 1?"HIGH":task.priority=== 2 ? "MEDIUM" :task.priority === 3?"LOW":"D"}</td>
                  </tr>
                  <tr>
                      <th>comments:</th>
                      <td>${task.comments}</td>
                  </tr>
                  <tr>
                      <th>Reopened From:</th>
                      <td>${requester.name}</td>
                  </tr>
              </table>
                </div> `
                const html= upperPartHtml+contentHtml+lowerPartHtml
      
            await emailTransporter.sendMail({
              from: process.env.EMAIL_FROM,
              to: toEmaiidList,
             cc:adminsEmailList,
              subject: `Task reopened ${service.accountId.ghostName}`,
              html: html,
            });
            
  
        } 
        catch (error) {
          console.error('Error sending email:', error?.message);
        }

    }catch(error){
      console.log(error);
      return res.status(500).json({message:error?.message});
    }



})



module.exports = router;

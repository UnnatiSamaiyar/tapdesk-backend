const router = require("express").Router();

const RoutingTask = require("../../models/RoutingTask");
const Thread = require("../../models/RouttingTaskThread");
const Employee = require("../../models/Employee");
const Requirement = require("../../models/Requirement")
const EmployeeGroup = require("../../models/Master/EmployeeGroup");
const Notification = require("../../models/Notification");
const {getUserSocket} = require('../../utils/socketConfig');
const {adminsEmails, upperPartHtml,lowerPartHtml } = require('../../utils/utilsMethod') 
const emailTransporter = require('../../utils/emailConfig');

const { verifyTokenAndRoles, verifyToken ,verifyTokenAndAdmin} = require("../../utils/verifyToken");


//used for creation  of the routing task
router.post("/routingtask",verifyTokenAndRoles(["admin", "Account Manager"]),async(req,res)=>{

  try{
    const  {taskSubject, customerName, destinationName, category, price, suppliers, groupFlag,assignedToGroup, assignedTo,remarks ,product,destinationName2,price2}= req.body;
    const creator = await Employee.findById(req.employee._id)
    
    const createdBy =creator._id;
    const assignedFrom=creator._id;

    let assgnTo;
    if(groupFlag && groupFlag ==="Y" ){
        assgnTo = await EmployeeGroup.findById(assignedToGroup);
        if(!assgnTo)
          return res.status(404).json({message:"assignedTo Group not found"});
    }else if(groupFlag && groupFlag ==="N"){
       assgnTo = await Employee.findById(assignedTo);
      if(!assgnTo)
        return res.status(404).json({message:"assignedTo Employee not found"});
    }else{
      res.status(400).json({message:"Issue occured, Group or Individual not able to decide"});
    }

    if(product!=='VOICE' && product!=='SMS'){
      res.status(400).json({message:"Product type is invalid , must be SMS or VOICE!"});
    }
    

    const newObj = new RoutingTask({taskSubject, customerName,destinationName,category,price,suppliers, remarks,product, assignedTo:assgnTo._id, assignedFrom,
      assignedToModel: (groupFlag==="N")?'Employee':'EmployeeGroup',createdBy,destinationName2,price2
    });
    await newObj.save();
    res.status(201).json(newObj);



    let flagAssignedChanged='Y'; //can be disable by assinging flag to N
    const updatedObj = newObj;
    const uptBy=creator;
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
        message:"Routing Task Assigned to : "+assgnTo.name+" and  AssignedFrom: "+ uptBy.name+" ["+uptBy.role+"]" ,
        product: updatedObj.product,
        notificationType: "ROUTING_TASK",
        serviceId: updatedObj._id,
        emitter: req.employee._id,
        involvedEmp:involvedList,
        toShow:["ALL_ADMIN"]
        
      }
    );

    
      await notification.save();
          
      req.io.emit('admin', notification);

    
      const forAM = getUserSocket( req.employee._id.toString());
      if(updatedObj.product==='VOICE'){
        if (forAM) {
          forAM.emit('AM_VOICE',notification);
      }}
      else  if(updatedObj.product==='SMS'){
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
    
      try{  


        const rows = updatedObj?.suppliers?.map((item, index) => (
          `<tr>
            <td style="border: 1px solid black;">${index + 1}</td>
            <td style="border: 1px solid black;">${item?.name}</td>
            <td style="border: 1px solid black;">${item?.price}</td>
          </tr>`
        )).join('');

        const contentHtml =` <div class="header"> <h1>Routing Task Assigned </h1>   </div>
              <div class="content">
                  <p>Hi ,</p>
                  <p>Please check below Routing task assigned to '${assgnTo.name}'.</p>
                  <table class="details-table">
                <tr>
                    <th>Subject:</th>
                    <td>${updatedObj.taskSubject}</td>
                </tr>
                <tr>
                    <th>Cusomer Name:</th>
                    <td>${ updatedObj.customerName}</td>
                </tr>
                 <tr>
                    <th> Suppliers Name:</th>
                    <td>  <table style={{ border: '1px solid black', width: '100%' }}>
                              <thead>
                                <tr>
                                  <th style={{ border: '1px solid black' }}>Sno.</th>
                                  <th style={{ border: '1px solid black' }}>Name</th>
                                  <th style={{ border: '1px solid black' }}>Price</th>

                                </tr>
                              </thead>
                              <tbody> 
                             ${rows}
                        </tbody>
                         </table>

                    </td>
                </tr>
                <tr>
                    <th> Price :</th>
                    <td>${ updatedObj.price}</td>
                </tr>
                 <tr>
                    <th> Destination Name :</th>
                    <td>${ updatedObj.destinationName}</td>
                </tr>
                
                <tr>
                          <th> Destination 2 and Price 2 :</th>
                          <td>${ updatedObj?.destinationName2} -- ${ updatedObj?.price2}</td>
               </tr>

                
                <tr>
                    <th>Remarks:</th>
                    <td>${updatedObj.remarks}</td>
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
            subject: `New Routing Task Assigned ${updatedObj.customerName}`,
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


//used for fetching the taks list
router.get("/routingtask",verifyToken,async (req,res)=>{

  try{
   
    const requester  = await Employee.findById(req.employee._id);
    if(!requester){
      return res.status(404).json({message: "Employee doest not exist"});
    }


     let objList = []
     if(requester.role==='admin'  && ( !requester?.productCategory ||requester?.productCategory ===null )) {
    
      objList = await RoutingTask.find().populate({
        path:'assignedFrom',
        select:'_id name'
      }).populate({path:'assignedTo',select:'_id name'})
      //.populate({path:'destinationName',select:'_id name'})
      //.populate({path:'destinationName2',select:'_id name'})
      .sort({updatedAt:-1});;
    
     }else {

      objList = await RoutingTask.find({product:requester?.productCategory }).populate({
        path:'assignedFrom',
        select:'_id name'
      }).populate({path:'assignedTo',select:'_id name'})
     // .populate({path:'destinationName',select:'_id name'})
      //.populate({path:'destinationName2',select:'_id name'})
      
      .sort({updatedAt:-1});;
     }


     return res.status(200).json(objList );


    }catch(error) {

      res.status(500).json({ message: error.message });
    }
  

});


//used for fetching the single task details
router.get("/routingtask/:id",verifyToken,async (req,res)=>{


  try{
    const  {id} = req.params;
    const tsk = await RoutingTask.findById(id).populate({
      path:'assignedFrom',
      select:'_id name'
    }).populate({path:'assignedTo',select:'_id name'})
    //.populate({path:'destinationName',select:'_id name'})
    //.populate({path:'destinationName2',select:'_id name'})
    ;

    if(!tsk){
      return res.status(200).json({});
    }else{
       return res.status(200).json(tsk);
    }
     

    

    }catch(error) {
      res.status(500).json({ message: error.message });
    }
  

});


//specially for NOC  -- need to use fetch task assigned to noc
router.get("/routingTask/assignedTo/:empid",verifyToken,async(req,res)=>{

  try{
  
      const requester = await Employee.findById(req.employee._id);
      if(!requester)
        return res.status(401).json({message:"Not Authorized"});

      const empid = req.employee._id;

      let searchProduct = [];
      if(requester.role==='admin' && ( !requester?.productCategory ||requester?.productCategory ===null )){

        searchProduct=["VOICE","SMS"];
      }else{
        searchProduct=[`${requester.productCategory}`];
      }

      const taskList = await RoutingTask.find({assignedTo:empid,assignedToModel:'Employee'}).populate({
        path:'assignedFrom',
        select:'_id name'
      }).populate({path:'assignedTo',select:'_id name'})
      //.populate({path:'destinationName',select:'_id name'})
      //.populate({path:'destinationName2',select:'_id name'})
      .sort({updatedAt:-1});
      const empInGroup = await EmployeeGroup.find({ empList: { $in: [empid] } });
      const  groupIds = empInGroup.map((item)=>item._id.toString())

      const taskListGroup = await RoutingTask.find({assignedTo: { $in: groupIds }  ,assignedToModel:'EmployeeGroup'}).populate({
        path:'assignedFrom',
        select:'_id name'
      }).populate({path:'assignedTo',select:'_id name'})
    //  .populate({path:'destinationName',select:'_id name'})
     // .populate({path:'destinationName2',select:'_id name'})
      .sort({updatedAt:-1});

      res.status(200).json([...taskList,...taskListGroup]);

      // res.status(200).json([]);
  }catch(error){

    console.log(error);
    res.status(500).json({message:error.message});
  }

});

//Used for updating the taks details
router.put("/routingtask/:id",verifyTokenAndRoles(["admin", "Account Manager"]),async (req,res)=>{

  try{  
    const {id} = req.params;
    const task = await RoutingTask.findById(id);
    if(!task)
      return res.status(404).json({messgage: "Task not found"});

    const  {taskSubject, customerName, destinationName, category, price, suppliers, groupFlag,assignedToGroup, assignedTo,remarks ,product,destinationName2,price2}= req.body;

    
    let assgnTo,flagAssignedChanged='N';
    if(groupFlag && groupFlag ==="Y" ){
        assgnTo = await EmployeeGroup.findById(assignedToGroup);
        if(!assgnTo)
          return res.status(404).json({message:"assignedTo Group not found"});
    }else if(groupFlag && groupFlag ==="N"){
       assgnTo = await Employee.findById(assignedTo);
      if(!assgnTo)
        return res.status(404).json({message:"assignedTo Employee not found"});
    }else{
      res.status(400).json({message:"Issue occured, Group or Individual not able to decide"});
    }

    if(product!=='VOICE' && product!=='SMS'){
      res.status(400).json({message:"Product type is invalid , must be SMS or VOICE!"});
    }


    const uptBy = await Employee.findById(req.employee._id);
    if(!uptBy)
      return res.status(404).json({message:"Updater Employee not found"});




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
        
       
        flagAssignedChanged="Y";

      }else{
        threadUpdate = new Thread({
          threadSubject:"Update: Task Details!",
          message:"Please refer the now updated task details",
          task:task._id,
          createdBy:null
        
        });
      }

    task.taskSubject = taskSubject;
    task.destinationName = destinationName;
    task.customerName = customerName;
    task.category =category;
    task.price =price;
    task.suppliers = suppliers;
    task.product= product;
    task.assignedTo = assgnTo._id;
    task.assignedToModel= (groupFlag==="N")?'Employee':'EmployeeGroup';
    task.remarks = remarks;
    task.updatedBy = uptBy;
    task.updatedAt = new Date();

    task.destinationName2=destinationName2;
    task.price2=price2;
   
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
                  message:"Routing Task Assigned to : "+assgnTo.name+" and  AssignedFrom: "+ uptBy.name+" ["+uptBy.role+"]" ,
                  product: updatedObj.product,
                  notificationType: "ROUTING_TASK",
                  serviceId: updatedObj._id,
                  emitter: req.employee._id,
                  involvedEmp:involvedList,
                  toShow:["ALL_ADMIN"]
                  
                }
              );

              
                await notification.save();
                    
                req.io.emit('admin', notification);

              
                const forAM = getUserSocket( req.employee._id.toString());
                if(updatedObj.product==='VOICE'){
                  if (forAM) {
                    forAM.emit('AM_VOICE',notification);
                }}
                else  if(updatedObj.product==='SMS'){
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
              
                try{  
                  const rows = updatedObj?.suppliers?.map((item, index) => (
                    `<tr>
                      <td style="border: 1px solid black;">${index + 1}</td>
                      <td style="border: 1px solid black;">${item?.name}</td>
                      <td style="border: 1px solid black;">${item?.price}</td>
                    </tr>`
                  )).join('');
                  const contentHtml =` <div class="header"> <h1>Routing Task Assigned </h1>   </div>
                        <div class="content">
                            <p>Hi ,</p>
                            <p>Please check below Routing task assigned to '${assgnTo.name}'.</p>
                            <table class="details-table">
                          <tr>
                              <th>Subject:</th>
                              <td>${updatedObj.taskSubject}</td>
                          </tr>
                          <tr>
                              <th>Cusomer Name:</th>
                              <td>${ updatedObj.customerName}</td>
                          </tr>
                           <tr>
                              <th> Suppliers Name:</th>
                              <td>

                              <table style={{ border: '1px solid black', width: '100%' }}>
                              <thead>
                                <tr>
                                  <th style={{ border: '1px solid black' }}>Sno.</th>
                                  <th style={{ border: '1px solid black' }}>Name</th>
                                  <th style={{ border: '1px solid black' }}>Price</th>

                                </tr>
                              </thead>
                              <tbody> 
                             ${rows}
                        </tbody>
                         </table>

                              </td>
                          </tr>
                          <tr>
                              <th> Price :</th>
                              <td>${ updatedObj.price}</td>
                          </tr>
                           <tr>
                              <th> Destination Name :</th>
                              <td>${ updatedObj.destinationName}</td>
                          </tr>
                            <tr>
                              <th> Destination 2 and Price 2 :</th>
                              <td>${ updatedObj?.destinationName2} -- ${ updatedObj?.price2}</td>
                          </tr>
                          <tr>
                              <th>Remarks:</th>
                              <td>${updatedObj.remarks}</td>
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
                      subject: `New Routing Task Assigned ${updatedObj.customerName}`,
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

//Used for changing the status -- need to implement email and notificaiton
router.put("/routingTaskStatus/:id",verifyToken,async (req,res)=>{

  try{  
    const {id} = req.params;
    const task = await RoutingTask.findById(id);
    if(!task)
      return res.status(404).json({messgage: "Task not found"});

    const { statusToChange} = req.body;

    const uptBy = await Employee.findById(req.employee._id);
    if(!uptBy)
      return res.status(404).json({message:"Updater Employee not found"});


    task.taskStatus=statusToChange;
    task.updatedBy=uptBy;
    task.updatedAt=new Date();
   

    const threadUpdate = new Thread({
          threadSubject:"Update: Task Status Changed, status marked to "+statusToChange,
          message:" By : "+  uptBy.name+" ["+uptBy.role+", "+ uptBy.email+", "+uptBy.phone +"] " ,
          task:task._id,
          createdBy:null
        
        });
    

    const updatedObj = await task.save();
    const updateThread =await threadUpdate.save();

    res.status(200).json(updatedObj);


  }catch (error) {
    res.status(500).json({ message: error.message });
  }

});


router.delete("/routingTask/:id",verifyTokenAndRoles(["admin", "Account Manager"]), async (req,res)=>{
  try{
      const taskObj =   await RoutingTask.findById(req.params.id);
      if(!taskObj)
        return res.status(400).json({message:"Routing Task not found"});
      
  
  //    console.log(taskObj)
       let threadDeleteResult ,taskDeleteResult;
       if(taskObj){

          const resultThread =  await Thread.find({ task: taskObj._id });
          if(resultThread){
              resultThread.forEach(thread => {
                  if(thread.attachments.length>0) {  
                  thread.attachments.forEach(file => {
                    const filePath =  "./uploads/thread/" + file;
                    fs.unlink(filePath, err => {
                      if (err) {
                        console.error(`Error deleting file ${filePath}:`, err);
                      }
                    });
                  });
              }
                });
            threadDeleteResult = await Thread.deleteMany({ task: taskObj._id });
          }
          

            taskDeleteResult = await RoutingTask.deleteOne({_id:taskObj._id});
      }

       res.status(200).json({message: `Routing Task deleted successfully with ${taskDeleteResult?.deletedCount ? taskDeleteResult?.deletedCount :0  } Task  & ${threadDeleteResult?.deletedCount ? threadDeleteResult?.deletedCount : 0} thread data also deleted!` });

    
  }catch(error){
    console.log(error.message);
    return res.status(500).json({message:error.message});
  }

})

module.exports = router;

const router = require("express").Router();
const Destination = require("../../models/Master/Destination");
const Currency = require("../../models/Master/Currency");
const Employee = require("../../models/Employee");
const Services = require("../../models/Services");
const Requirement = require("../../models/Requirement")
const Accounts = require("../../models/Accounts");
const Task = require("../../models/Task");
const {getUserSocket} = require('../../utils/socketConfig');
const Notification = require("../../models/Notification");
const Thread = require("../../models/Thread");
const fs = require('fs').promises;
const { verifyTokenAndRoles, verifyToken,verifyTokenAndAdmin } = require("../../utils/verifyToken");

// Route to add a service
router.post("/services", verifyTokenAndRoles(["admin", "Account Manager"]), async (req, res) => {
    try {
        const { destinationName, currency, qualityCategory, product, pricing, ghostPricing, ghostVisible,accountId, assignedTo,remarks,mediaType,createdBy} = req.body;

        const ctry = await Destination.findById(destinationName);
        const curr = await Currency.findById(currency);
        const act = await Accounts.findById(accountId);
        //const assng = await Employee.findById(assignedTo);
        const emp = await Employee.findById(createdBy);
        // const prd = await Product.findById(product);

        if (!ctry) {
            return res.status(404).json({ message: "Destination not found" });
        }
        if (!curr) {
            return res.status(404).json({ message: "Currency not found" });
        }
        if (!act) {
            return res.status(404).json({ message: "Account not found" });
        }
        // if (!assng) {
        //     return res.status(404).json({ message: "Assigned Data not found" });
        // }
        if (!emp) {
            return res.status(404).json({ message: "Empt not found" });
        }
        // if (!prd) {
        //     return res.status(404).json({ message: "Product not found" });
        // }

        const newService = new Services({
            destinationName, currency, qualityCategory, pricing, ghostPricing,product, ghostVisible,accountId,createdBy ,remarks,mediaType
        });

        const savedService = await newService.save();

        res.status(201).json(savedService);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});



router.get("/services",verifyToken, async (req, res) => {
    try {

    const { accountId } = req.query;
    const requester = await Employee.findById(req.employee._id);
    if(!requester)
        return res.status(401).json({message:"Not Authorized"});

    let searchProduct = [];
      if(requester.role==='admin' && ( !requester?.productCategory ||requester?.productCategory ===null )){
        searchProduct=["VOICE","SMS"];
      }else{
        searchProduct=[`${requester.productCategory}`];
      }


      let services;
      const acc = await Accounts.findById(accountId) ;


    if(accountId && accountId!==''){
        if(!acc){
            return     res.status(404).json({message:"Account Id InValid"});
        } else {
            services= await Services.find({ accountId: accountId }).populate('destinationName')
            .populate('currency')
            .populate('assignedTo')
            .populate('statusUpdatedBy')
            .populate('qualityCategory')
            // .populate('product')
            .populate('accountId')
            .populate('createdBy')
            .populate('updatedBy').sort({ createdAt: -1 });
        }
    }else  {

        const accountIdsWithFalseStatus = await Accounts.find({ status: false ,accountType :{$in: searchProduct} }).distinct('_id');
        services = await Services.find({accountId: { $nin: accountIdsWithFalseStatus }, product :{$in: searchProduct} })
        .populate({  path: 'accountId'})
                .populate('destinationName')
                .populate('currency')
                .populate('assignedTo')
                .populate('statusUpdatedBy')
                .populate('qualityCategory')
                .populate('createdBy')
                .populate('updatedBy').sort({ createdAt: -1 });

        
      } 
      
        res.status(200).json(services);


    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});


router.get("/services/:id",verifyToken, async (req, res) => {
    try {

        const { id } = req.params;
       const services = await Services.findById(id).populate('destinationName')
       .populate('currency')
       .populate('assignedTo')
       .populate('statusUpdatedBy')
       .populate('qualityCategory')
       // .populate('product')
       .populate('accountId')
       .populate('createdBy')
       .populate('updatedBy') ;

       if(services)
        res.status(200).json(services);
       else {

       }


    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});


// Route to add a service
router.put("/services/:id", verifyTokenAndRoles(["admin", "Account Manager"]), async (req, res) => {
    try {
        
        const serv = await Services.findById(req.params.id);
        if(!serv){
            return res.status(404).json({message:"Service Not Exist"});
        }
        const { destinationName, currency, qualityCategory, product, pricing, ghostPricing, ghostVisible,updatedBy,remarks,mediaType} = req.body;

        const ctry = await Destination.findById(destinationName);
        const curr = await Currency.findById(currency);
        // const act = await Accounts.findById(accountId);
        //const assng = await Employee.findById(assignedTo);
        const emp = await Employee.findById(updatedBy);
       // const prd = await Product.findById(product);

        if (!ctry) {
            return res.status(404).json({ message: "Country not found" });
        }
        if (!curr) {
            return res.status(404).json({ message: "Currency not found" });
        }
       
        // if (!assng) {
        //     return res.status(404).json({ message: "Assigned Data not found" });
        // }
        if (!emp) {
            return res.status(404).json({ message: "Empt not found" });
        }
        // if (!prd) {
        //     return res.status(404).json({ message: "Product not found" });
        // }

        serv.destinationName = destinationName;
        serv.currency= currency;
        serv.qualityCategory = qualityCategory;
        serv.pricing = pricing;
        serv.ghostPricing = ghostPricing;
        serv.product = product;
        serv.ghostVisible = ghostVisible;
        serv.mediaType = mediaType;
        serv.remarks = remarks;
        serv.updatedBy=updatedBy;

        // const newService = new Services({
        //     destinationName, currency, qualityCategory, pricing, ghostPricing,product, ghostVisible,accountId,createdBy 
        // });

        const savedService = await serv.save();

        res.status(200).json(savedService);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});


router.put("/services/markAsTWR/:id",verifyTokenAndRoles(["admin", "Account Manager"]),async (req,res)=>{

    try{
        let service = await Services.findById(req.params.id);
        if(!service )
            return res.status(400).json({message:" Route Not found"});

        if(service.testingStatus!=="PASSED" )
            return res.status(400).json({message:"Route must be Passed!"});
        const requester = await Employee.findById(req.employee._id);
        if(!requester)
            return res.status(401).json({message:"Not Authorized"});
  
        
          if(  
            
            (requester.role==='admin' && ( !requester?.productCategory ||requester?.productCategory ===null )) || 

            (requester.role !=='admin' && requester?.productCategory===service.product )
        
        ){
            service.isTopWrokingRoute=!service.isTopWrokingRoute;
            service.updatedAt=new Date();
            service.updatedBy=requester._id;
            await service.save();
            return res.status(200).json({message:"Marked Successfully"});
        }else{
                return res.status(401).json({message:"Update Denied"});
        }

    }catch(error){
        console.log(error);
        res.status(500).json({message:error.message});

    }


})


//Below feature is for direct makring the status as pass or failed without assigning to any NOC
router.put("/services/markDirectPassFailed/:id",verifyTokenAndRoles(["admin", "Account Manager"]),async (req,res)=>{

    try{
        const {statusToMark} = req.body;
        console.log(statusToMark);
        let service = await Services.findById(req.params.id).populate('destinationName qualityCategory');
        if(!service )
            return res.status(400).json({message:" Route Not found"});

        // if(service.testingStatus !=="NOT_YET_TESTED" )
        //     return res.status(400).json({message:"Route must be NOT_YET_TESTED"});

        const requester = await Employee.findById(req.employee._id);
        if(!requester)
            return res.status(401).json({message:"Not Authorized"});
  
        let newObj =null
       if(service.testingStatus ==="NOT_YET_TESTED" ) {


            if(  
            
                (requester.role==='admin' && ( !requester?.productCategory ||requester?.productCategory ===null )) || 
    
                (requester.role !=='admin' && requester?.productCategory===service.product )
            
            ){
    
                  newObj = new Task({
                    taskSubject : `Auto: Direct Status marked as ${statusToMark}`, 
                    service :service._id , 
                    assignedFrom:requester._id, 
                    createdBy:requester._id,
                    priority:"3", 
                    assignedToModel:"Employee",
                    taskStatus:"DONE",
                    comments: "This task auto created for marking the status direct without assigning to NOC", 
                     
            });
            
        }
   }else{

                newObj = await Task.findOne({service:service._id})  ;
                newObj.taskStatus = "DONE"
                newObj.updatedBy = requester._id;
                newObj.updatedAt= new Date();

                //need to add thread

   }
          

            service.testingStatus=statusToMark;
            service.updatedAt=new Date();
            service.updatedBy=requester._id;
            await service.save();

            if(newObj){
                await newObj.save();
            }

            res.status(200).json({message:"Marked Successfully"});


            if (statusToMark==="PASSED") {
             const notification=new Notification(
                {
                  message:"A Route Marked Passed directly by "+requester.name,
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

                if(existingReq.length>0 && existingServices.length===1 ){
                const notificationMapper=new Notification(
                    {
                     message:"A Route Marked Direct Passed and Mapping found Destination " + service.destinationName.name+" & Quality " +service.qualityCategory.name ,
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


        // }else{
        //         return res.status(401).json({message:"Update Denied"});
        // }

    }catch(error){
        console.log(error);
        res.status(500).json({message:error.message});

    }


})



router.delete("/services/:id",verifyTokenAndAdmin, async (req,res)=>{
    try{
        const obj =   await Services.findById(req.params.id);
        if(!obj)
          return res.status(400).json({message:"Route not found"});
        
        //finding Task related to this Route
        const taskObj =  await Task.findOne({ service: obj._id });

    //    console.log(taskObj)
         let threadDeleteResult ,taskDeleteResult;
         if(taskObj){

            const resultThread =  await Thread.find({ task: taskObj._id });


            // console.log("resultThread ---",resultThread.length)
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
            

            if(taskObj.attachments.length>0){ 
                taskObj.attachments.forEach(file => {
                  const filePath =  "./uploads/task/" + file;
                  fs.unlink(filePath, err => {
                    if (err) {
                      console.error(`Error deleting file ${filePath}:`, err);
                    }
                  });
                });
            }

              taskDeleteResult = await Task.deleteOne({_id:taskObj._id});
        }

        
       
         
         const result = await Services.deleteOne({_id:obj._id});

        // console.log(threadDeleteResult); //{ acknowledged: true, deletedCount: 1 }
        // console.log(taskDeleteResult);
         res.status(200).json({message: `Route deleted successfully with ${taskDeleteResult?.deletedCount ? taskDeleteResult?.deletedCount :0  } Task  & ${threadDeleteResult?.deletedCount ? threadDeleteResult?.deletedCount : 0} thread data also deleted!` });
  
      
    }catch(error){
      console.log(error.message);
      return res.status(500).json({message:error.message});
    }
  
  })

module.exports = router;

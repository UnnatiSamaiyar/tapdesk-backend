const router = require("express").Router();
const Requirements = require("../../models/Requirement");
const Destination = require("../../models/Master/Destination");
const Notification = require("../../models/Notification");
const QualityCategory = require("../../models/Master/QualityCategory");

const Currency = require("../../models/Master/Currency");
const Employee = require("../../models/Employee");
const Accounts = require("../../models/Accounts");

const Service = require("../../models/Services");

const { verifyTokenAndRoles,verifyTokenAndAdmin } = require("../../utils/verifyToken");

const {getUserSocket} = require('../../utils/socketConfig');


router.get("/requirements", verifyTokenAndRoles(['admin', 'Account Manager',"NOC Manager"]), async (req, res) => {
  try {


    const requester = await Employee.findById(req.employee._id);
      // if(!employee){
      //   return res.status(400).json({messaage:"Employee not found"});
      // }

      if(!requester)
        return res.status(401).json({message:"Not Authorized"});

      const empid = requester._id;

      let searchProduct = [];
      if(requester.role==='admin' && ( !requester?.productCategory ||requester?.productCategory ===null )){

        searchProduct=["VOICE","SMS"];
      }else{
        searchProduct=[`${requester.productCategory}`];
      }

    let requirements=[];
    const { accountId } = req.query;
    const acc = await Accounts.findById(accountId) ;

    if(accountId && accountId!==''){
      if(!acc){
          return   res.status(404).json({message:"Account Id InValid"});
      } else {
        requirements= await Requirements.find({ accountId: accountId }).populate('destinationName')
        .populate('currency')
        .populate('accountId')
        .populate('createdBy')
        .populate('updatedBy')
        .populate('statusUpdatedBy')
        .populate('qualityCategory').sort({ createdAt: -1 });

      }
  }else  {
    const accountIdsWithFalseStatus = await Accounts.find({ status: false ,accountType :{$in: searchProduct} }).distinct('_id');
     requirements = await Requirements.find({accountId: { $nin: accountIdsWithFalseStatus },product :{$in: searchProduct}})
        .populate('destinationName')
        .populate('currency')
        .populate('accountId')
        .populate('createdBy')
        .populate('updatedBy')
        .populate('statusUpdatedBy').populate('qualityCategory').sort({ createdAt: -1 });

  }


    res.status(200).json(requirements);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
});

router.post("/requirements", verifyTokenAndRoles(["admin", "Account Manager","NOC Manager"]), async (req, res) => {
  try {
      const { destinationName,currency,product,qualityCategory, pricingRange, volume,accountId,createdBy ,remarks} = req.body;

        const ctry = await Destination.findById(destinationName);
        const curr = await Currency.findById(currency);
        const act = await Accounts.findById(accountId);
        const emp = await Employee.findById(createdBy);
        const quality = await QualityCategory.findById(qualityCategory);

        if (!ctry) {
            return res.status(404).json({ message: "Destination not found" });
        }
        if (!curr) {
            return res.status(404).json({ message: "Currency not found" });
        }
        if (!act) {
            return res.status(404).json({ message: "Account not found" });
        }
        if (!emp) {
            return res.status(404).json({ message: "Empt not found" });
        }
        if(!product || (product!=="VOICE" && product!=="SMS")){
          return res.status(400).json({message:"Product not defined!"});
        }

        
        if (!quality) {
          return res.status(404).json({ message: "quality not found" });
      }

        
      const newRequirement = new Requirements({
        destinationName,currency,product,qualityCategory, pricingRange, volume,accountId,createdBy ,remarks
      });

      

      const savedRequirement = await newRequirement.save();
      res.status(201).json(savedRequirement);

      const notification=new Notification(
        {
          message:"New Request generated "+ctry.name+" of Quality : "+quality.name+" under : "+act.ghostName+" by "+emp.name,
          notificationType: "REQ_CREATION",
          product: product,
          accountId: act._id,
          emitter: req.employee._id,
          toShow:["ALL_ADMIN","ALL_AM"]
        }
       );
       await notification.save();

    
      req.io.emit('admin', notification);
      if(product==='VOICE')
        req.io.emit('AM_VOICE',notification);
      else  if(product==='SMS')
        req.io.emit('AM_SMS',notification);

      //searching any service exists 

      const existingRoutes = await Service.find({destinationName:destinationName,qualityCategory:qualityCategory,product: product,testingStatus:'PASSED'});
      const existingReq = await Requirements.find({destinationName:destinationName,qualityCategory:qualityCategory,product: product});
 
      // console.log("existingRoutes --",existingRoutes.length+"  ", existingRoutes)
      if(existingRoutes.length>0 && existingReq.length===1){
          const notificationMpper=new Notification(
            {
              message:"A Requirement added and new Mapping Found for "+ctry.name+" of Quality : "+quality.name ,
              notificationType: "NEW_MAPPING",
              product: product,
              accountId: act._id,
              emitter: req.employee._id,
              toShow:["ALL_ADMIN","ALL_AM"]
            }
           );
          await notificationMpper.save();
    
        
          req.io.emit('admin', notificationMpper);
          if(product==='VOICE')
            req.io.emit('AM_VOICE',notificationMpper);
          else  if(product==='SMS')
            req.io.emit('AM_SMS',notificationMpper);
        }
      //  const userSocket = getUserSocket(req.employee._id.toString());
      // if (userSocket) {
      //   userSocket.emit('newAccount', notification);
      // }
      //  await notification.save();

  } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
  }
});



router.put("/requirements/:id", verifyTokenAndRoles(["admin", "Account Manager","NOC Manager"]), async (req, res) => {
  try {

       let reqrmnt = await Requirements.findById(req.params.id);
      const { destinationName,currency,qualityCategory, pricingRange, volume, remarks } = req.body;

        const ctry = await Destination.findById(destinationName);
        const curr = await Currency.findById(currency);
        const emp = await Employee.findById(req.employee._id);
        const quality = await QualityCategory.findById(qualityCategory);

        if (!ctry) {
            return res.status(404).json({ message: "Destination not found" });
        }
        if (!curr) {
            return res.status(404).json({ message: "Currency not found" });
        }
        
        if (!emp) {
            return res.status(404).json({ message: "Empt not found" });
        }
          
        let flagForNotification="N";
        // console.log("reqrmnt.destinationName ",reqrmnt.destinationName+" "+destinationName);
        // console.log("reqrmnt.qualityCategory ",reqrmnt.qualityCategory+ " "+ qualityCategory)
        if( reqrmnt.destinationName.toString() !==destinationName || reqrmnt.qualityCategory.toString() !==qualityCategory  ){
          flagForNotification="Y";
        }

        reqrmnt.destinationName=destinationName;
        reqrmnt.currency=currency
        reqrmnt.qualityCategory=qualityCategory
        reqrmnt.pricingRange=pricingRange
        reqrmnt.volume =volume
        reqrmnt.remarks=remarks
        reqrmnt.updatedAt=new Date();
        // reqrmnt.updatedBy

        const updatedRequirement = await reqrmnt.save();
       
        
      if( flagForNotification ==="Y"){
          const existingRoutes = await Service.find({destinationName:destinationName,qualityCategory:qualityCategory,product: updatedRequirement.product,testingStatus:'PASSED'});
          const existingReq = await Requirements.find({destinationName:destinationName,qualityCategory:qualityCategory,product: updatedRequirement.product});

        if(existingRoutes.length>0 && existingReq.length===1){
            const notificationMpper=new Notification(
              {
                message:"Requirement Details updated and Mapping Found for "+ctry.name+" of Quality : "+quality.name ,
                notificationType: "NEW_MAPPING",
                product: updatedRequirement.product,
                accountId: updatedRequirement.accountId,
                emitter: req.employee._id,
                toShow:["ALL_ADMIN","ALL_AM"]
              }
             );
           await notificationMpper.save();
      
          
            req.io.emit('admin', notificationMpper);
            if(updatedRequirement.product==='VOICE')
              req.io.emit('AM_VOICE',notificationMpper);
            else  if(updatedRequirement.product==='SMS')
              req.io.emit('AM_SMS',notificationMpper);
          }
        }

      res.status(200).json(updatedRequirement);
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
  }
});


router.delete("/requirements/:id",verifyTokenAndAdmin, async (req,res)=>{

  try{

      const obj =   await Requirements.findById(req.params.id);
      if(!obj)
        return res.status(400).json({message:"Requirment not found"});

       const result = await Requirements.deleteOne({_id:obj._id});
       console.log(result);
       res.status(200).json({message:"Requirement deleted successfully!"});

    
  }catch(error){
    console.log(error.message);
    return res.status(500).json({message:error.message});
  }

})




module.exports = router;

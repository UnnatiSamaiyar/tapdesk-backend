const express = require ('express' )
const router = express.Router();
const multer = require ('multer')
const xlsx = require('xlsx')
const Joi = require('joi')
const QualityCategory =require('../../models/Master/QualityCategory');
const Destination =require('../../models/Master/Destination');
const Currency =require('../../models/Master/Currency');
const Requirement =require('../../models/Requirement');
const Accounts =require('../../models/Accounts');
const Services =require('../../models/Services');
const Notification =require('../../models/Notification');
const { verifyTokenAndRoles } = require("../../utils/verifyToken");

const storage = multer.memoryStorage();
const upload = multer({storage:storage});
const upload2 = multer({storage:storage});

//For Route -- > Destination	Currency	Quality	Pricing	MediaType	Remarks
//For Req --> Destination	Currency	Quality	StartPrice	EndPrice	Volume	Remarks

 
const validateDestination = async (value,helper)=>{
   const obj = await Destination.findOne({ name: value });
    if (!obj) {
        return helper.message(`Destination '${value}' is invalid!`);
     }
    return obj._id; 
} 

const validateCurrency= async (value,helper)=>{
    const obj = await Currency.findOne({ name: value });
     if (!obj) {
         return helper.message(`Currency '${value}' is invalid!`);
      }
     return obj._id; 
 } 

 const validateQualityCategory= async (value,helper)=>{
    const obj = await QualityCategory.findOne({ name: value });
     if (!obj) {
         return helper.message(`Quality '${value}' is invalid!`);
      }
     return obj._id; 
 } 

 

const reqSchema = Joi.object({
    Destination: Joi.string().external(async (value,helper) => {
                    return await validateDestination(value,helper);
      }).required(),

     Currency :  Joi.string().external(async (value,helper) => {
                  return await validateCurrency(value,helper);
      }).required(),
     Quality : Joi.string().external(validateQualityCategory, 'Quality validation').required(),
     StartPrice: Joi.number().required() ,
    EndPrice : Joi.number().greater(Joi.ref('StartPrice')).required(),
    Volume : Joi.number().required(),
    Remarks: Joi.string().optional()
});


const serSchema = Joi.object({
  Destination: Joi.string().external(async (value,helper) => {
                  return await validateDestination(value,helper);
    }).required(),

   Currency :  Joi.string().external(async (value,helper) => {
                return await validateCurrency(value,helper);
    }).required(),
   Quality : Joi.string().external(validateQualityCategory, 'Quality validation').required(),
   Pricing : Joi.number().required() ,
  //  MediaType: Joi.string().valid('CRTP', 'ORTP').required().messages({
  //   'any.required': 'mediaType is mandatory',
  //   'any.only': 'mediaType must be one of ["CRTP", "ORTP"]'
  // }),
  MediaType: Joi.string().valid('CRTP', 'ORTP').required(),
  Remarks: Joi.string().optional()
})



router.post("/reqFile", upload.single('file'),verifyTokenAndRoles(["admin", "Account Manager"]),async(req,res)=>{
    try{
      console.log("serFile------------",req.body);
        const {productType,accountId} = req.body;

        if (!(productType === "SMS" || productType === "VOICE")){
            return res.status(400).json({message:"Account Type is invalid!"});
        }

        const acc = await Accounts.findById(accountId);
        if(!acc)
            {
                return res.status(400).json({message:"Account not found!"});
            }

         const workbook = xlsx.read (req.file.buffer,{type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data=xlsx.utils.sheet_to_json(sheet);
        if(data.length<=0)
          return res.status(400).json({message:"No Data found in file!"});
                
            const errors = [];
            const services = [];
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            try {
              const validatedRow =  await  reqSchema.validateAsync(row, { abortEarly: false });
              services.push({
                destinationName:validatedRow.Destination,
                currency:validatedRow.Currency,
                product:productType,
                qualityCategory:validatedRow.Quality,
                pricingRange:[validatedRow.StartPrice,validatedRow.EndPrice],
                volume:validatedRow.Volume,
                accountId:accountId,
                createdBy:req.employee._id,
                updatedBy:req.employee._id,
                updatedAt:new Date(),
                remarks:validatedRow?.Remarks
              })
            } catch (err) {
                errors.push({ rowNumber: i+1, errosObjList: [...err.details] });
            
            }
          }
        
          if (errors.length > 0) {
            return res.status(400).json({message: 'Validation Errors', errors :errors});
          }

            await Requirement.insertMany(services)
           res.status(200).json({message: 'Successfully uploaded' })

           const notification=new Notification(
            {
              message:"Request Generation: Bulk Requests added  under Account - "+acc.ghostName,
              notificationType: "REQ_CREATION",
              product: productType,
              accountId: acc._id,
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
       
 
     }catch(error){
                console.log (error)
                }
})


router.post("/serFile", upload2.single('file'),verifyTokenAndRoles(["admin", "Account Manager"]),async(req,res)=>{
    try{
        console.log("serFile------------",req.body);
        const {productType,accountId} = req.body;

        if (!(productType === "SMS" || productType === "VOICE")){
            return res.status(400).json({message:"Account Type is invalid!"});
        }

        const acc = await Accounts.findById(accountId);
        if(!acc)
            {
                return res.status(400).json({message:"Account not found!"});
            }

            if (!req.file) {
              return res.status(400).json({ message: "File is missing!" });
          }
  
         const workbook = xlsx.read (req.file?.buffer,{type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data=xlsx.utils.sheet_to_json(sheet);
        if(data.length<=0)
          return res.status(400).json({message:"No Data found in file!"});
                
            const errors = [];
            const services = [];
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            try {
              const validatedRow =  await  serSchema.validateAsync(row, { abortEarly: false });
              services.push({
                destinationName:validatedRow.Destination,
                currency:validatedRow.Currency,
                product:productType,
                qualityCategory:validatedRow.Quality,
                pricing:validatedRow.Pricing,
                accountId:accountId,
                mediaType:validatedRow.MediaType,
                createdBy:req.employee._id,
                updatedBy:req.employee._id,
                updatedAt:new Date(),
                remarks:validatedRow?.Remarks
              })
            } catch (err) {
                errors.push({ rowNumber: i+1, errosObjList: [...err.details] });
            
            }
          }
        
          if (errors.length > 0) {
            return res.status(400).json({message: 'Validation Errors', errors :errors});
          }

            await Services.insertMany(services)
           res.status(200).json({message: 'Successfully uploaded' })      
 
     }catch(error){
                console.log (error)
                }
})


module.exports = router 
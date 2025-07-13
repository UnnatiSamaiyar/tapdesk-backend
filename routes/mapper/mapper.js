const express = require("express");
const router = express.Router();
const Services = require("../../models/Services");
const Employee = require("../../models/Employee");
const Requirement = require("../../models/Requirement");
const QualityCategory = require("../../models/Master/QualityCategory")
const Destination = require("../../models/Master/Destination");

const { verifyTokenAndRoles, verifyToken } = require("../../utils/verifyToken");



router.get("/mapp",verifyToken,async (req,res)=>{

  try{  

    const requester = await Employee.findById(req.employee._id);
    if(!requester)
          return res.status(401).json({message:"Not Authorized"});

    const voiceResult = [];
    const smsResult = [];
    
    const countries = await Destination.find();
    const categories  = await QualityCategory.find();
    
   
    for (const country of countries) {
      console.log(country);
      for (const category of categories) {
          const servicesPromise = 
          Services.find({ destinationName: country._id, qualityCategory: category._id,testingStatus:"PASSED", product:"VOICE"}).populate('currency accountId');
          const reqPromise = Requirement.find({ destinationName: country._id, qualityCategory: category._id, product:"VOICE" }).populate('currency accountId');
          const [services, req] = await Promise.all([servicesPromise, reqPromise]);

          if (services.length === 0 || req.length === 0) {
            continue;  
        }
          const groupedData = {
              destination: country.name,
              category: category.name,
              product:"VOICE",
              services,
              req
          };

          voiceResult.push(groupedData);
        }
      }


      for (const country of countries) {
        for (const category of categories) {
            const servicesPromise = 
            Services.find({ destinationName: country._id, qualityCategory: category._id,testingStatus:"PASSED", product:"SMS"}).populate('currency accountId');
            const reqPromise = Requirement.find({ destinationName: country._id, qualityCategory: category._id, product:"SMS" }).populate('currency accountId');
            const [services, req] = await Promise.all([servicesPromise, reqPromise]);
  
            if (services.length === 0 && req.length === 0) {
              continue;  
          }
            const groupedData = {
                destination: country.name,
                category: category.name,
                product:"SMS",
                services,
                req
            };
  
            smsResult.push(groupedData);
          }
        }

      if(requester.role==='admin' && ( !requester?.productCategory ||requester?.productCategory ===null )){
        return res.status(200).json([...voiceResult,...smsResult]);
      }else if(requester.productCategory==="VOICE"){
        return res.status(200).json(voiceResult);
      }else if(requester.productCategory==="SMS"){
        return res.status(200).json(smsResult);
      }else{
        return res.status(200).json([ ]);
      }
   


  }catch(error){
    console.log(error);
    res.status(500).json({message:error?.message});
  }

})


router.get("/mapper",verifyToken,async (req,res)=>{

  try{  

    const requester = await Employee.findById(req.employee._id);
    if(!requester)
          return res.status(401).json({message:"Not Authorized"});




 

          if(requester.role==='admin' && ( !requester?.productCategory ||requester?.productCategory ===null )){

            const resp = await Services.aggregate( 
              [ 
               {
                 $match: {
                   testingStatus: "PASSED" // Filter documents where testingStatus is "passed"
                 }
               }, {
                 $lookup: {
                   from: 'accounts',
                   localField: 'accountId',
                   foreignField: '_id',
                   as: 'accountDetails'
                 }
               },
               {
                 $unwind: '$accountDetails'  // Ensure each service document has the account details included
               },
               {
                $match: {
                  "accountDetails.status": true
                }
              },
                      {
                         $group : {  _id : { destinationName:"$destinationName", 
                                              qualityCategory:"$qualityCategory",
                                              product : "$product"
                                              } ,
                                              
                                              services: {$push : "$$ROOT"} 
                                            } 
                      }  
                      ,{
                       $lookup: {
                         from: "requirements",
                         let: { destinationName: "$_id.destinationName", qualityCategory: "$_id.qualityCategory" ,  product: "$_id.product" },
                         pipeline: [
                           {
                             $match: {
                               $expr: {
                                 $and: [
                                   { $eq: ["$destinationName", "$$destinationName"] },
                                   { $eq: ["$qualityCategory", "$$qualityCategory"] },
                                   { $eq: ["$product", "$$product"] }
                                 ]
                               }
                             }
                           },

                           {
                             $lookup: {
                               from: "accounts",
                               localField: "accountId",
                               foreignField: "_id",
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
                          }

                         ],
                         as: "req"
                           }

                     },
                     
                    
                     {
                       $lookup:{
                         from :"destinations",
                         localField:"_id.destinationName",
                         foreignField:"_id",
                         as : 'destination'

                       }
                     },{
                       $lookup:{
                         from :"qualitycategories",
                         localField:"_id.qualityCategory",
                         foreignField:"_id",
                         as : 'category'

                       }
                     },
                     
                     {
                       $unwind: '$category'
                      },
                     {
                       $unwind: '$destination'
                     },
                     {
                       $match: {
                         $and: [
                           { services: { $ne: [] } },
                           { $expr: { $gt: [{ $size: "$req" }, 0] } }
                         ]
                       }
                     },
                     {
                         $project :{
                           _id:0,
                           destination:1,
                         //  destination: "$_id.destinationName",
                         product : "$_id.product",
                         category: 1,
                         //  qualityCategory :  "$_id.qualityCategory",
                           services:1,
                           req:1
                         }

                     }
              ])



            return res.status(200).json(resp);
            }else if(requester.productCategory !==""){

                                    const resp = await Services.aggregate( 
                                      [ 
                                        {
                                          $match: {
                                            $and: [
                                              { testingStatus: "PASSED" }, // Filter documents where testingStatus is "PASSED"
                                              { product: requester.productCategory } // Filter documents where product is "VOICE"
                                            ]
                                          }
                                        }, {
                                         $lookup: {
                                           from: 'accounts',
                                           localField: 'accountId',
                                           foreignField: '_id',
                                           as: 'accountDetails'
                                         }
                                       },
                                       {
                                         $unwind: '$accountDetails'  // Ensure each service document has the account details included
                                       }, {
                                        $match: {
                                          "accountDetails.status": true
                                        }
                                      },
                                              {
                                                 $group : {  _id : { destinationName:"$destinationName", 
                                                                      qualityCategory:"$qualityCategory",
                                                                    //  product : "$product"
                                                                      } ,
                                                                      
                                                                      services: {$push : "$$ROOT"} 
                                                                    } 
                                              }  
                                              ,{
                                               $lookup: {
                                                 from: "requirements",
                                                 let: { destinationName: "$_id.destinationName", qualityCategory: "$_id.qualityCategory" 
                                                //  ,  product: "$_id.product" 
                                                },
                                                 pipeline: [
                                                   {
                                                     $match: {
                                                       $expr: {
                                                         $and: [
                                                           { $eq: ["$destinationName", "$$destinationName"] },
                                                           { $eq: ["$qualityCategory", "$$qualityCategory"] },
                                                           { $eq: ["$product", requester.productCategory] }
                                                         ]
                                                       }
                                                     }
                                                   },
                        
                                                   {
                                                     $lookup: {
                                                       from: "accounts",
                                                       localField: "accountId",
                                                       foreignField: "_id",
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
                                                  }
                        
                                                 ],
                                                 as: "req"
                                                   }
                        
                                             },
                                             
                                            
                                             {
                                               $lookup:{
                                                 from :"destinations",
                                                 localField:"_id.destinationName",
                                                 foreignField:"_id",
                                                 as : 'destination'
                        
                                               }
                                             },{
                                               $lookup:{
                                                 from :"qualitycategories",
                                                 localField:"_id.qualityCategory",
                                                 foreignField:"_id",
                                                 as : 'category'
                        
                                               }
                                             },
                                             
                                             {
                                               $unwind: '$category'
                                              },
                                             {
                                               $unwind: '$destination'
                                             },
                                             {
                                               $match: {
                                                 $and: [
                                                   { services: { $ne: [] } },
                                                   { $expr: { $gt: [{ $size: "$req" }, 0] } }
                                                 ]
                                               }
                                             },
                                             {
                                                 $project :{
                                                   _id:0,
                                                   destination:1,
                                                 //  destination: "$_id.destinationName",
                                                 product : requester.productCategory,
                                                 category: 1,
                                                 //  qualityCategory :  "$_id.qualityCategory",
                                                   services:1,
                                                   req:1
                                                 }
                        
                                             }
                                      ])
                        

                                      return res.status(200).json(resp);
                                  } else{
                                    return res.status(200).json([ ]);
                                  }
                               

     
       
      
   


  }catch(error){
    console.log(error);
    res.status(500).json({message:error?.message});
  }

})




module.exports = router;

const router = require("express").Router();
const Employee = require("../../models/Employee");
const EmployeeGroup = require("../../models/Master/EmployeeGroup");
const emailTransporter = require('../../utils/emailConfig');
const { verifyTokenAndRoles, verifyToken ,verifyTokenAndAdmin} = require("../../utils/verifyToken");
const {emilsByEmpId,adminsEmails,amEmails, upperPartHtml,lowerPartHtml } = require('../../utils/utilsMethod') 




const employeeFields = '_id name email phone';

router.get('/empgroupActive_SMS',verifyToken, async (req, res) => {
  try {
  
    const objList = await EmployeeGroup.find({status:true,productCategory:"SMS"}).populate("empList");
    res.status(200).json(objList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



router.get('/empgroup/:id',verifyToken, async (req, res) => {
  try {
  
    const obj = await EmployeeGroup.findById(req.params.id).populate("empList");
    if(obj)
    res.status(200).json(obj);
   else
   res.status(200).json({});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



router.get('/empgroupActive_VOICE',verifyToken, async (req, res) => {
  try {
    const objList = await EmployeeGroup.find({status:true,productCategory:"VOICE"});
    res.status(200).json(objList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/empgroup',verifyToken, async (req, res) => {
    try {
      const objList = await EmployeeGroup.find().populate("empList")
      .populate([
        { path: 'createdBy', select: employeeFields },
        { path: 'updatedBy', select: employeeFields }
      ]);
      res.status(200).json(objList);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
router.post("/empgroup", verifyTokenAndRoles(["admin"]),async (req, res) => {
    try {
     
        const { name, productCategory,empList,createdBy } = req.body;
        const existing = await EmployeeGroup.findOne({ name: { $regex: new RegExp('^' + name + '$', 'i') } });
        if (existing) {
          return res.status(409).json({ message: name+'already exists' });
        }
        const emp = await Employee.findById(createdBy);
        if(!emp){
          return res.status(404).json({messaage:"Create Employee not exist"})
        }
      const newObj = new EmployeeGroup({
        name,productCategory,empList,createdBy
      });
  
      const savedObj = await newObj.save();
      res.status(201).json(savedObj);

      const emailsTo = await emilsByEmpId(empList);
      const adEmails = await adminsEmails();
      const amEmailsList = await amEmails(savedObj.productCategory)

      try{ const contentHtml =` <div class="header">
      <h1>New NOC Group Created</h1>
    </div>
              <div class="content">
                  <p>Hi,</p>
                  <p>We are pleased to inform you that your employee account has been created. Below are your account details:</p>
                  <table class="details-table">
                      <tr>
                          <th>Group Name:</th>
                          <td>${savedObj.name}</td>
                      </tr>
                      <tr>
                          <th>Group Members:</th>
                          <td>${emailsTo}</td>
                      </tr>
                     
                      <tr>
                          <th>Created By:</th>
                          <td>${emp.name}</td>
                      </tr>
                  </table>
              </div> `
    
    
              const html= upperPartHtml+contentHtml+lowerPartHtml
     
    
          await emailTransporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: emailsTo,
            cc: [...adEmails,...amEmailsList],
            subject: 'New NOC Group Created '+savedObj.name,
            html: html
        });


      }catch(error){console.log("error in sending mail",error.message)}





  
    } catch (error) {
      console.log(error)
      res.status(500).json({message:error.messaage});
    }
  });


       //Disable
router.put("/empgroup/disable/:id",verifyTokenAndAdmin,async (req,res)=>{
        try{
          let obj = await EmployeeGroup.findById(req.params.id);
          if(!obj)
            return res.status(400).json({message:"Object Not found"})
          obj.updatedAt=new Date()
          obj.updatedBy=req.employee._id
          const status = obj.status ? "Disabled" : "Enabled";
          obj.status = !obj.status;
          await obj.save();
          return res.status(200).json({message:`Successfully ${status}!`})
        }catch(error){
          return res.status(500).json({message:error.message})
        }
      });


  module.exports = router;
  
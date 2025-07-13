const router = require("express").Router();

const Employee = require("../../models/Employee");
const TimeZone = require("../../models/Master/TimeZone");


const { verifyTokenAndRoles, verifyToken,verifyTokenAndAdmin } = require("../../utils/verifyToken");

const employeeFields = '_id name email phone';

router.get('/timeZoneActive',verifyToken, async (req, res) => {
  try {
    const  timeZone = await TimeZone.find({status:true});
    res.status(200).json(timeZone);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/timeZone',verifyToken, async (req, res) => {
    try {
      const  timeZone = await TimeZone.find()
      .populate([
        { path: 'createdBy', select: employeeFields },
        { path: 'updatedBy', select: employeeFields }
      ]);
      res.status(200).json(timeZone);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  

 

  router.post("/timeZone", verifyTokenAndRoles(["admin"]),async (req, res) => {
    try {
      
        const { name, createdBy } = req.body;
        const existing = await TimeZone.findOne({ name: { $regex: new RegExp('^' + name + '$', 'i') } });
        if (existing) {
        return res.status(409).json({ error: name+'  TimeZone already exists' });
        }
        const existingEmp = await Employee.findById(createdBy);
        if(!existingEmp){
            return res.status(404).json({message:"Creator Employee Doesn't Exists"});
        }
      const newData = new TimeZone({
        name: req.body.name,
        createdBy:createdBy

      });
  
      const savedData = await newData.save();
      res.status(201).json(savedData);
  
    } catch (err) {
      console.log(err)
      res.status(500).json(err);
    }
  });


  router.put("/timeZone/:id", verifyTokenAndRoles(["admin"]),async (req, res) => {
    try {
        
        const fetched = await TimeZone.findById(req.params.id);
        if (!fetched) {
             return res.status(404).json({ error: 'timezone cycle not found' });
        }

        const employee = await Employee.findById(req.body.updatedBy);
        if (!employee) {
          return res.status(404).json({ message: "Employee not found" });
        }

        if (!req.body.name) {
            return res.status(404).json({ error: '"name" tag is compulsory.' });
          }


          fetched.updatedBy = employee;
          fetched.name=req.body.name;
          fetched.updatedAt = new Date();
          const updatedData = await fetched.save ();
         res.status(201).json(updatedData);
  
    } catch (err) {
      console.log(err)
      res.status(500).json(err);
    }
  });
  

         //Disable
router.put("/timeZone/disable/:id",verifyTokenAndAdmin,async (req,res)=>{
          try{
            let obj = await TimeZone.findById(req.params.id);
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
  
const router = require("express").Router();
const Employee = require("../../models/Employee");
const Destination = require("../../models/Master/Destination");
const { verifyTokenAndRoles, verifyToken,verifyTokenAndAdmin } = require("../../utils/verifyToken");

const employeeFields = '_id name email phone';
router.get('/destinationActive',verifyToken, async (req, res) => {
  try {
  
    const objList = await Destination.find({ status: true }).populate('createdBy');
    res.status(200).json(objList);
  } catch (error) {

    res.status(500).json({ message: error.message });
  }
});



router.get('/destination',verifyToken, async (req, res) => {
    try {
    
      const objList = await Destination.find()
      .populate([
        { path: 'createdBy', select: employeeFields },
        { path: 'updatedBy', select: employeeFields }
      ]);
  
      res.status(200).json(objList);
    } catch (error) {
  
      res.status(500).json({ message: error.message });
    }
  });
  

  router.post("/destination", verifyTokenAndRoles(["admin"]),async (req, res) => {
    try {
      
        const { name, createdBy } = req.body;
        const existingCountry = await Destination.findOne({ name: { $regex: new RegExp('^' + name + '$', 'i') } });
    if (existingCountry) {
      return res.status(409).json({ error: name+' already exists' });
    }

        const employee = await Employee.findById(req.body.createdBy);

        if (!employee) {
          return res.status(404).json({ message: "Employee not found" });
        }

      const newObj = new Destination({
        name: req.body.name,
        createdBy:employee

      });
  
      const savedObj = await newObj.save();
      res.status(201).json(savedObj);
  
    } catch (err) {
      console.log(err)
      res.status(500).json({message:err.message});
    }
  });


  router.put("/destination/:id", verifyTokenAndRoles(["admin"]),async (req, res) => {
    try {
        
       
        const objFetch = await Destination.findById(req.params.id);
        if (!objFetch) {
             return res.status(404).json({ error: 'Destination not found' });
        }

        const employee = await Employee.findById(req.body.updatedBy);
        if (!employee) {
          return res.status(404).json({ message: "Destination not found" });
        }

        if (!req.body.name) {
            return res.status(404).json({ error: '"name" tag is compulsory.' });
          }


          objFetch.updatedBy = employee;
          objFetch.name=req.body.name;
          objFetch.updatedAt= new Date();
        const savedObj = await objFetch.save ();
        res.status(200).json(savedObj);
  
    } catch (err) {
      console.log(err)
      res.status(500).json({message:err.message});
    }
  });

  
        //Disable
router.put("/destination/disable/:id",verifyTokenAndAdmin,async (req,res)=>{
  try{
    let obj = await Destination.findById(req.params.id);
    console.log(req.params.id)
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
  
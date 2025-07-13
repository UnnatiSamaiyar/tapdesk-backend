const router = require("express").Router();

const Employee = require("../../models/Employee");

const Country = require("../../models/Master/Country");

const { verifyTokenAndRoles, verifyToken,verifyTokenAndAdmin } = require("../../utils/verifyToken");


const employeeFields = '_id name email phone';



router.get('/countryActive',verifyToken, async (req, res) => {
  try {
  
    const countries = await Country.find({ status: true });
    res.status(200).json(countries);
  } catch (error) {

    res.status(500).json({ message: error.message });
  }
});



router.get('/country',verifyToken, async (req, res) => {
    try {
    
      const countries = await Country.find() 
      .populate([
        { path: 'createdBy', select: employeeFields },
        { path: 'updatedBy', select: employeeFields }
      ]);
  
      res.status(200).json(countries);
    } catch (error) {
  
      res.status(500).json({ message: error.message });
    }
  });
  

  router.post("/country", verifyTokenAndRoles(["admin"]),async (req, res) => {
    try {
      
        const { name, createdBy } = req.body;
        const existingCountry = await Country.findOne({ name: { $regex: new RegExp('^' + name + '$', 'i') } });
    if (existingCountry) {
      return res.status(409).json({ error: name+' Country already exists' });
    }

        const employee = await Employee.findById(req.body.createdBy);

        if (!employee) {
          return res.status(404).json({ message: "Employee not found" });
        }

      const newCountry = new Country({
        name: req.body.name,
        createdBy:employee

      });
  
      const savedCountry = await newCountry.save();
      res.status(201).json(savedCountry);
  
    } catch (err) {
      console.log(err)
      res.status(500).json(err);
    }
  });


  router.put("/country/:id", verifyTokenAndRoles(["admin"]),async (req, res) => {
    try {
        
       
        const countryFetch = await Country.findById(req.params.id);
        if (!countryFetch) {
             return res.status(404).json({ error: 'Country not found' });
        }

        const employee = await Employee.findById(req.body.updatedBy);
        if (!employee) {
          return res.status(404).json({ message: "Employee not found" });
        }

        if (!req.body.name) {
            return res.status(404).json({ error: '"name" tag is compulsory for Country Name.' });
          }


      countryFetch.updatedBy = employee;
      countryFetch.name=req.body.name;
      countryFetch.updatedAt= new Date();
      const savedCountry = await countryFetch.save ();
      res.status(201).json(savedCountry);
  
    } catch (err) {
      console.log(err)
      res.status(500).json(err);
    }
  });
  


    //Disable
router.put("/country/disable/:id",verifyTokenAndAdmin,async (req,res)=>{
  try{
    let obj = await Country.findById(req.params.id);
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
  
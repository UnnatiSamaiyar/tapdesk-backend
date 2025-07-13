const router = require("express").Router();

const Employee = require("../../models/Employee");

const Currency = require("../../models/Master/Currency");

const { verifyTokenAndRoles, verifyToken ,verifyTokenAndAdmin} = require("../../utils/verifyToken");

const employeeFields = '_id name email phone';
router.get('/currencyActive',verifyToken, async (req, res) => {
  try {
  
    const currency = await Currency.find({status:true});

    res.status(200).json(currency);
  } catch (error) {

    res.status(500).json({ message: error.message });
  }
});


router.get('/currency',verifyToken, async (req, res) => {
    try {
    
      const currency = await Currency.find()
      .populate([
        { path: 'createdBy', select: employeeFields },
        { path: 'updatedBy', select: employeeFields }
      ]);
  
      res.status(200).json(currency);
    } catch (error) {
  
      res.status(500).json({ message: error.message });
    }
  });
  

 

  router.post("/currency", verifyTokenAndRoles(["admin"]),async (req, res) => {
    try {
      
        const { name, createdBy } = req.body;
        const existingCurrency = await Currency.findOne({ name: { $regex: new RegExp('^' + name + '$', 'i') } });
        const emp = await Employee.findById(createdBy);
        if(!emp){
          return res.status(404).json({messaage:"Create Employee not exist"})
        }

    if (existingCurrency) {
      return res.status(409).json({ error: name+' currency already exists' });
    }

        

      const newCurrency = new Currency({
        name: req.body.name,
        createdBy:createdBy

      });
  
      const savedCurrency = await newCurrency.save();
      res.status(201).json(savedCurrency);
  
    } catch (err) {
      console.log(err)
      res.status(500).json(err);
    }
  });


  router.put("/currency/:id", verifyTokenAndRoles(["admin"]),async (req, res) => {
    try {
        
        const { id } = req.params;
        const currencyFetch = await Currency.findById(req.params.id);
        if (!currencyFetch) {
             return res.status(404).json({ error: 'Currency not found' });
        }

        const employee = await Employee.findById(req.body.updatedBy);
        if (!employee) {
          return res.status(404).json({ message: "Employee not found" });
        }

        if (!req.body.name) {
            return res.status(404).json({ error: '"name" tag is compulsory for Currency Name.' });
          }


          currencyFetch.updatedBy = employee;
          currencyFetch.name=req.body.name;
          currencyFetch.updatedAt=new Date();
      const currencyUpdated = await currencyFetch.save ();
      res.status(201).json(currencyUpdated);
  
    } catch (err) {
      console.log(err)
      res.status(500).json(err);
    }
  });
  

      //Disable
router.put("/currency/disable/:id",verifyTokenAndAdmin,async (req,res)=>{
  try{
    let obj = await Currency.findById(req.params.id);
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
  
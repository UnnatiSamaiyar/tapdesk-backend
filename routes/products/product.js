const router = require("express").Router();
const Product = require("../../models/Master/Product");
const { verifyTokenAndRoles, verifyToken } = require("../../utils/verifyToken");
const Employee = require("../../models/Employee");
 



router.get('/',verifyToken, async(req,res)=>{
    try{    
        const products = await Product.find();
        res.status(200).json(products);
    }catch (error){
            res.status(500).json({message:error.message});
    }
});


router.post('/',verifyToken, async (req, res) => {
    try {

        let { name, type, logs, category,createdBy } = req.body;

        const lastDocument = await Product.findOne({}, {}, { sort: { 'productCode': -1 } });
        const nextProductCode = lastDocument ? lastDocument.productCode + 1 : 10000;
        // Make sure it's exactly 5 digits by padding with zeros if necessary
        //const paddedProductCode = String(nextProductCode).padStart(5, '0');
        const employee = await Employee.findById(createdBy);

        if (!employee) {
          return res.status(404).json({ message: "Employee not found" });
        }
        createdBy=employee;
        let productCode = nextProductCode;
        const newProduct = new Product({
            name,
            type,
            logs,
            category,
            productCode,
            createdBy,
        });

        await newProduct.save();

        res.status(201).json(newProduct);
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ error: 'Error adding product' });
    }
});


router.put("/:id", verifyTokenAndRoles(["admin"]),async (req, res) => {
    try {
        
        const { name, type, logs, category,updatedBy } = req.body;

        const { id } = req.params;
        const productFetch = await Product.findById(id);
        if (!productFetch) {
             return res.status(404).json({ error: 'Product not found' });
        }

        const employee = await Employee.findById(updatedBy);
        if (!employee) {
          return res.status(404).json({ message: "Employee not found" });
        }

        if (!name) {
            return res.status(404).json({ error: '"name" tag is compulsory for Product Name.' });
          }

          productFetch.name=name;
          productFetch.type=type;
          productFetch.logs=logs;
          productFetch.category=category;
          productFetch.updatedBy = employee;
          
      const productUpdated = await productFetch.save ();
      res.status(200).json(productUpdated);
  
    } catch (err) {
      console.log(err)
      res.status(500).json(err);
    }
  });
  


module.exports = router;
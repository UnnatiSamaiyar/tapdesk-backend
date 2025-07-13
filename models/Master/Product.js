const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

// Define schema for product
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  productId: {
    type: String,
    default: uuidv4,
    unique: true,
  },
  productCode: {
    type:  Number,
    unique: true,
    required:true,
  },
  type: {
    type: String,
  },
  logs: {
    type: String,
  },
  category: {
    type: String,
    enum: ["VOICE", "SMS"],
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default:null
  },
  status:{
    type:Boolean,
    default:true
  }
});




// Create model from schema
const Product = mongoose.model("Product", productSchema);



module.exports = Product;

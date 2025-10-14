// src/config/oldDb.js
const mongoose = require("mongoose");

let oldConnection;

const connectOldDB = async () => {
  try {
    oldConnection = await mongoose.createConnection(process.env.OLD_MONGO_URL);
    console.log(`✅ OLD DB connected: ${process.env.OLD_MONGO_URL}`);
    return oldConnection;
  } catch (error) {
    console.error("❌ Old DB connection failed:", error);
    throw error;
  }
};

module.exports = connectOldDB;

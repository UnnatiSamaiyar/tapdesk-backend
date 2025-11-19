// src/config/oldDb.js
const mongoose = require("mongoose");

let oldConnection = null;

const connectOldDB = async () => {
  try {
    // 🟢 If already connected → reuse it
    if (oldConnection && oldConnection.readyState === 1) {
      return oldConnection;
    }

    // 🟢 Create only once
    oldConnection = await mongoose.createConnection(process.env.OLD_MONGO_URL, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 5000,
    });

    console.log("✅ OLD DB connected (singleton)");
    return oldConnection;

  } catch (error) {
    console.error("❌ Old DB connection failed:", error);
    throw error;
  }
};

module.exports = connectOldDB;

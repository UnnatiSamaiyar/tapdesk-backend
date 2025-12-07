// utils/connectOldDB.js
const mongoose = require('mongoose');

let oldConnection = null;

async function connectOldDB() {
  if (oldConnection && oldConnection.readyState === 1) return oldConnection;

  const uri = process.env.OLD_MONGO_URL;
  if (!uri) throw new Error("OLD_MONGO_URL is required");

  if (!oldConnection) {
    oldConnection = mongoose.createConnection(uri, {
      maxPoolSize: parseInt(process.env.OLD_MONGO_POOL || "20"),
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false,
    });

    oldConnection.on("connected", () => {
      console.log("✅ OLD DB connected");
    });

    oldConnection.on("error", (err) => {
      console.error("❌ OLD DB connection error:", err);
    });
  }

  await new Promise(resolve =>
    oldConnection.readyState === 1 ? resolve() : oldConnection.once("connected", resolve)
  );

  return oldConnection;
}


module.exports = connectOldDB;

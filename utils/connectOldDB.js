// utils/connectOldDB.js
const mongoose = require('mongoose');

let oldConnection = null;

async function connectOldDB() {
  try {
    if (oldConnection && oldConnection.readyState === 1) return oldConnection;

    const uri = (process.env.OLD_MONGO_URL || '').trim();
    if (!uri) throw new Error('OLD_MONGO_URL is required');

    // createConnection returns a separate connection instance (good for old DB)
    oldConnection = await mongoose.createConnection(uri, {
      maxPoolSize: parseInt(process.env.OLD_MONGO_POOL || '20', 10),
      serverSelectionTimeoutMS: 5000,
      // no buffering indefinitely
      bufferCommands: false,
    });

    console.log('✅ OLD DB connected (singleton)');
    return oldConnection;
  } catch (err) {
    console.error('❌ Old DB connection failed:', err);
    throw err;
  }
}

module.exports = connectOldDB;

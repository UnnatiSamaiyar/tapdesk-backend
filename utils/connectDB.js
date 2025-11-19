// utils/connectDB.js
const mongoose = require('mongoose');

let connected = false;

async function connectDB() {
  if (connected && mongoose.connection.readyState === 1) return mongoose.connection;

  const uri = (process.env.MONGO_URL || process.env.MONGO_URI || '').trim();
  if (!uri) throw new Error('MONGO_URL / MONGO_URI is required');

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: parseInt(process.env.MONGO_POOL || '50', 10),
      serverSelectionTimeoutMS: 10000,
    });
    connected = true;
    console.log('✅ Main MongoDB connected');
    return mongoose.connection;
  } catch (err) {
    console.error('❌ Main MongoDB connection error:', err);
    throw err;
  }
}

module.exports = connectDB;

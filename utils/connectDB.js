const dotenv = require('dotenv');
dotenv.config();

// database connection function
const mongoose = require('mongoose');
mongoose.set('strictQuery', false);

const MONGO_URL = process.env.MONGO_URL;

// function to connect with DB
const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URL);
        console.log(`Database Running ${mongoose.connection.host}`);
    } catch (error) {
        console.log(error)
    }
};

module.exports = connectDB;

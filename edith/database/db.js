const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/edith_ai');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`[DATABASE] Failed to connect to MongoDB: ${error.message}`);
        console.warn(`[DATABASE] EDITH will continue in offline mode (History may not be saved).`);
    }
};

module.exports = connectDB;

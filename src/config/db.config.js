const mongoose = require('mongoose');
const logger = require('../utils/logger'); // We will create this utility later

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 6+ defaults these to true, but good to be explicit if using older versions
      // useNewUrlParser: true, 
      // useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

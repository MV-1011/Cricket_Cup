const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('==========================================');
      console.error('ERROR: MONGODB_URI environment variable is not set!');
      console.error('==========================================');
      console.error('Please set MONGODB_URI in your environment variables.');
      console.error('Example: mongodb+srv://user:pass@cluster.mongodb.net/dbname');
      console.error('See DEPLOYMENT.md for detailed instructions.');
      console.error('==========================================');
      console.error('Server will continue running but API calls will fail.');
      console.error('==========================================');
      return;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('Server will continue running but API calls will fail.');
  }
};

module.exports = connectDB;

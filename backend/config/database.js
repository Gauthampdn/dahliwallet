const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    await mongoose.connect(config.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connected successfully');
    console.log(`📍 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
    
    // Handle connection events
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error closing MongoDB connection:', error);
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

module.exports = { connectDB };

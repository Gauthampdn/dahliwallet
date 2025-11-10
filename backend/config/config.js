require('dotenv').config();

const config = {
  // Server Configuration
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/mcpwallet',
  
  // Frontend Configuration
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // Session Configuration
  SESSION_SECRET: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
  
  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback',
  
  // MCP Wallet Configuration
  WALLET_PASSWORD_LENGTH: 24,
  WALLET_URL_PREFIX: 'mcp_wallet_',
};

// Validation for required environment variables
const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];

if (config.NODE_ENV === 'production') {
  requiredEnvVars.push('SESSION_SECRET', 'MONGODB_URI');
}

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  if (config.NODE_ENV === 'production') {
    process.exit(1);
  }
}

module.exports = config;

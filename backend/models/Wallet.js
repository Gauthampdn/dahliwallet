const mongoose = require('mongoose');

// Server schema for servers within a wallet
const serverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  apiKey: {
    type: String,
    required: false, // Optional API key
    default: null
  }
}, {
  timestamps: true
});

const walletSchema = new mongoose.Schema({
  // Wallet's unique URL endpoint
  url: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  // Password removed: SSE-only access
  // Reference to the user who owns this wallet
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Array of MCP servers in this wallet
  servers: [serverSchema]
}, {
  timestamps: true
});

// Indexes for faster queries
walletSchema.index({ url: 1 });
walletSchema.index({ owner: 1 });
walletSchema.index({ createdAt: 1 });
walletSchema.index({ updatedAt: 1 });
walletSchema.index({ 'servers._id': 1 });

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;

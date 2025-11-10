const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  picture: {
    type: String,
    required: true
  },
  callsMade: {
    type: Number,
    default: 0
  },
  // Array of wallet IDs that belong to this user
  wallets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet'
  }],
  // User's default wallet password (randomly generated)
  walletPassword: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for faster queries
userSchema.index({ email: 1 });
userSchema.index({ wallets: 1 });
userSchema.index({ createdAt: 1 });
userSchema.index({ updatedAt: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;

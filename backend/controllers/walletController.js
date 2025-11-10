const Wallet = require('../models/Wallet');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

const generateWalletUrl = () => {
  // Generate a unique wallet URL identifier
  return uuidv4();
};

const walletController = {
  // GET /api/wallets - Get all wallets for authenticated user
  getUserWallets: async (req, res) => {
    try {
      const userId = req.user._id;
      const wallets = await Wallet.find({ owner: userId }).populate('servers');
      res.json({
        success: true,
        data: wallets
      });
    } catch (error) {
      console.error('❌ Error fetching user wallets:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch wallets' });
    }
  },

  // GET /api/wallets/:id - Get specific wallet
  getWallet: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const wallet = await Wallet.findOne({ _id: id, owner: userId }).populate('servers');
      if (!wallet) {
        return res.status(404).json({ success: false, message: 'Wallet not found' });
      }
      res.json({ success: true, data: wallet });
    } catch (error) {
      console.error('❌ Error fetching wallet:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch wallet' });
    }
  },

  // POST /api/wallets - Create new wallet
  createWallet: async (req, res) => {
    try {
      const userId = req.user._id;
      // Create new wallet (no password)
      const wallet = new Wallet({
        url: generateWalletUrl(),
        owner: userId,
        servers: []
      });
      await wallet.save();
      // Track wallet on user
      await User.findByIdAndUpdate(userId, { $push: { wallets: wallet._id } });
      res.status(201).json({ success: true, data: wallet, message: 'Wallet created successfully' });
    } catch (error) {
      console.error('❌ Error creating wallet:', error);
      res.status(500).json({ success: false, message: 'Failed to create wallet' });
    }
  },

  // PATCH /api/wallets/:id - Update wallet (no password operations remain)
  updateWallet: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const wallet = await Wallet.findOne({ _id: id, owner: userId });
      if (!wallet) {
        return res.status(404).json({ success: false, message: 'Wallet not found' });
      }
      await wallet.save();
      res.json({ success: true, data: wallet, message: 'Wallet updated successfully' });
    } catch (error) {
      console.error('❌ Error updating wallet:', error);
      res.status(500).json({ success: false, message: 'Failed to update wallet' });
    }
  },

  // DELETE /api/wallets/:id - Delete wallet
  deleteWallet: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const wallet = await Wallet.findOne({ _id: id, owner: userId });
      if (!wallet) {
        return res.status(404).json({ success: false, message: 'Wallet not found' });
      }
      await User.findByIdAndUpdate(userId, { $pull: { wallets: id } });
      await Wallet.findByIdAndDelete(id);
      res.json({ success: true, message: 'Wallet deleted successfully' });
    } catch (error) {
      console.error('❌ Error deleting wallet:', error);
      res.status(500).json({ success: false, message: 'Failed to delete wallet' });
    }
  }
};

module.exports = walletController;

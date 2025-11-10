const Wallet = require('../models/Wallet');
const { v4: uuidv4 } = require('uuid');

const serverController = {
  // GET /api/wallets/:walletId/servers - Get all servers in a wallet
  getServers: async (req, res) => {
    try {
      const { walletId } = req.params;
      const userId = req.user._id;
      
      const wallet = await Wallet.findOne({ _id: walletId, owner: userId });
      
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }
      
      res.json({
        success: true,
        data: wallet.servers
      });
    } catch (error) {
      console.error('❌ Error fetching servers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch servers'
      });
    }
  },

  // GET /api/wallets/:walletId/servers/:serverId - Get specific server
  getServer: async (req, res) => {
    try {
      const { walletId, serverId } = req.params;
      const userId = req.user._id;
      
      const wallet = await Wallet.findOne({ _id: walletId, owner: userId });
      
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }
      
      const server = wallet.servers.id(serverId);
      
      if (!server) {
        return res.status(404).json({
          success: false,
          message: 'Server not found'
        });
      }
      
      res.json({
        success: true,
        data: server
      });
    } catch (error) {
      console.error('❌ Error fetching server:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch server'
      });
    }
  },

  // POST /api/wallets/:walletId/servers - Add server to wallet
  addServer: async (req, res) => {
    try {
      const { walletId } = req.params;
      const { name, url, apiKey } = req.body;
      const userId = req.user._id;
      
      // Validate required fields
      if (!name || !url) {
        return res.status(400).json({
          success: false,
          message: 'Server name and URL are required'
        });
      }
      
      const wallet = await Wallet.findOne({ _id: walletId, owner: userId });
      
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }
      
      // Create new server object
      const newServer = {
        name: name.trim(),
        url: url.trim(),
        apiKey: apiKey ? apiKey.trim() : null
      };
      
      // Add server to wallet
      wallet.servers.push(newServer);
      await wallet.save();
      
      // Get the newly created server (last one in array)
      const addedServer = wallet.servers[wallet.servers.length - 1];
      
      res.status(201).json({
        success: true,
        data: addedServer,
        message: 'Server added successfully'
      });
    } catch (error) {
      console.error('❌ Error adding server:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add server'
      });
    }
  },

  // PATCH /api/wallets/:walletId/servers/:serverId - Update server
  updateServer: async (req, res) => {
    try {
      const { walletId, serverId } = req.params;
      const { name, url, apiKey } = req.body;
      const userId = req.user._id;
      
      const wallet = await Wallet.findOne({ _id: walletId, owner: userId });
      
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }
      
      const server = wallet.servers.id(serverId);
      
      if (!server) {
        return res.status(404).json({
          success: false,
          message: 'Server not found'
        });
      }
      
      // Update server fields
      if (name !== undefined) server.name = name.trim();
      if (url !== undefined) server.url = url.trim();
      if (apiKey !== undefined) server.apiKey = apiKey ? apiKey.trim() : null;
      
      await wallet.save();
      
      res.json({
        success: true,
        data: server,
        message: 'Server updated successfully'
      });
    } catch (error) {
      console.error('❌ Error updating server:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update server'
      });
    }
  },

  // DELETE /api/wallets/:walletId/servers/:serverId - Remove server from wallet
  deleteServer: async (req, res) => {
    try {
      const { walletId, serverId } = req.params;
      const userId = req.user._id;
      
      const wallet = await Wallet.findOne({ _id: walletId, owner: userId });
      
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }
      
      const server = wallet.servers.id(serverId);
      
      if (!server) {
        return res.status(404).json({
          success: false,
          message: 'Server not found'
        });
      }
      
      // Remove server from wallet
      wallet.servers.pull(serverId);
      await wallet.save();
      
      res.json({
        success: true,
        message: 'Server removed successfully'
      });
    } catch (error) {
      console.error('❌ Error deleting server:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete server'
      });
    }
  }
};

module.exports = serverController;

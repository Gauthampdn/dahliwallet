const express = require('express');
const walletController = require('../controllers/walletController');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// All wallet routes require authentication
router.use(isAuthenticated);

// Wallet CRUD routes
router.get('/', walletController.getUserWallets);           // GET /api/wallets
router.get('/:id', walletController.getWallet);            // GET /api/wallets/:id
router.post('/', walletController.createWallet);           // POST /api/wallets
router.patch('/:id', walletController.updateWallet);       // PATCH /api/wallets/:id
router.delete('/:id', walletController.deleteWallet);      // DELETE /api/wallets/:id

module.exports = router;

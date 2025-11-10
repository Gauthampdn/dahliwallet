const express = require('express');
const serverController = require('../controllers/serverController');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router({ mergeParams: true }); // mergeParams to access walletId from parent route

// All server routes require authentication
router.use(isAuthenticated);

// Server CRUD routes within wallets
router.get('/', serverController.getServers);              // GET /api/wallets/:walletId/servers
router.get('/:serverId', serverController.getServer);      // GET /api/wallets/:walletId/servers/:serverId
router.post('/', serverController.addServer);              // POST /api/wallets/:walletId/servers
router.patch('/:serverId', serverController.updateServer); // PATCH /api/wallets/:walletId/servers/:serverId
router.delete('/:serverId', serverController.deleteServer);// DELETE /api/wallets/:walletId/servers/:serverId

module.exports = router;

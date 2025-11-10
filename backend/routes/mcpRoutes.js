const express = require('express');
const mcpController = require('../controllers/mcpController');

const router = express.Router();

// Standard MCP endpoint that handles both GET (SSE) and POST (JSON-RPC) - no auth required
router.all('/', mcpController.mcpStandardEndpoint);
// Tokenized wallet-specific endpoint (e.g., /api/mcp/s/:token/mcp)
router.all('/s/:token/mcp', mcpController.mcpStandardEndpoint);

// Additional routes for debugging
router.get('/tools', mcpController.getWalletTools); // GET /api/mcp/tools - Get available tools
// Optional: tokenized tools listing for debugging a specific wallet
router.get('/s/:token/tools', mcpController.getWalletTools);

module.exports = router;

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const Wallet = require('../models/Wallet');
const User = require('../models/User');

// Helpers
const decodeWalletToken = (token) => {
  try {
    // Support base64 and base64url tokens
    const normalized = token.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(normalized, 'base64').toString('utf8');
    return decoded;
  } catch {
    return null;
  }
};

// Helper to create an MCP client transport to an upstream server with optional auth
const createUpstreamTransport = (url, apiKey) => {
  const requestInit = {};
  if (apiKey) {
    requestInit.headers = {
      Authorization: `Bearer ${apiKey}`
    };
  }
  return new StreamableHTTPClientTransport(url, { requestInit });
};

// Legacy custom SSE endpoint removed; use mcpStandardEndpoint instead

// GET /api/mcp/tools - Get available tools for a wallet (no auth required)
const getWalletTools = async (req, res) => {
  try {
    // Select wallet by tokenized path or walletId query, else latest
    const token = req.params.token;
    const walletId = req.query.walletId || (token ? decodeWalletToken(token) : undefined);
    let wallet = walletId
      ? await Wallet.findById(walletId)
      : await Wallet.findOne().sort({ createdAt: -1 });
    if (!wallet) {
      wallet = await Wallet.findOne().sort({ createdAt: -1 });
    }
    if (!wallet) {
      return res.json({
        success: true,
        data: {
          tools: [],
          endpointStatus: {},
          totalTools: 0,
          connectedServers: 0,
          totalServers: 0
        }
      });
    }

    console.log(`🔄 API: Connecting to ${wallet.servers.length} MCP servers...`);
    
    // Discover tools from all servers (same logic as SSE)
    const allTools = [];
    const endpointStatus = {};
    
    for (const server of wallet.servers) {
      const name = server.name;
      const url = server.url;
      const apiKey = server.apiKey;
      
      console.log(`🔄 Connecting to server: ${name} (${url})`);
      
      try {
        const transport = createUpstreamTransport(url, apiKey);
        const client = new Client({ 
          name: `mcp-wallet-${name}`, 
          version: '1.0.0' 
        });
        
        await client.connect(transport);
        const toolsResult = await client.listTools();
        
        // Namespace tools with server name
        const namespacedTools = toolsResult.tools.map(tool => ({
          name: `${name}.${tool.name}`,
          description: `[${name}] ${tool.description || 'No description'}`,
          inputSchema: tool.inputSchema || {
            type: 'object',
            properties: {},
            required: []
          }
        }));
        
        allTools.push(...namespacedTools);
        endpointStatus[name] = { connected: true, toolsCount: namespacedTools.length };
        
        await client.close();
        console.log(`✅ Connected to ${name}: ${namespacedTools.length} tools`);
      } catch (error) {
        console.error(`Failed to connect to server ${name}:`, error);
        endpointStatus[name] = { connected: false, error: error.message };
      }
    }
    
    console.log(`🔧 API: Found ${allTools.length} total tools`);
    console.log('📊 API: Endpoint status:', JSON.stringify(endpointStatus, null, 2));
    
    res.json({
      success: true,
      data: {
        tools: allTools,
        endpointStatus,
        totalTools: allTools.length,
        connectedServers: Object.values(endpointStatus).filter(s => s.connected).length,
        totalServers: wallet.servers.length
      }
    });

  } catch (error) {
    console.error('❌ Error getting wallet tools:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Spec-compliant MCP Streamable HTTP endpoint (handles GET SSE + POST JSON-RPC)
const mcpStandardEndpoint = async (req, res) => {
  try {
    // Select wallet by tokenized path or walletId in query/body, else latest
    const token = req.params.token;
    const walletId = (req.query && req.query.walletId) || (req.body && req.body.walletId) || (token ? decodeWalletToken(token) : undefined);
    let wallet = walletId
      ? await Wallet.findById(walletId)
      : await Wallet.findOne().sort({ createdAt: -1 });
    if (!wallet) {
      wallet = await Wallet.findOne().sort({ createdAt: -1 });
    }

    // Create a stateless transport (no session requirement) to maximize client compatibility
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: false
    });

    transport.onmessage = async (message) => {
      try {
        // If no wallet configured, respond with appropriate JSON-RPC error
        if (!wallet) {
          if (message && Object.prototype.hasOwnProperty.call(message, 'id')) {
            await transport.send({
              jsonrpc: '2.0',
              error: { code: -32004, message: 'No wallet configured' },
              id: message.id
            });
          }
          return;
        }

        const method = message && message.method;
        const id = message && message.id;

        if (method === 'initialize') {
          const requestedVersion = (message.params && message.params.protocolVersion) || req.headers['mcp-protocol-version'] || '2025-03-26';
          await transport.send({
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: requestedVersion,
              capabilities: {
                logging: {},
                tools: { listChanged: true }
              },
              serverInfo: {
                name: 'DahliWallet MCP Proxy',
                version: '1.0.0'
              }
            }
          });
          return;
        }

        if (method === 'tools/list') {
          const allTools = [];
          for (const server of wallet.servers) {
            const name = server.name;
            const url = server.url;
            const apiKey = server.apiKey;
            try {
              const upstream = createUpstreamTransport(url, apiKey);
              const client = new Client({ name: `mcp-wallet-${name}`, version: '1.0.0' });
              await client.connect(upstream);
              const toolsResult = await client.listTools();
              const namespacedTools = toolsResult.tools.map(tool => ({
                name: `${name}.${tool.name}`,
                description: `[${name}] ${tool.description || 'No description'}`,
                inputSchema: tool.inputSchema || { type: 'object', properties: {}, required: [] }
              }));
              allTools.push(...namespacedTools);
              await client.close();
            } catch (error) {
              // Ignore individual upstream failures; continue aggregating
            }
          }
          await transport.send({
            jsonrpc: '2.0',
            id,
            result: { tools: allTools }
          });
          return;
        }

        if (method === 'tools/call') {
          const tool = message.params && message.params.name;
          const input = (message.params && message.params.arguments) || {};
          if (!tool) {
            await transport.send({
              jsonrpc: '2.0',
              id,
              error: { code: -32602, message: 'Invalid params: tool name required' }
            });
            return;
          }
          const toolParts = String(tool).split('.');
          if (toolParts.length < 2) {
            await transport.send({
              jsonrpc: '2.0',
              id,
              error: { code: -32602, message: 'Tool name must be namespaced (e.g., "server.toolname")' }
            });
            return;
          }
          const namespace = toolParts[0];
          const toolName = toolParts.slice(1).join('.');
          const server = wallet.servers.find(s => s.name === namespace);
          if (!server) {
            await transport.send({
              jsonrpc: '2.0',
              id,
              error: { code: -32602, message: `Server '${namespace}' not found` }
            });
            return;
          }
          try {
            const upstream = createUpstreamTransport(server.url, server.apiKey);
            const client = new Client({ name: `mcp-wallet-${namespace}`, version: '1.0.0' });
            await client.connect(upstream);
            const result = await client.callTool({ name: toolName, arguments: input });
            await client.close();
            if (wallet.owner) {
              await User.findByIdAndUpdate(wallet.owner, { $inc: { callsMade: 1 } });
            }
            await transport.send({ jsonrpc: '2.0', id, result });
          } catch (error) {
            await transport.send({
              jsonrpc: '2.0',
              id,
              error: { code: -32603, message: `Failed to execute tool '${tool}'`, data: error.message }
            });
          }
          return;
        }

        // Unknown method
        if (Object.prototype.hasOwnProperty.call(message, 'id')) {
          await transport.send({
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: 'Method not found' }
          });
        }
      } catch (err) {
        // Best-effort error response if possible
        if (message && Object.prototype.hasOwnProperty.call(message, 'id')) {
          await transport.send({
            jsonrpc: '2.0',
            id: message.id,
            error: { code: -32603, message: 'Internal error', data: String(err && err.message ? err.message : err) }
          });
        }
      }
    };

    // Delegate HTTP handling to the transport (supports GET/POST/DELETE)
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP standard endpoint error:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32603, message: 'Internal error' },
      id: null
    });
  }
};

// Legacy JSON-RPC HTTP endpoint removed; use mcpStandardEndpoint instead

module.exports = {
  getWalletTools,
  mcpStandardEndpoint
};
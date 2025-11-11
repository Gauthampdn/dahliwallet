# MCP Wallet: Simple SSE Proxy for Multiple MCP Servers

## Overview

The MCP Wallet is a simple proxy that aggregates multiple MCP Server-Sent Event (SSE) endpoints behind a single URL with one password. Users add their MCP server URLs to the wallet, and it provides one unified endpoint for all their tools.

## The Problem We're Solving

### Current State (Fragmented)
- Users must configure each MCP server individually in their clients
- Each server requires separate URLs and API keys
- Tool name collisions between different MCP servers
- Manual management of multiple connections

### With MCP Wallet (Unified)
- **One URL**: `https://wallet.example.com/mcp`
- **One Password**: Randomly generated secure credential
- **Tool Namespacing**: Automatic prefixing (e.g., `hr.rank_resumes`, `legal.clause_extract`)
- **Encrypted Storage**: All data is hashed/encrypted in the database

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MCP Client    │    │   MCP Wallet    │    │ Upstream MCP    │
│  (Cursor/Claude)│    │   (Proxy)       │    │    Servers      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ URL: wallet.com │───▶│ Tool Discovery  │───▶│ hr.tools.com    │
│ Password: abc123│    │ Namespacing     │    │ legal.tools.com │
│                 │◄───│ Event Streaming │◄───│ db.query.com    │
└─────────────────┘    │ Encryption      │    └─────────────────┘
                       └─────────────────┘
```

## Core Components

### 1. Endpoint Management
Users can add multiple MCP server endpoints to their wallet:
```javascript
// Example endpoints stored (encrypted) in database
{
  "endpoints": [
    {
      "id": "endpoint_1",
      "name": "HR Tools", 
      "url": "https://hr.tools.com/mcp",
      "api_key": "encrypted_hr_key_hash"
    },
    {
      "id": "endpoint_2", 
      "name": "Legal Tools",
      "url": "https://legal.tools.com/mcp",
      "api_key": "encrypted_legal_key_hash"
    }
  ]
}
```

### 2. SSE Proxy with Generated Password
- **One URL**: `GET /mcp` with `Accept: text/event-stream`
- **One Password**: Randomly generated credential (e.g., `mcp_wallet_9f8e7d6c5b4a`)
- **Tool Calls**: `POST /mcp` for client → server messages

### 3. Tool Namespacing
The wallet automatically prefixes tools from different endpoints to avoid naming conflicts:

```javascript
// Tools discovered from endpoints
{
  "hr": {
    "tools": [
      {"name": "rank_resumes", "schema": {...}},
      {"name": "extract_keywords", "schema": {...}}
    ]
  },
  "legal": {
    "tools": [
      {"name": "clause_extract", "schema": {...}},
      {"name": "risk_score", "schema": {...}}
    ]
  }
}

// Client sees namespaced tools
{
  "type": "tools_available",
  "tools": [
    {"name": "hr.rank_resumes", "input_schema": {...}},
    {"name": "hr.extract_keywords", "input_schema": {...}},
    {"name": "legal.clause_extract", "input_schema": {...}},
    {"name": "legal.risk_score", "input_schema": {...}}
  ]
}
```

### 4. Encryption & Security
All sensitive data is encrypted in the database:

```javascript
// Database storage (everything hashed/encrypted)
{
  "wallet_id": "hash_of_wallet_id",
  "password_hash": "bcrypt_hash_of_generated_password", 
  "endpoints": [
    {
      "id": "encrypted_endpoint_id",
      "name": "encrypted_name",
      "url": "encrypted_url", 
      "api_key": "encrypted_api_key"
    }
  ]
}
```

## Request Flow

### 1. Tool Call Example
```bash
# Client request to wallet
curl -X POST https://wallet.example.com/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mcp_wallet_9f8e7d6c5b4a" \
  -d '{
    "type": "call_tool",
    "tool": "hr.rank_resumes", 
    "input": {
      "job_id": "J-2025-09",
      "candidates": [...],
      "top_k": 50
    }
  }'
```

### 2. Wallet Processing
1. **Authentication**: Validate password `mcp_wallet_9f8e7d6c5b4a`
2. **Routing**: Map `hr.rank_resumes` → `hr` endpoint + tool `rank_resumes`
3. **Decrypt**: Get real URL and API key for `hr` endpoint
4. **Forward**: Send request to `https://hr.tools.com/mcp` with their API key
5. **Response**: Stream results back to client

### 3. SSE Streaming
```bash
# Client opens SSE to wallet
curl -N https://wallet.example.com/mcp \
  -H "Accept: text/event-stream" \
  -H "Authorization: Bearer mcp_wallet_9f8e7d6c5b4a"

# Wallet streams aggregated events from all endpoints
data: {"type":"tools_available","tools":[...]}

data: {"type":"tool_started","tool":"hr.rank_resumes","request_id":"req_123"}

data: {"type":"chunk","request_id":"req_123","data":"Processing candidates..."}

data: {"type":"tool_result","request_id":"req_123","result":{"winners":[...]}}
```

## Simple Implementation

### Database Schema (Encrypted)
```javascript
// All data stored encrypted
{
  "wallet_id": "encrypted_wallet_id",
  "password_hash": "bcrypt_hash_of_generated_password",
  "created_at": "2025-01-01T00:00:00Z",
  "endpoints": [
    {
      "id": "encrypted_endpoint_id", 
      "name": "encrypted_display_name",
      "url": "encrypted_mcp_url",
      "api_key": "encrypted_api_key"
    }
  ]
}
```

### Core Proxy (Node.js + Express)
```javascript
// Simple wallet proxy implementation
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// Middleware to validate wallet password
function validatePassword(req, res, next) {
  const auth = req.headers.authorization || "";
  const password = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  
  if (!password) {
    return res.status(401).json({ error: "missing_password" });
  }
  
  // Check password against encrypted database
  const wallet = getWalletByPassword(password);
  if (!wallet) {
    return res.status(401).json({ error: "invalid_password" });
  }
  
  req.wallet = wallet;
  next();
}

// SSE endpoint
app.get("/mcp", validatePassword, async (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  // Get all tools from all endpoints
  const allTools = [];
  for (const endpoint of req.wallet.endpoints) {
    const decryptedUrl = decrypt(endpoint.url);
    const decryptedKey = decrypt(endpoint.api_key);
    
    // Connect to upstream and get tools
    const tools = await getToolsFromEndpoint(decryptedUrl, decryptedKey);
    tools.forEach(tool => {
      allTools.push({
        name: `${endpoint.name}.${tool.name}`,
        input_schema: tool.input_schema
      });
    });
  }
  
  // Send tools to client
  res.write(`data: ${JSON.stringify({
    type: "tools_available", 
    tools: allTools
  })}\n\n`);
});

// Tool call endpoint
app.post("/mcp", validatePassword, async (req, res) => {
  const { tool, input } = req.body;
  const [namespace, toolName] = tool.split(".", 2);
  
  // Find the endpoint
  const endpoint = req.wallet.endpoints.find(e => e.name === namespace);
  if (!endpoint) {
    return res.status(404).json({ error: "endpoint_not_found" });
  }
  
  // Decrypt and forward to real endpoint
  const realUrl = decrypt(endpoint.url);
  const realKey = decrypt(endpoint.api_key);
  
  const response = await fetch(realUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${realKey}`
    },
    body: JSON.stringify({
      type: "call_tool",
      tool: toolName,
      input: input
    })
  });
  
  // Stream response back
  response.body.pipe(res);
});
```

## User Experience

### Client Configuration (Cursor/Claude)
```
MCP Server Configuration:
┌─────────────────────────────────────────┐
│ Name: My MCP Wallet                     │
│ URL:  https://wallet.example.com/mcp    │  
│ Password: mcp_wallet_9f8e7d6c5b4a       │
│ Transport: SSE                          │
└─────────────────────────────────────────┘
```

### Wallet Management UI
Simple web interface to:
- **Add Endpoints**: Paste MCP server URLs and API keys
- **View Tools**: See all namespaced tools from all endpoints  
- **Generate Password**: Get your wallet password for clients
- **Delete Endpoints**: Remove MCP servers from wallet

## Benefits

### Simple & Secure
- **One URL + One Password**: Instead of managing multiple MCP connections
- **Encrypted Storage**: All endpoint URLs and API keys are encrypted in database
- **Tool Namespacing**: No conflicts between tools from different servers
- **Easy Setup**: Just add your MCP endpoints and get a single credential

## Getting Started

### 1. Create Wallet
```bash
# Clone and run MCP Wallet
git clone https://github.com/yourorg/mcp-wallet
cd mcp-wallet
npm install
npm start
```

### 2. Add Your MCP Endpoints
Visit `http://localhost:3000` and add your MCP servers:
```
Endpoint Name: HR Tools
MCP URL: https://hr.tools.com/mcp  
API Key: hr_api_key_123
```

### 3. Get Your Wallet Password
The wallet generates a password like: `mcp_wallet_9f8e7d6c5b4a`

### 4. Configure Client
Add to Cursor/Claude:
- URL: `http://localhost:3000/mcp`
- Password: `mcp_wallet_9f8e7d6c5b4a`

## How It Works

The MCP Wallet is a simple proxy that:

1. **Stores your MCP endpoints** (URLs + API keys) encrypted in a database
2. **Generates one password** for you to use in clients like Cursor/Claude  
3. **Namespaces tools** so `rank_resumes` from HR becomes `hr.rank_resumes`
4. **Routes requests** to the right endpoint when you call a tool
5. **Streams responses** back to your client seamlessly

Everything is encrypted so even if someone gets access to the database, they can't see your actual MCP server URLs or API keys.
# dahliwallet

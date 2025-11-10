# MCP Wallet Backend

Backend server for the MCP Wallet - a simple SSE proxy that aggregates multiple MCP Server-Sent Event (SSE) endpoints behind a single URL with one password.

## Features

- **Google OAuth Authentication**: Secure login using Google accounts
- **Wallet Management**: Create and manage MCP wallets with unique passwords
- **Server Management**: Add/remove MCP servers to/from wallets
- **RESTful API**: Full CRUD operations for wallets and servers
- **Security**: CORS, CSRF protection, rate limiting, and secure sessions

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file with the following variables:
   ```env
   # Server Configuration
   PORT=4000
   NODE_ENV=development

   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/mcpwallet

   # Frontend Configuration
   FRONTEND_URL=http://localhost:5173

   # Session Configuration
   SESSION_SECRET=your-super-secret-session-key-change-in-production-minimum-32-characters

   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
   ```

3. **Google OAuth Setup**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs: `http://localhost:4000/api/auth/google/callback`

4. **Start MongoDB**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo

   # Or use local MongoDB installation
   mongod
   ```

5. **Run the Server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## API Endpoints

### Authentication
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/status` - Check authentication status
- `GET /api/auth/logout` - Logout user

### Wallets
- `GET /api/wallets` - Get user's wallets
- `GET /api/wallets/:id` - Get specific wallet
- `POST /api/wallets` - Create new wallet
- `PATCH /api/wallets/:id` - Update wallet (regenerate password)
- `DELETE /api/wallets/:id` - Delete wallet

### Servers (within wallets)
- `GET /api/wallets/:walletId/servers` - Get servers in wallet
- `GET /api/wallets/:walletId/servers/:serverId` - Get specific server
- `POST /api/wallets/:walletId/servers` - Add server to wallet
- `PATCH /api/wallets/:walletId/servers/:serverId` - Update server
- `DELETE /api/wallets/:walletId/servers/:serverId` - Remove server from wallet

### Health Check
- `GET /api/health` - Server health status

## Models

### User
```javascript
{
  email: String,           // Google account email
  name: String,            // Display name
  picture: String,         // Profile picture URL
  callsMade: Number,       // API calls counter
  wallets: [ObjectId],     // References to user's wallets
  walletPassword: String   // Default wallet password
}
```

### Wallet
```javascript
{
  url: String,             // Unique wallet URL identifier
  password: String,        // Wallet access password
  owner: ObjectId,         // Reference to user
  servers: [Server]        // Array of MCP servers
}
```

### Server (Subdocument)
```javascript
{
  name: String,            // Display name for the server
  url: String,             // MCP server URL
  apiKey: String           // Optional API key
}
```

## Security Features

- **CORS Protection**: Configured for specific origins
- **CSRF Protection**: Origin/Referer validation
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Session Security**: Secure cookies, session regeneration
- **Helmet.js**: Security headers
- **Input Validation**: Trimmed and validated inputs

## Development

The backend follows the same structure as TallyrusV2:
- `/config` - Configuration files
- `/controllers` - Business logic
- `/middleware` - Custom middleware
- `/models` - MongoDB schemas
- `/routes` - API route definitions

## Next Steps

This is the base implementation. Future enhancements will include:
- Encryption for sensitive data
- MCP SSE proxy functionality
- Tool namespacing
- Request forwarding to upstream servers

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const rateLimit = require('express-rate-limit');

console.log('🔍 Starting MCP Wallet server initialization...');
const config = require('./config/config');

// Import routes
const authRoutes = require('./routes/authRoutes');
const walletRoutes = require('./routes/walletRoutes');
const serverRoutes = require('./routes/serverRoutes');
const mcpRoutes = require('./routes/mcpRoutes');

// Import passport configuration
const passport = require('./config/passport');
const { connectDB } = require('./config/database');

const app = express();
app.set('trust proxy', 1); // Trust first proxy for rate limiting
const PORT = config.PORT;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://accounts.google.com"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Loosen CORS specifically for MCP endpoint first (MCP clients may set custom headers and non-browser origins)
app.use('/api/mcp', cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'MCP-Protocol-Version', 'Mcp-Session-Id'],
  maxAge: 86400
}));

// General CORS configuration for the rest of the app (frontend)
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      config.FRONTEND_URL,
      // Development origins
      ...(config.NODE_ENV === 'development' ? [
        'http://localhost:5173',
        'http://127.0.0.1:5173'
      ] : [])
    ];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'MCP-Protocol-Version', 'Mcp-Session-Id'],
  maxAge: 86400
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session configuration
const sessionConfig = {
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: config.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  },
  name: 'connect.sid',
  rolling: true,
  unset: 'destroy'
};

app.use(session(sessionConfig));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Simple CSRF protection: verify Origin/Referer for mutating requests
const verifySameOrigin = (req, res, next) => {
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next();

  const origin = req.get('Origin');
  const referer = req.get('Referer');
  const allowed = [
    config.FRONTEND_URL,
    ...(config.NODE_ENV === 'development' ? [
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ] : [])
  ];

  const isAllowed = (url) => {
    if (!url) return false;
    try {
      const u = new URL(url);
      return allowed.some((allowedOrigin) => {
        try {
          const a = new URL(allowedOrigin);
          return a.protocol === u.protocol && a.host === u.host;
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  };

  if ((origin && isAllowed(origin)) || (referer && isAllowed(referer))) {
    return next();
  }

  return res.status(403).json({ 
    success: false, 
    message: 'Forbidden: CSRF origin check failed' 
  });
};

// Apply CSRF protection to API routes (except MCP endpoints)
app.use('/api', (req, res, next) => {
  // Skip CSRF for MCP endpoints (they use Bearer token auth)
  if (req.path.startsWith('/mcp')) {
    return next();
  }
  return verifySameOrigin(req, res, next);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/wallets/:walletId/servers', serverRoutes);
// Add MCP protocol header on all MCP responses
app.use('/api/mcp', (req, res, next) => {
  res.setHeader('MCP-Protocol-Version', '2025-03-26');
  next();
});
app.use('/api/mcp', mcpRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    message: 'MCP Wallet server is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation'
    });
  }
  
  res.status(500).json({
    success: false,
    message: config.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedUrl: req.originalUrl,
    method: req.method
  });
});

// Start server after database connection
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start the server; bind to 0.0.0.0 so external MCP clients can connect
    app.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 MCP Wallet server started successfully!');
      console.log(`📍 Server running on port ${PORT}`);
      console.log(`🌐 Frontend URL: ${config.FRONTEND_URL}`);
      console.log(`🔐 Google OAuth callback: ${config.GOOGLE_CALLBACK_URL}`);
      console.log(`⚙️  Environment: ${config.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

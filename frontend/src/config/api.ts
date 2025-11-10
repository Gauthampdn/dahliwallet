// Environment validation
const validateEnvironment = () => {
  const requiredVars = ['VITE_API_BASE_URL'];
  const missing = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missing.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`);
    console.warn('Using fallback values. This may cause issues in production.');
  }
  
  // Validate API base URL format
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
  if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
    console.error('❌ Invalid API_BASE_URL format. Must start with http:// or https://');
  }
  
  return { apiUrl };
};

// API Configuration
const { apiUrl } = validateEnvironment();
export const API_BASE_URL = apiUrl;

// Debug logging
const DEBUG = import.meta.env.VITE_DEBUG === 'true';

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH_STATUS: `${API_BASE_URL}/auth/status`,
  AUTH_GOOGLE: `${API_BASE_URL}/auth/google`,
  AUTH_LOGOUT: `${API_BASE_URL}/auth/logout`,
  
  // Wallet endpoints
  WALLETS: `${API_BASE_URL}/wallets`,
  WALLET_BY_ID: (id: string) => `${API_BASE_URL}/wallets/${id}`,
  
  // Server endpoints (within wallets)
  SERVERS: (walletId: string) => `${API_BASE_URL}/wallets/${walletId}/servers`,
  SERVER_BY_ID: (walletId: string, serverId: string) => 
    `${API_BASE_URL}/wallets/${walletId}/servers/${serverId}`,
  
  // MCP Proxy endpoints
  MCP_PROXY: `${API_BASE_URL}/mcp`,
  MCP_TOOLS: `${API_BASE_URL}/mcp/tools`,
  
  // Health check
  HEALTH: `${API_BASE_URL}/health`,
};

// Helper function for API calls
export const apiCall = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.message || `API call failed: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Check if response has the success field
  if (data.hasOwnProperty('success')) {
    if (!data.success) {
      throw new Error(data.message || 'API call failed');
    }
    return data;
  }
  
  // Return data in consistent format
  return { success: true, data: data };
};

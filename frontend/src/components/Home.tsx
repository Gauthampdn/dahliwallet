import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { API_ENDPOINTS, apiCall } from '@/config/api';
import { 
  Plus, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  Settings,
  Eye,
  EyeOff,
  Server,
  Wallet,
  ChevronDown,
  ChevronUp,
  Zap,
  RefreshCw
} from 'lucide-react';

interface Server {
  _id: string;
  name: string;
  url: string;
  apiKey?: string;
}

interface WalletData {
  _id: string;
  url: string;
  servers: Server[];
}

export const Home = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverToolCounts, setServerToolCounts] = useState<Record<string, number>>({});
  const [showToolsList, setShowToolsList] = useState(false);
  const [availableTools, setAvailableTools] = useState<Array<{
    name: string;
    description: string;
    serverName: string;
    serverId: string;
  }>>([]);

  useEffect(() => {
    if (user) {
      loadOrCreateWallet();
    }
  }, [user]);

  useEffect(() => {
    if (wallet && wallet.servers.length > 0) {
      // Fetch real tools from MCP servers
      fetchRealTools();
    } else {
      setServerToolCounts({});
      setAvailableTools([]);
    }
  }, [wallet]);

  const fetchRealTools = async () => {
    if (!wallet) return;

    try {
      console.log('🔍 Fetching real MCP tools...');
      
      const response = await apiCall(`${API_ENDPOINTS.MCP_TOOLS}?walletId=${wallet._id}`, {
        method: 'GET'
      });

      if (response.success) {
        const { tools, endpointStatus } = response.data;
        console.log(`✅ Fetched ${tools.length} real tools from MCP servers`);
        
        // Process tools and create tool counts
        const toolCounts: Record<string, number> = {};
        const processedTools: Array<{
          name: string;
          description: string;
          serverName: string;
          serverId: string;
        }> = [];

        // Initialize tool counts from endpoint status (if provided)
        wallet.servers.forEach((server) => {
          const status = endpointStatus?.[server.name];
          toolCounts[server._id] = status?.toolsCount || 0;
        });

        // Process tools: parse namespaced tool name "<serverName>.<toolName>"
        tools.forEach((tool: any) => {
          const nameParts = typeof tool.name === 'string' ? tool.name.split('.') : [];
          const serverName = nameParts.length > 1 ? nameParts[0] : undefined;
          if (!serverName) return;
          const server = wallet.servers.find(s => s.name === serverName);
          if (server) {
            processedTools.push({
              name: tool.name,
              description: tool.description || `Tool from ${server.name}`,
              serverName: server.name,
              serverId: server._id
            });
          }
        });

        // If endpointStatus is missing or zeroed, derive counts from tools list
        const derivedCounts: Record<string, number> = {};
        processedTools.forEach((t) => {
          derivedCounts[t.serverId] = (derivedCounts[t.serverId] || 0) + 1;
        });
        Object.keys(derivedCounts).forEach((sid) => {
          toolCounts[sid] = derivedCounts[sid];
        });

        setServerToolCounts(toolCounts);
        setAvailableTools(processedTools);
        
        console.log('📊 Tool counts by server:', toolCounts);
        console.log('🔧 Available tools:', processedTools.length);
        
      } else {
        console.error('❌ Failed to fetch tools:', response.message);
        // Fall back to empty state
        setServerToolCounts({});
        setAvailableTools([]);
      }
    } catch (error) {
      console.error('❌ Error fetching real tools:', error);
      
      // Fallback: show servers with 0 tools
      const fallbackCounts: Record<string, number> = {};
      wallet.servers.forEach((server) => {
        fallbackCounts[server._id] = 0;
      });
      setServerToolCounts(fallbackCounts);
      setAvailableTools([]);
    }
  };

  const loadOrCreateWallet = async () => {
    try {
      setLoading(true);
      
      // First, try to get existing wallets
      const walletsResponse = await apiCall(API_ENDPOINTS.WALLETS);
      
      if (walletsResponse.data && walletsResponse.data.length > 0) {
        // User already has a wallet
        setWallet(walletsResponse.data[0]);
      } else {
        // Create a new wallet automatically
        const createResponse = await apiCall(API_ENDPOINTS.WALLETS, {
          method: 'POST',
          body: JSON.stringify({})
        });
        
        if (createResponse.success) {
          setWallet(createResponse.data);
        } else {
          setError('Failed to create wallet');
        }
      }
    } catch (err: any) {
      console.error('Error loading/creating wallet:', err);
      setError(err.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toBase64Url = (value: string) => {
    try {
      const b64 = typeof window !== 'undefined'
        ? window.btoa(unescape(encodeURIComponent(value)))
        : Buffer.from(value, 'utf8').toString('base64');
      return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    } catch {
      return value;
    }
  };

  const getMCPUrl = () => {
    if (!wallet?._id) return `http://127.0.0.1:4000/api/mcp`;
    const token = toBase64Url(wallet._id);
    return `http://127.0.0.1:4000/api/mcp/s/${token}/mcp`;
  };

  const handleLogout = () => {
    logout(navigate);
  };

  const goToAddEndpoints = () => {
    if (wallet) {
      navigate(`/wallet/${wallet._id}/endpoints`);
    }
  };

  const getTotalToolsCount = () => {
    return Object.values(serverToolCounts).reduce((total, count) => total + count, 0);
  };

  const refreshTools = async () => {
    if (wallet) {
      await fetchRealTools();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your wallet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadOrCreateWallet} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Wallet className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-semibold">MCP Wallet</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <img 
                  src={user?.picture} 
                  alt={user?.name} 
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-sm text-gray-700">{user?.name}</span>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to your MCP Wallet</h2>
          <p className="text-gray-600">
            Your unified proxy for managing multiple MCP servers with a single URL.
          </p>
        </div>

        {wallet && (
          <div className="space-y-6">
            {/* Wallet Configuration Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Your Wallet Configuration
                </CardTitle>
                <CardDescription>
                  Use these credentials in your MCP client (Cursor, Claude, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="mcp-url">MCP SSE URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="mcp-url"
                      value={getMCPUrl()}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(getMCPUrl(), 'URL')}
                      className={copied ? 'border-green-500 text-green-600' : ''}
                    >
                      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  {/* Password removed: no longer needed */}
                  <Label htmlFor="mcp-url-note">No password required</Label>
                  <div className="text-xs text-gray-500">Use only the MCP SSE URL below.</div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-blue-900 mb-2">How to use:</h4>
                      <ol className="text-sm text-blue-800 space-y-1">
                        <li>1. Copy the MCP URL above</li>
                        <li>2. Add it to your MCP client configuration</li>
                        <li>3. Add MCP servers using the button below</li>
                      </ol>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-blue-600">
                        <div>Servers: {wallet.servers.length}</div>
                        <div>Available Tools: {getTotalToolsCount()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Available Tools Dropdown */}
            {availableTools.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Available Tools ({availableTools.length})
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={refreshTools}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowToolsList(!showToolsList)}
                      >
                        {showToolsList ? (
                          <>
                            <ChevronUp className="w-4 h-4 mr-2" />
                            Hide Tools
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4 mr-2" />
                            Show All Tools
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Real tools discovered from your connected MCP servers
                  </CardDescription>
                </CardHeader>
                {showToolsList && (
                  <CardContent>
                    <div className="space-y-4">
                      {wallet.servers.map((server) => {
                        const serverTools = availableTools.filter(tool => tool.serverId === server._id);
                        if (serverTools.length === 0) return null;
                        
                        return (
                          <div key={server._id} className="border rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Server className="w-4 h-4 text-blue-600" />
                              <h4 className="font-medium">{server.name}</h4>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                {serverTools.length} tools
                              </span>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {serverTools.map((tool, index) => (
                                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                                  <div className="font-mono text-sm font-medium text-gray-900">
                                    {tool.name}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {tool.description}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Servers Overview */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="w-5 h-5" />
                      MCP Servers ({wallet.servers.length})
                    </CardTitle>
                    <CardDescription>
                      Manage the MCP servers connected to your wallet
                    </CardDescription>
                  </div>
                  <Button onClick={goToAddEndpoints}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Endpoints
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {wallet.servers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No MCP servers yet</p>
                    <p className="text-sm mb-4">
                      Add your first MCP server to start using your wallet
                    </p>
                    <Button onClick={goToAddEndpoints} variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Server
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {wallet.servers.map((server) => (
                      <div key={server._id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{server.name}</div>
                          <div className="text-sm text-gray-500">{server.url}</div>
                          <div className="text-xs text-gray-400">
                          {server._id in serverToolCounts ? `${serverToolCounts[server._id]} tools` : 'Loading tools...'}
                            {server.apiKey && ' • API Key configured'}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2">
                      <Button onClick={goToAddEndpoints} variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add More Servers
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

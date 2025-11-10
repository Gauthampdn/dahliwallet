import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { API_ENDPOINTS, apiCall } from '@/config/api';
import { 
  ArrowLeft,
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle,
  Server,
  Wallet
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

export const AddEndpoints = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { walletId } = useParams();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [serverToolCounts, setServerToolCounts] = useState<Record<string, number>>({});
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    apiKey: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (walletId) {
      loadWallet();
    }
  }, [walletId]);

  useEffect(() => {
    if (wallet && wallet.servers.length > 0) {
      // Fetch real tools from MCP servers
      fetchRealTools();
    } else {
      setServerToolCounts({});
    }
  }, [wallet]);

  const fetchRealTools = async () => {
    if (!wallet) return;

    try {
      const response = await apiCall(`${API_ENDPOINTS.MCP_TOOLS}?walletId=${wallet._id}`, {
        method: 'GET'
      });

      if (response.success) {
        const { tools, endpointStatus } = response.data;
        
        // Create tool counts from endpoint status as baseline
        const toolCounts: Record<string, number> = {};
        wallet.servers.forEach((server) => {
          const status = endpointStatus[server.name];
          toolCounts[server._id] = status?.toolsCount || 0;
        });

        // Cross-check counts by parsing namespaced names
        const derivedCounts: Record<string, number> = {};
        tools.forEach((tool: any) => {
          const nameParts = typeof tool.name === 'string' ? tool.name.split('.') : [];
          const serverName = nameParts.length > 1 ? nameParts[0] : undefined;
          if (!serverName) return;
          const server = wallet.servers.find(s => s.name === serverName);
          if (!server) return;
          derivedCounts[server._id] = (derivedCounts[server._id] || 0) + 1;
        });

        // Prefer derived counts if present
        Object.keys(derivedCounts).forEach((sid) => {
          toolCounts[sid] = derivedCounts[sid];
        });

        setServerToolCounts(toolCounts);
      } else {
        // Fallback: show servers with 0 tools
        const fallbackCounts: Record<string, number> = {};
        wallet.servers.forEach((server) => {
          fallbackCounts[server._id] = 0;
        });
        setServerToolCounts(fallbackCounts);
      }
    } catch (error) {
      console.error('❌ Error fetching real tools in AddEndpoints:', error);
      
      // Fallback: show servers with 0 tools
      const fallbackCounts: Record<string, number> = {};
      wallet.servers.forEach((server) => {
        fallbackCounts[server._id] = 0;
      });
      setServerToolCounts(fallbackCounts);
    }
  };

  const loadWallet = async () => {
    try {
      setLoading(true);
      const response = await apiCall(API_ENDPOINTS.WALLET_BY_ID(walletId!));
      
      if (response.success) {
        setWallet(response.data);
      } else {
        setError('Failed to load wallet');
      }
    } catch (err: any) {
      console.error('Error loading wallet:', err);
      setError(err.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  const addServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Validate form
      if (!formData.name.trim() || !formData.url.trim()) {
        setError('Server name and URL are required');
        return;
      }

      const response = await apiCall(API_ENDPOINTS.SERVERS(walletId!), {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name.trim(),
          url: formData.url.trim(),
          apiKey: formData.apiKey.trim() || undefined
        })
      });

      if (response.success) {
        setSuccess('Server added successfully!');
        setFormData({ name: '', url: '', apiKey: '' });
        await loadWallet(); // Refresh the wallet data
        // Give the backend a moment to connect to the new server, then refresh tools
        setTimeout(() => {
          fetchRealTools();
        }, 2000);
      } else {
        setError(response.message || 'Failed to add server');
      }
    } catch (err: any) {
      console.error('Error adding server:', err);
      setError(err.message || 'Failed to add server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteServer = async (serverId: string, serverName: string) => {
    if (!confirm(`Are you sure you want to delete "${serverName}"?`)) return;

    try {
      const response = await apiCall(API_ENDPOINTS.SERVER_BY_ID(walletId!, serverId), {
        method: 'DELETE'
      });

      if (response.success) {
        setSuccess('Server deleted successfully!');
        await loadWallet(); // Refresh the wallet data
      } else {
        setError(response.message || 'Failed to delete server');
      }
    } catch (err: any) {
      console.error('Error deleting server:', err);
      setError(err.message || 'Failed to delete server');
    }
  };

  const handleLogout = () => {
    logout(navigate);
  };

  const goBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading wallet...</p>
        </div>
      </div>
    );
  }

  if (error && !wallet) {
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
            <div className="flex gap-2">
              <Button onClick={loadWallet} className="flex-1">
                Try Again
              </Button>
              <Button onClick={goBack} variant="outline" className="flex-1">
                Go Back
              </Button>
            </div>
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
              <Button variant="ghost" size="icon" onClick={goBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Wallet className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-semibold">Manage MCP Servers</h1>
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
        {/* Status Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Add New Server Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add New MCP Server
              </CardTitle>
              <CardDescription>
                Connect a new MCP server to your wallet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={addServer} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Server Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., HR Tools, Legal Assistant, Personal AI"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      A friendly name to identify this server
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="url">MCP Server URL</Label>
                    <Input
                      id="url"
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://your-mcp-server.com/mcp"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      The full URL to your MCP server endpoint
                    </p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="apiKey">API Key (Optional)</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Your MCP server API key (leave empty if not required)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Some MCP servers require an API key for authentication
                  </p>
                </div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Server'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Existing Servers */}
          {wallet && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  Your MCP Servers ({wallet.servers.length})
                </CardTitle>
                <CardDescription>
                  Manage your connected MCP servers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {wallet.servers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No servers configured yet</p>
                    <p className="text-sm">Add your first MCP server using the form above</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {wallet.servers.map((server) => (
                      <div key={server._id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{server.name}</div>
                          <div className="text-sm text-gray-500">{server.url}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {server._id in serverToolCounts ? `${serverToolCounts[server._id]} tools` : 'Loading tools...'}
                            {server.apiKey && ' • API Key configured'}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => deleteServer(server._id, server.name)}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

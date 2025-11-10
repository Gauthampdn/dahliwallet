import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

export const Login = () => {
  const { login } = useAuth();
  const [isUnsupportedBrowser, setIsUnsupportedBrowser] = useState(false);

  useEffect(() => {
    // Check for embedded browsers or user agents that might cause OAuth issues
    const userAgent = navigator.userAgent;
    const isEmbeddedBrowser = /WebView|wv|Version.*Chrome\/[.0-9]* Mobile|FB|FBAN|FBAV|Instagram|Twitter|Line|WhatsApp|Telegram/i.test(userAgent);
    const isOldBrowser = /Trident|MSIE/i.test(userAgent);
    
    if (isEmbeddedBrowser || isOldBrowser) {
      setIsUnsupportedBrowser(true);
    }
  }, []);

  const handleLogin = () => {
    if (isUnsupportedBrowser) {
      // For unsupported browsers, open in external browser
      const authUrl = window.location.origin.replace(':5173', ':4000') + '/api/auth/google';
      window.open(authUrl, '_blank');
      return;
    }
    login();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">MCP Wallet</CardTitle>
          <p className="text-gray-600">
            Your unified MCP server proxy
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Sign in to manage your MCP servers and access your wallet
            </p>
            {isUnsupportedBrowser && (
              <p className="text-xs text-orange-600 mb-4 bg-orange-50 p-2 rounded">
                ⚠️ You're using an embedded browser. Sign in will open in a new tab.
              </p>
            )}
          </div>
          
          <Button 
            onClick={handleLogin}
            className="w-full"
            size="lg"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>
          
          <p className="text-xs text-gray-500 text-center">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

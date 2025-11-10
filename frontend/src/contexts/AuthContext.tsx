import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { API_ENDPOINTS, apiCall } from '@/config/api';

interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  callsMade?: number;
  wallets?: string[];
  walletPassword?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  login: () => void;
  logout: (navigate?: (path: string) => void) => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const lastCheckRef = useRef<number>(0);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const CHECK_COOLDOWN_MS = 3000; // throttle repeated status checks

  const checkAuthStatus = async () => {
    // Return existing in-flight check to avoid bursts
    if (inFlightRef.current) return inFlightRef.current;
    // Throttle repeated checks within cooldown window
    const now = Date.now();
    if (now - lastCheckRef.current < CHECK_COOLDOWN_MS) return;

    const p = (async () => {
      try {
        const data = await apiCall(API_ENDPOINTS.AUTH_STATUS);
        if (data.data.authenticated) {
          setUser(data.data.user);
          setAuthenticated(true);
        } else {
          setUser(null);
          setAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth status check failed:', error);
        setUser(null);
        setAuthenticated(false);
      } finally {
        setLoading(false);
        lastCheckRef.current = Date.now();
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = p;
    return p;
  };

  const login = () => {
    window.location.href = API_ENDPOINTS.AUTH_GOOGLE;
  };

  const logout = async (navigate?: (path: string) => void) => {
    try {
      await apiCall(API_ENDPOINTS.AUTH_LOGOUT, { method: 'GET' });
      setUser(null);
      setAuthenticated(false);
      
      // Redirect to login page after logout
      if (navigate) {
        navigate('/login');
      } else {
        // Fallback to window.location if navigate function is not provided
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // Still redirect even if logout API call fails
      if (navigate) {
        navigate('/login');
      } else {
        window.location.href = '/login';
      }
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    authenticated,
    login,
    logout,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

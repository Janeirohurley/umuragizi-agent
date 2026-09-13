import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api, type AdminInfo } from '../api';

interface AuthContextType {
  admin: AdminInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    api.me()
      .then(setAdmin)
      .catch(() => localStorage.removeItem('admin_token'))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.login(username, password);
    localStorage.setItem('admin_token', res.token);
    const me = await api.me();
    setAdmin(me);
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      localStorage.removeItem('admin_token');
      setAdmin(null);
    }
  };

  return (
    <AuthContext.Provider value={{ admin, isAuthenticated: !!admin, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

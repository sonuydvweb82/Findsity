import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, clearToken, getToken, setToken } from '../services/api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  college: string;
  studentId?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());
  const [loading, setLoading] = useState<boolean>(Boolean(getToken()));

  const refreshUser = async () => {
    if (!getToken()) return;
    try {
      const res = await api.get<{ user: User }>('/api/auth/me');
      setUser(res.user);
    } catch {
      clearToken();
      setTokenState(null);
      setUser(null);
    }
  };

  useEffect(() => {
    void refreshUser().finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>('/api/auth/login', { email, password });
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  };

  const register = async (data: RegisterPayload) => {
    const res = await api.post<{ token: string; user: User }>('/api/auth/register', data);
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  };

  const logout = () => {
    clearToken();
    setTokenState(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout, refreshUser }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearToken, getToken, storeToken } from './api';

export interface LabUser {
  id: number;
  username: string;
  nama_lengkap?: string;
  email?: string;
  role?: string;
  saldo?: number;
  bio?: string;
  mfa_verified?: boolean;
  auth_method?: string;
}

interface AuthContextValue {
  user: LabUser | null;
  token: string;
  loading: boolean;
  mfaRequired: boolean;
  login: (username: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (patch: Partial<LabUser>) => void;
  clearMfa: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LabUser | null>(null);
  const [token, setToken] = useState(getToken());
  const [loading, setLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);

  const refresh = async () => {
    const { response, data } = await api('/api/auth/me');
    if (response.ok && data?.success) {
      setUser(data.user);
      setMfaRequired(!data.user.mfa_verified);
    } else {
      setUser(null);
      clearToken();
      setToken('');
      setMfaRequired(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (username: string, password: string) => {
    const { response, data } = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (response.ok && data?.success) {
      if (data.token) {
        storeToken(data.token);
        setToken(data.token);
      }
      setUser(data.user);
      setMfaRequired(!!data.mfa_required);
    }

    return { response, data };
  };

  const logout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      clearToken();
      setToken('');
      setUser(null);
      setMfaRequired(false);
    }
  };

  const updateUser = (patch: Partial<LabUser>) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      mfaRequired,
      login,
      logout,
      refresh,
      updateUser,
      clearMfa: () => setMfaRequired(false),
    }),
    [user, token, loading, mfaRequired]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return context;
}

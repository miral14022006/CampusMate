import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearAdminSession, getAdminToken, getAdminUser, setAdminSession } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getAdminToken());
  const [user, setUser] = useState(() => getAdminUser());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onAuth = (event) => {
      setToken(event.detail?.token || null);
      setUser(event.detail?.user || null);
    };
    window.addEventListener('campusmate:auth', onAuth);
    return () => window.removeEventListener('campusmate:auth', onAuth);
  }, []);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    try {
      const data = await api.admin.login({ username: username.trim(), password });
      setAdminSession(data.token, data.user);
      setToken(data.token);
      setUser(data.user || null);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAdminSession();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token),
      login,
      logout
    }),
    [token, user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside AuthProvider');
  return ctx;
}

export default AuthContext;

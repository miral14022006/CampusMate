import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  api,
  clearAdminSession,
  getAdminUser,
  getClientId,
  refreshSession,
  setAccessToken,
  setAdminSession
} from '../services/api';

const AuthContext = createContext(null);
const GUEST_MODE_DEFAULT = import.meta.env.VITE_GUEST_MODE !== 'false';

function decodeExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [config, setConfig] = useState({
    guestMode: GUEST_MODE_DEFAULT,
    signupEnabled: true,
    emailResetEnabled: false,
    inviteEnabled: true,
    allowedEmailDomains: ['pdeu.ac.in', 'campus.edu'],
    passwordMinLength: 8
  });
  const timerRef = useRef(null);

  const applySession = useCallback((nextToken, nextUser, reason = 'session') => {
    setAccessToken(nextToken);
    setToken(nextToken);
    setUser(nextUser || null);
    setStatus(nextToken ? 'authenticated' : 'anonymous');
    if (reason !== 'restore') {
      window.dispatchEvent(new CustomEvent('campusmate:auth', { detail: { token: nextToken, user: nextUser } }));
    }
  }, []);

  const scheduleRefresh = useCallback((accessToken) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const expiry = decodeExpiry(accessToken);
    if (!expiry) return;
    const delay = Math.max(expiry - Date.now() - 60_000, 5_000);
    timerRef.current = setTimeout(async () => {
      const data = await refreshSession();
      if (data?.accessToken) {
        setToken(data.accessToken);
        setUser(data.user || null);
        scheduleRefresh(data.accessToken);
      } else {
        setAccessToken(null);
        setToken(null);
        setUser(null);
        setStatus('anonymous');
      }
    }, delay);
  }, []);

  // Restore the session from the httpOnly refresh cookie exactly once on load.
  useEffect(() => {
    let cancelled = false;
    api.auth
      .config()
      .then((data) => {
        if (!cancelled && data) setConfig((current) => ({ ...current, ...data }));
      })
      .catch(() => {});

    refreshSession()
      .then((data) => {
        if (cancelled) return;
        if (data?.accessToken) {
          applySession(data.accessToken, data.user, 'restore');
          scheduleRefresh(data.accessToken);
        } else {
          setStatus(GUEST_MODE_DEFAULT ? 'guest' : 'anonymous');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus(GUEST_MODE_DEFAULT ? 'guest' : 'anonymous');
      });

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [applySession, scheduleRefresh]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible' || !token) return;
      const expiry = decodeExpiry(token);
      if (expiry && expiry - Date.now() < 120_000) {
        refreshSession().then((data) => {
          if (data?.accessToken) {
            applySession(data.accessToken, data.user, 'refresh');
            scheduleRefresh(data.accessToken);
          }
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [token, applySession, scheduleRefresh]);

  const login = useCallback(
    async (email, password, rememberMe = false) => {
      const data = await api.auth.login({ email: email.trim(), password, rememberMe });
      // The legacy admin endpoint returns `token`, students return `accessToken`.
      const accessToken = data.accessToken || data.token;
      applySession(accessToken, data.user, 'login');
      setAdminSession(accessToken, data.user);
      scheduleRefresh(accessToken);
      return data;
    },
    [applySession, scheduleRefresh]
  );

  const adminLogin = useCallback(
    async (identifier, password, rememberMe = false) => {
      const data = await api.admin.login({ email: identifier.trim(), username: identifier.trim(), password, rememberMe });
      const accessToken = data.accessToken || data.token;
      applySession(accessToken, data.user, 'login');
      setAdminSession(accessToken, data.user);
      scheduleRefresh(accessToken);
      return data;
    },
    [applySession, scheduleRefresh]
  );

  const signup = useCallback(
    async (payload) => {
      const data = await api.auth.signup(payload);
      applySession(data.accessToken, data.user, 'signup');
      setAdminSession(data.accessToken, data.user);
      scheduleRefresh(data.accessToken);
      return data;
    },
    [applySession, scheduleRefresh]
  );

  const resetLocalSession = useCallback((nextStatus) => {
    clearAdminSession();
    setAccessToken(null);
    setToken(null);
    setUser(null);
    setStatus(nextStatus);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      /* cookie may already be gone */
    }
    resetLocalSession(GUEST_MODE_DEFAULT ? 'guest' : 'anonymous');
  }, [resetLocalSession]);

  const logoutAll = useCallback(async () => {
    try {
      await api.auth.logoutAll();
    } catch {
      /* ignore */
    }
    resetLocalSession(GUEST_MODE_DEFAULT ? 'guest' : 'anonymous');
  }, [resetLocalSession]);

  const updateProfile = useCallback(async (patch) => {
    const data = await api.auth.updateMe(patch);
    setUser((current) => ({ ...current, ...(data.user || {}) }));
    return data;
  }, []);

  const changePassword = useCallback(async (payload) => {
    const data = await api.auth.changePassword(payload);
    setUser((current) => (current ? { ...current, mustChangePassword: false } : current));
    return data;
  }, []);

  const deleteAccount = useCallback(async () => {
    await api.auth.deleteAccount();
    resetLocalSession(GUEST_MODE_DEFAULT ? 'guest' : 'anonymous');
  }, [resetLocalSession]);

  const claimGuestHistory = useCallback(async () => {
    try {
      const data = await api.auth.claimGuestHistory();
      if (typeof window !== 'undefined') window.localStorage.removeItem('campusmate_has_guest_chats');
      return data;
    } catch {
      return { claimedCount: 0 };
    }
  }, []);

  const acceptInvite = useCallback(
    async (inviteToken, password) => {
      const data = await api.auth.acceptInvite({ token: inviteToken, password });
      applySession(data.accessToken, data.user, 'invite');
      setAdminSession(data.accessToken, data.user);
      scheduleRefresh(data.accessToken);
      return data;
    },
    [applySession, scheduleRefresh]
  );

  const continueAsGuest = useCallback(() => {
    setStatus('guest');
  }, []);

  const refresh = useCallback(async () => {
    const data = await refreshSession();
    if (data?.accessToken) {
      applySession(data.accessToken, data.user, 'refresh');
      scheduleRefresh(data.accessToken);
    }
    return data;
  }, [applySession, scheduleRefresh]);

  const value = useMemo(() => {
    const isAuthenticated = Boolean(token);
    const role = user?.role || null;
    return {
      token,
      user,
      status,
      loading: status === 'loading',
      restoring: status === 'loading',
      config,
      guestMode: config.guestMode !== false,
      isGuest: status === 'guest',
      isAuthenticated,
      isAdmin: isAuthenticated && (role === 'admin' || role === 'superadmin'),
      isSuperadmin: isAuthenticated && role === 'superadmin',
      role,
      clientId: getClientId(),
      login,
      adminLogin,
      signup,
      logout,
      logoutAll,
      updateProfile,
      changePassword,
      deleteAccount,
      claimGuestHistory,
      acceptInvite,
      continueAsGuest,
      refresh
    };
  }, [
    token,
    user,
    status,
    config,
    login,
    adminLogin,
    signup,
    logout,
    logoutAll,
    updateProfile,
    changePassword,
    deleteAccount,
    claimGuestHistory,
    acceptInvite,
    continueAsGuest,
    refresh
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function useAdminAuth() {
  return useAuth();
}

// Keeps compatibility with code written before Feature 16.
export const getStoredAdminUser = getAdminUser;

export default AuthContext;

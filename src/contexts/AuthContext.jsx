import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getMe, clearAuth } from '../services/api.js';

const AuthContext = createContext(null);

const USER_CACHE_KEY = 'user';

function readCachedUser() {
  try {
    if (typeof window === 'undefined') return null;
    if (!localStorage.getItem('accessToken')) return null;
    const raw = localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u && typeof u === 'object' ? u : null;
  } catch {
    return null;
  }
}

function persistUserCache(userData) {
  try {
    if (userData) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(userData));
    else localStorage.removeItem(USER_CACHE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readCachedUser);
  const [loading, setLoading] = useState(
    () => typeof window !== 'undefined' && !!localStorage.getItem('accessToken')
  );

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      persistUserCache(null);
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await getMe();
      setUser(data);
      persistUserCache(data);
    } catch {
      clearAuth();
      setUser(null);
      persistUserCache(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = (userData, tokens) => {
    if (tokens?.access_token) localStorage.setItem('accessToken', tokens.access_token);
    if (tokens?.refresh_token) localStorage.setItem('refreshToken', tokens.refresh_token);
    setUser(userData);
    persistUserCache(userData);
  };

  const logout = () => {
    clearAuth();
    setUser(null);
  };

  const isAuthenticated = !!user;

  const sessionPending = useMemo(
    () =>
      loading &&
      !user &&
      typeof window !== 'undefined' &&
      !!localStorage.getItem('accessToken'),
    [loading, user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated,
        sessionPending,
        refreshUser: loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

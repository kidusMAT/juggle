import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from './api';

/**
 * AuthContext — single source of truth for auth state.
 *
 * authStatus: 'loading' | 'authenticated' | 'unauthenticated'
 * user:       user data object when authenticated, null otherwise
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Start in 'loading' so no Login/Logout is shown until the /me check resolves.
  const [authStatus, setAuthStatus] = useState('loading');

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/users/me/');
      if (res.status === 200 && res.data?.id) {
        setUser(res.data);
        setAuthStatus('authenticated');
        return res.data;
      } else {
        setUser(null);
        setAuthStatus('unauthenticated');
        return null;
      }
    } catch {
      setUser(null);
      setAuthStatus('unauthenticated');
      return null;
    }
  }, []);

  // Run once on app mount to determine initial auth state.
  useEffect(() => {
    let ignore = false;
    async function initAuth() {
      try {
        await api.get('/csrf/');
        const res = await api.get('/users/me/');
        if (!ignore) {
          if (res.status === 200 && res.data?.id) {
            setUser(res.data);
            setAuthStatus('authenticated');
          } else {
            setUser(null);
            setAuthStatus('unauthenticated');
          }
        }
      } catch {
        if (!ignore) {
          setUser(null);
          setAuthStatus('unauthenticated');
        }
      }
    }
    initAuth();
    return () => {
      ignore = true;
    };
  }, []);

  const login = useCallback((userData) => {
    setUser(userData);
    setAuthStatus('authenticated');
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAuthStatus('unauthenticated');
  }, []);

  return (
    <AuthContext.Provider value={{ user, authStatus, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

/* eslint-disable-next-line react-refresh/only-export-components */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { loginRequest, registerRequest } from '../api/auth.js';

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = localStorage.getItem('ncpor_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    // Corrupt/old localStorage value — treat as logged out rather than crash.
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(false);

  // api/client.js clears localStorage and fires this event whenever a
  // request comes back 401 (expired/invalid token). Keep React state
  // in sync so the UI doesn't keep showing a "logged in" navbar for a
  // session that the server no longer honors.
  useEffect(() => {
    const onForcedLogout = () => setUser(null);
    window.addEventListener('ncpor:auth:logout', onForcedLogout);
    return () => window.removeEventListener('ncpor:auth:logout', onForcedLogout);
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { token, user: loggedInUser } = await loginRequest(email, password);
      localStorage.setItem('ncpor_token', token);
      localStorage.setItem('ncpor_user', JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      return loggedInUser;
    } finally {
      setLoading(false);
    }
  }, []);

  // The backend's /register only creates the user (no token), so log in
  // right after with the same credentials for a one-step signup flow.
  const register = useCallback(async ({ name, email, password, role }) => {
    setLoading(true);
    try {
      await registerRequest({ name, email, password, role });
      return await login(email, password);
    } finally {
      setLoading(false);
    }
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem('ncpor_token');
    localStorage.removeItem('ncpor_user');
    setUser(null);
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

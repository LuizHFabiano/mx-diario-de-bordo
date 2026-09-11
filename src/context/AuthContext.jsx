import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient } from '../data/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { user } = await apiClient('/api/auth/me');
        setCurrentUser(user);
      } catch {
        setCurrentUser(null);
      }
      setReady(true);
    })();
  }, []);

  const login = useCallback(async (username, password) => {
    try {
      const { user } = await apiClient('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setCurrentUser(user);
      return { ok: true, mustChangePassword: user.mustChangePassword };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient('/api/auth/logout', { method: 'POST' });
    } finally {
      setCurrentUser(null);
    }
  }, []);

  const changePassword = useCallback(
    async (current, next) => {
      try {
        await apiClient('/api/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({ currentPassword: current, newPassword: next }),
        });
        setCurrentUser((user) => ({ ...user, mustChangePassword: false }));
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error.message };
      }
    },
    [currentUser]
  );

  const value = { currentUser, ready, login, logout, changePassword };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

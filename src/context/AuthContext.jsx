import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { repo } from '../data/localRepository';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const email = await repo.getSession();
      if (email) {
        const users = await repo.getUsers();
        const found = users.find((u) => u.email === email);
        if (found) setCurrentUser(found);
      }
      setReady(true);
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const users = await repo.getUsers();
    const user = users.find((u) => u.email === email && u.password === password);
    if (!user) return { ok: false, error: 'E-mail ou senha inválidos.' };
    await repo.setSession(user.email);
    setCurrentUser(user);
    return { ok: true };
  }, []);

  const signup = useCallback(async (name, email, password) => {
    const users = await repo.getUsers();
    if (users.some((u) => u.email === email)) {
      return { ok: false, error: 'Já existe uma conta com este e-mail.' };
    }
    if (password.length < 4) {
      return { ok: false, error: 'A senha deve ter ao menos 4 caracteres.' };
    }
    const user = { name: name || email, email, password };
    users.push(user);
    await repo.saveUsers(users);
    await repo.setSession(user.email);
    setCurrentUser(user);
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await repo.clearSession();
    setCurrentUser(null);
  }, []);

  const changePassword = useCallback(
    async (current, next) => {
      const users = await repo.getUsers();
      const user = users.find((u) => u.email === currentUser.email);
      if (!user || user.password !== current) {
        return { ok: false, error: 'Senha atual incorreta.' };
      }
      if (next.length < 4) {
        return { ok: false, error: 'A nova senha deve ter ao menos 4 caracteres.' };
      }
      user.password = next;
      await repo.saveUsers(users);
      setCurrentUser(user);
      return { ok: true };
    },
    [currentUser]
  );

  const value = { currentUser, ready, login, signup, logout, changePassword };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

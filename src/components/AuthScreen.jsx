import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';
import logoMx from '../assets/logo-mx.png';
import logoMxDark from '../assets/logo-mx-dark.png';

export function AuthScreen({ theme }) {
  const { login } = useAuth();
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    const res = await login(loginForm.username.trim().toLowerCase(), loginForm.password);
    if (!res.ok) setError(res.error);
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand">
          <img className="brand__logo" src={theme === 'dark' ? logoMxDark : logoMx} alt="MX Soluções" />
        </div>
        <form className="auth-form" onSubmit={handleLogin}>
            <div className="field">
              <label htmlFor="loginUsername">Usuário</label>
              <input
                id="loginUsername"
                type="text"
                required
                autoComplete="username"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="loginPassword">Senha</label>
              <input
                id="loginPassword"
                type="password"
                required
                autoComplete="current-password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              />
            </div>
            {error && <p className="field__error is-visible">{error}</p>}
            <Button type="submit" variant="primary" className="btn--full">
              Entrar
            </Button>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';
import logoMx from '../assets/logo-mx.png';

export function AuthScreen() {
  const { login, signup } = useAuth();
  const [tab, setTab] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '', password2: '' });
  const [error, setError] = useState('');

  function switchTab(next) {
    setTab(next);
    setError('');
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    const res = await login(loginForm.email.trim().toLowerCase(), loginForm.password);
    if (!res.ok) setError(res.error);
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    if (signupForm.password !== signupForm.password2) {
      setError('As senhas não coincidem.');
      return;
    }
    const res = await signup(signupForm.name.trim(), signupForm.email.trim().toLowerCase(), signupForm.password);
    if (!res.ok) setError(res.error);
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand">
          <img className="brand__logo" src={logoMx} alt="MX Soluções" />
        </div>
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab${tab === 'login' ? ' is-active' : ''}`}
            onClick={() => switchTab('login')}
          >
            Entrar
          </button>
          <button
            type="button"
            className={`auth-tab${tab === 'signup' ? ' is-active' : ''}`}
            onClick={() => switchTab('signup')}
          >
            Criar conta
          </button>
        </div>

        {tab === 'login' ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="field">
              <label htmlFor="loginEmail">E-mail</label>
              <input
                id="loginEmail"
                type="email"
                required
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="loginPassword">Senha</label>
              <input
                id="loginPassword"
                type="password"
                required
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              />
            </div>
            {error && <p className="field__error is-visible">{error}</p>}
            <Button type="submit" variant="primary" className="btn--full">
              Entrar
            </Button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleSignup}>
            <div className="field">
              <label htmlFor="signupName">Nome</label>
              <input
                id="signupName"
                type="text"
                required
                value={signupForm.name}
                onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="signupEmail">E-mail</label>
              <input
                id="signupEmail"
                type="email"
                required
                value={signupForm.email}
                onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="signupPassword">Senha</label>
              <input
                id="signupPassword"
                type="password"
                required
                value={signupForm.password}
                onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="signupPassword2">Confirmar senha</label>
              <input
                id="signupPassword2"
                type="password"
                required
                value={signupForm.password2}
                onChange={(e) => setSignupForm({ ...signupForm, password2: e.target.value })}
              />
            </div>
            {error && <p className="field__error is-visible">{error}</p>}
            <Button type="submit" variant="primary" className="btn--full">
              Criar conta
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';
import logoMx from '../assets/logo-mx.png';
import logoMxDark from '../assets/logo-mx-dark.png';

export function RequiredPasswordChange({ theme }) {
  const { changePassword, logout } = useAuth();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (form.next !== form.confirm) {
      setError('A confirmação não corresponde à nova senha.');
      return;
    }
    const result = await changePassword(form.current, form.next);
    if (!result.ok) setError(result.error);
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand">
          <img className="brand__logo" src={theme === 'dark' ? logoMxDark : logoMx} alt="MX Soluções" />
        </div>
        <h2 className="auth-title">Troca de senha obrigatória</h2>
        <p className="hint">Defina uma nova senha para continuar.</p>
        <form className="auth-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="requiredCurrentPassword">Senha atual</label>
            <input id="requiredCurrentPassword" type="password" required autoComplete="current-password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="requiredNewPassword">Nova senha</label>
            <input id="requiredNewPassword" type="password" required minLength="9" autoComplete="new-password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="requiredConfirmPassword">Confirmar nova senha</label>
            <input id="requiredConfirmPassword" type="password" required minLength="9" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          </div>
          {error && <p className="field__error is-visible">{error}</p>}
          <Button type="submit" variant="primary" className="btn--full">Salvar nova senha</Button>
          <Button type="button" variant="ghost" className="btn--full" onClick={logout}>Sair</Button>
        </form>
      </div>
    </div>
  );
}

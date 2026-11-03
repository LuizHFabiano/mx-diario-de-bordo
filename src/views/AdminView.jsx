import { useEffect, useState } from 'react';
import { apiClient } from '../data/apiClient';
import { Header } from '../components/Header';
import { Button } from '../components/Button';

const EMPTY_FORM = {
  name: '',
  username: '',
  role: 'ATTENDANT',
  teamIds: [],
  primaryTeamId: '',
  managedTeamIds: [],
};

export function AdminView() {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [teamResult, userResult] = await Promise.all([
        apiClient('/api/admin/teams'),
        apiClient('/api/admin/users'),
      ]);
      setTeams(teamResult.teams);
      setUsers(userResult.users);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function toggleTeam(teamId) {
    const teamIds = form.teamIds.includes(teamId)
      ? form.teamIds.filter((id) => id !== teamId)
      : [...form.teamIds, teamId];
    const primaryTeamId = teamIds.includes(form.primaryTeamId) ? form.primaryTeamId : (teamIds[0] || '');
    setForm({ ...form, teamIds, primaryTeamId, managedTeamIds: form.managedTeamIds.filter((id) => teamIds.includes(id)) });
  }

  function toggleManagedTeam(teamId) {
    const managedTeamIds = form.managedTeamIds.includes(teamId)
      ? form.managedTeamIds.filter((id) => id !== teamId)
      : [...form.managedTeamIds, teamId];
    setForm({ ...form, managedTeamIds });
  }

  async function createUser(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      await apiClient('/api/admin/users', { method: 'POST', body: JSON.stringify(form) });
      setSuccess('Conta criada com a senha inicial Mudar@123. A troca será exigida no primeiro acesso.');
      setForm(EMPTY_FORM);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function toggleUserStatus(user) {
    setError('');
    try {
      await apiClient(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteUser(user) {
    const confirmed = window.confirm(
      `Excluir a conta "${user.name}" (${user.username})? Essa ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    setError('');
    setSuccess('');
    try {
      await apiClient(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      setSuccess('Conta excluída.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function startEditing(user) {
    setEditingUser(user);
    setEditName(user.name);
    setEditUsername(user.username);
    setEditPassword('');
    setEditError('');
  }

  function closeEditing() {
    setEditingUser(null);
    setEditPassword('');
    setEditError('');
  }

  async function saveUserIdentity(event) {
    event.preventDefault();
    if (!editingUser) return;

    setEditError('');
    try {
      const password = editPassword.trim();
      const body = { name: editName, username: editUsername };
      if (password) body.password = password;
      await apiClient(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      closeEditing();
      setSuccess(
        password
          ? 'Dados da conta atualizados. A senha foi redefinida e a troca será exigida no próximo login.'
          : 'Dados da conta atualizados.',
      );
      await load();
    } catch (requestError) {
      setEditError(requestError.message);
    }
  }

  return (
    <>
      <Header title="Administração" subtitle="Usuários, equipes e acessos" actions={null} />
      <div className="content-wrapper">
        <div className="config-grid admin-grid">
          <section className="config-card">
            <h3>Criar conta</h3>
            <p className="hint">A senha inicial é Mudar@123 e deve ser alterada no primeiro acesso.</p>
            <form onSubmit={createUser}>
              <div className="field"><label htmlFor="adminName">Nome</label><input id="adminName" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="field"><label htmlFor="adminUsername">Usuário</label><input id="adminUsername" required pattern="[A-Za-z0-9._-]+" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
              <div className="field"><label htmlFor="adminRole">Perfil</label><select id="adminRole" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, managedTeamIds: e.target.value === 'ATTENDANT' ? [] : form.managedTeamIds })}><option value="ATTENDANT">Atendente</option><option value="MANAGER">Gestor</option><option value="ADMIN">Administrador</option></select></div>
              <fieldset className="admin-fieldset"><legend>Equipes</legend>{teams.map((team) => <label key={team.id} className="check-row"><input type="checkbox" checked={form.teamIds.includes(team.id)} onChange={() => toggleTeam(team.id)} /> {team.name}</label>)}</fieldset>
              {form.teamIds.length > 0 && <div className="field"><label htmlFor="adminPrimaryTeam">Equipe principal</label><select id="adminPrimaryTeam" value={form.primaryTeamId} onChange={(e) => setForm({ ...form, primaryTeamId: e.target.value })}>{form.teamIds.map((teamId) => <option key={teamId} value={teamId}>{teams.find((team) => team.id === teamId)?.name}</option>)}</select></div>}
              {form.role !== 'ATTENDANT' && form.teamIds.length > 0 && <fieldset className="admin-fieldset"><legend>Equipes que gerencia</legend>{form.teamIds.map((teamId) => { const team = teams.find((item) => item.id === teamId); return <label key={teamId} className="check-row"><input type="checkbox" checked={form.managedTeamIds.includes(teamId)} onChange={() => toggleManagedTeam(teamId)} /> {team?.name}</label>; })}</fieldset>}
              <div className="config-actions"><Button type="submit" variant="primary">Criar conta</Button></div>
            </form>
            {error && <p className="field__error is-visible">{error}</p>}
            {success && <p className="field__success is-visible">{success}</p>}
          </section>
          <section className="config-card admin-users-card">
            <h3>Contas cadastradas</h3>
            {loading ? <p className="hint">Carregando contas...</p> : <div className="admin-user-list">{users.map((user) => <div className="admin-user-row" key={user.id}><div><strong>{user.name}</strong><span>{user.username} · {user.role === 'ADMIN' ? 'Administrador' : user.role === 'MANAGER' ? 'Gestor' : 'Atendente'}</span><small>{user.memberships.map((membership) => membership.team.name).join(', ') || 'Sem equipe'}{user.mustChangePassword ? ' · troca de senha pendente' : ''}</small></div><div className="admin-user-actions"><Button type="button" variant="ghost" onClick={() => startEditing(user)}>Editar</Button><Button type="button" variant={user.isActive ? 'ghost' : 'primary'} onClick={() => toggleUserStatus(user)}>{user.isActive ? 'Bloquear' : 'Reativar'}</Button><Button type="button" variant="danger" onClick={() => deleteUser(user)}>Excluir</Button></div></div>)}</div>}
          </section>
        </div>
      </div>
      {editingUser && <div className="modal-overlay is-open" role="presentation"><div className="modal admin-edit-modal" role="dialog" aria-modal="true" aria-labelledby="editAccountTitle"><h2 id="editAccountTitle" className="modal__title">Editar conta</h2><form onSubmit={saveUserIdentity}><div className="field"><label htmlFor="editAccountName">Nome de exibição</label><input id="editAccountName" required value={editName} onChange={(event) => setEditName(event.target.value)} /></div><div className="field"><label htmlFor="editAccountUsername">Nome de usuário</label><input id="editAccountUsername" required pattern="[A-Za-z0-9._-]+" value={editUsername} onChange={(event) => setEditUsername(event.target.value)} /></div><div className="field"><label htmlFor="editAccountPassword">Nova senha (opcional)</label><input id="editAccountPassword" type="password" minLength={9} maxLength={256} placeholder="Deixe em branco para manter a senha atual" value={editPassword} onChange={(event) => setEditPassword(event.target.value)} /></div>{editError && <p className="field__error is-visible">{editError}</p>}<div className="modal__actions"><Button type="button" variant="ghost" onClick={closeEditing}>Cancelar</Button><div className="modal__actions-right"><Button type="submit" variant="primary">Salvar</Button></div></div></form></div></div>}
    </>
  );
}

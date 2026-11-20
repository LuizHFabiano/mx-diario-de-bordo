import React, { useEffect, useState } from 'react';

interface User {
  id: string;
  username: string;
  name?: string;
  role: string;
  isActive: boolean;
}

interface Team {
  id: string;
  name: string;
  description?: string;
}

export const AdminView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Campos do formulário
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [creating, setCreating] = useState(false);

  const API_BASE = 'http://localhost:3000/api';

  const getHeaders = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Buscar Usuarios
      const resUsers = await fetch(`${API_BASE}/users`, {
        headers: getHeaders(),
        credentials: 'include'
      });

      if (resUsers.status === 401) {
        setErrorMsg('Sessão expirada ou não autenticada. Faça login novamente.');
        setLoading(false);
        return;
      }

      if (resUsers.ok) {
        const usersData = await resUsers.json();
        setUsers(usersData);
      }

      // Buscar Equipes
      const resTeams = await fetch(`${API_BASE}/teams`, {
        headers: getHeaders(),
        credentials: 'include'
      });

      if (resTeams.ok) {
        const teamsData = await resTeams.json();
        setTeams(teamsData);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name, username, password, role, teamId: selectedTeamId || undefined }),
        credentials: 'include'
      });

      if (res.ok) {
        setName('');
        setUsername('');
        setPassword('');
        alert('Usuário criado com sucesso!');
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao criar usuário');
      }
    } catch (err) {
      alert('Erro de conexão ao criar usuário');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto text-gray-100">
      <h1 className="text-2xl font-bold mb-6 text-white">Administração</h1>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-950/60 border border-red-500/50 text-red-300 rounded-md text-sm">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* BLOCO CRIAR CONTA */}
      <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-6 mb-8 shadow-lg">
        <h2 className="text-lg font-semibold mb-4 text-gray-200">Criar conta</h2>
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Nome completo</label>
            <input
              type="text"
              placeholder="Ex: João Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Nome de usuário / Login *</label>
            <input
              type="text"
              required
              placeholder="Ex: joao.silva"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Senha *</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Perfil / Função</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="USER">Usuário Comum</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-400 mb-1">Equipe Principal</label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Selecione uma equipe (opcional)</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 mt-2">
            <button
              type="submit"
              disabled={creating}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors shadow"
            >
              {creating ? 'Criando...' : 'Criar conta'}
            </button>
          </div>
        </form>
      </div>

      {/* TABELA CONTAS CADASTRADAS */}
      <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-200">Contas cadastradas</h2>
          <button
            onClick={loadData}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            🔄 Recarregar
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm py-4 text-center">Carregando usuários...</p>
        ) : users.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">Nenhuma conta cadastrada encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-900/80 text-gray-400 text-xs uppercase border-b border-gray-700">
                <tr>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">Perfil</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-700/30">
                    <td className="py-3 px-4 font-mono font-medium text-white">{u.username}</td>
                    <td className="py-3 px-4">{u.name || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${u.role === 'ADMIN' ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-gray-700 text-gray-300'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${u.isActive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
                        {u.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminView;

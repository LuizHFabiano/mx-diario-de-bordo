import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient } from '../data/apiClient';
import { formatDateKey } from '../utils/dateUtils';
import { useAuth } from './AuthContext';

const AppDataContext = createContext(null);
const DEFAULT_SETTINGS = { dayStart: '08:00', dayEnd: '23:00', allowManualClose: false };

function range() {
  const now = new Date();
  return { from: formatDateKey(new Date(now.getFullYear() - 1, 0, 1)), to: formatDateKey(now) };
}

export function AppDataProvider({ children }) {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [days, setDays] = useState({});
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [managedTeamIds, setManagedTeamIds] = useState([]);
  const [memberTeamIds, setMemberTeamIds] = useState([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const { from, to } = range();
    const data = await apiClient(`/api/diary?from=${from}&to=${to}`);
    setSettings(data.settings);
    setDays(data.days);
    setCategories(data.categories);
    setUsers(data.users);
    setTeams(data.teams);
    setManagedTeamIds(data.managedTeamIds || []);
    setMemberTeamIds(data.memberTeamIds || []);
    setReady(true);
  }, []);

  useEffect(() => { load().catch(() => setReady(true)); }, [load]);
  useEffect(() => {
    const id = setInterval(() => load().catch(() => {}), 60_000);
    return () => clearInterval(id);
  }, [load]);

  const addTask = useCallback(async (dateKey, input) => {
    await apiClient('/api/tasks', { method: 'POST', body: JSON.stringify({ date: dateKey, ...input }) });
    await load();
  }, [load]);
  const updateTask = useCallback(async (_, taskId, patch) => {
    await apiClient(`/api/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(patch) });
    await load();
  }, [load]);
  const removeTask = useCallback(async (_, taskId) => {
    await apiClient(`/api/tasks/${taskId}`, { method: 'DELETE' });
    await load();
  }, [load]);
  const closeDayManually = useCallback(async (dateKey) => {
    await apiClient(`/api/work-days/${dateKey}/close`, { method: 'POST' });
    await load();
  }, [load]);
  const updateSettings = useCallback(async (patch) => {
    const { settings: next } = await apiClient('/api/settings', { method: 'PATCH', body: JSON.stringify(patch) });
    setSettings(next);
  }, []);
  const addCategory = useCallback(async (name, color) => {
    await apiClient('/api/categories', { method: 'POST', body: JSON.stringify({ name, color }) });
    await load();
  }, [load]);
  const updateCategory = useCallback(async (id, patch) => {
    await apiClient(`/api/categories/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    await load();
  }, [load]);
  const deleteCategory = useCallback(async (id) => {
    await apiClient(`/api/categories/${id}`, { method: 'DELETE' });
    await load();
  }, [load]);
  const canEditTask = useCallback((task) => {
    if (currentUser.role === 'ADMIN' || task.userId === currentUser.id) return true;
    return currentUser.role === 'MANAGER' && managedTeamIds.includes(task.teamId);
  }, [currentUser, managedTeamIds]);

  const value = { ready, settings, days, categories, users, teams, managedTeamIds, memberTeamIds, load, addTask, updateTask, removeTask, closeDayManually, updateSettings, addCategory, updateCategory, deleteCategory, canEditTask };
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}

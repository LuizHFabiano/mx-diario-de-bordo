import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { repo } from '../data/localRepository';
import { timeStore } from '../lib/timeStore';
import { formatDateKey } from '../utils/dateUtils';
import { useAuth } from './AuthContext';

const AppDataContext = createContext(null);

const DEFAULT_SETTINGS = { dayStart: '08:00', dayEnd: '18:00', allowManualClose: false };

export function AppDataProvider({ children }) {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [days, setDays] = useState({});
  const [categories, setCategories] = useState([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const [shared, cats] = await Promise.all([repo.getSharedData(), repo.getCategories()]);
    setSettings(shared.settings);
    setDays(shared.days);
    setCategories(cats);
    setReady(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const syncDays = useCallback(async () => {
    const shared = await repo.getSharedData();
    const now = new Date(Date.now() + timeStore.getOffset());
    const todayKey = formatDateKey(now);
    let changed = false;
    Object.keys(shared.days).forEach((key) => {
      if (key < todayKey && !shared.days[key].closed) {
        shared.days[key].closed = true;
        changed = true;
      }
    });
    if (!shared.days[todayKey]) {
      shared.days[todayKey] = { closed: false, tasks: [] };
      changed = true;
    }
    if (changed) {
      await repo.saveSharedData(shared);
      setDays(shared.days);
    }
    return { todayKey, changed };
  }, []);

  useEffect(() => {
    if (!ready) return;
    syncDays();
    const id = setInterval(syncDays, 5000);
    return () => clearInterval(id);
  }, [ready, syncDays]);

  const addTask = useCallback(
    async (dateKey, input) => {
      const shared = await repo.getSharedData();
      const day = shared.days[dateKey];
      if (!day || day.closed) return;
      day.tasks.push({
        id: Date.now(),
        title: input.title,
        start: input.start,
        end: input.end || null,
        description: input.description,
        categoryId: input.categoryId || null,
        userEmail: currentUser.email,
        userName: currentUser.name,
      });
      await repo.saveSharedData(shared);
      setDays({ ...shared.days });
    },
    [currentUser]
  );

  const updateTask = useCallback(
    async (dateKey, taskId, patch) => {
      const shared = await repo.getSharedData();
      const day = shared.days[dateKey];
      if (!day || day.closed) return;
      const task = day.tasks.find((t) => t.id === taskId);
      if (!task || task.userEmail !== currentUser.email) return;
      Object.assign(task, patch);
      await repo.saveSharedData(shared);
      setDays({ ...shared.days });
    },
    [currentUser]
  );

  const removeTask = useCallback(
    async (dateKey, taskId) => {
      const shared = await repo.getSharedData();
      const day = shared.days[dateKey];
      if (!day || day.closed) return;
      const task = day.tasks.find((t) => t.id === taskId);
      if (!task || task.userEmail !== currentUser.email) return;
      day.tasks = day.tasks.filter((t) => t.id !== taskId);
      await repo.saveSharedData(shared);
      setDays({ ...shared.days });
    },
    [currentUser]
  );

  const closeDayManually = useCallback(async (dateKey) => {
    const shared = await repo.getSharedData();
    if (!shared.days[dateKey]) return;
    shared.days[dateKey].closed = true;
    await repo.saveSharedData(shared);
    setDays({ ...shared.days });
  }, []);

  const updateSettings = useCallback(async (patch) => {
    const shared = await repo.getSharedData();
    shared.settings = { ...shared.settings, ...patch };
    await repo.saveSharedData(shared);
    setSettings(shared.settings);
  }, []);

  const addCategory = useCallback(async (name, color) => {
    const list = await repo.getCategories();
    list.push({ id: `cat_${Date.now()}`, name, color });
    await repo.saveCategories(list);
    setCategories([...list]);
  }, []);

  const updateCategory = useCallback(async (id, patch) => {
    const list = await repo.getCategories();
    const category = list.find((c) => c.id === id);
    if (category) Object.assign(category, patch);
    await repo.saveCategories(list);
    setCategories([...list]);
  }, []);

  const deleteCategory = useCallback(async (id) => {
    const list = (await repo.getCategories()).filter((c) => c.id !== id);
    await repo.saveCategories(list);
    setCategories(list);

    const shared = await repo.getSharedData();
    Object.values(shared.days).forEach((day) => {
      day.tasks.forEach((task) => {
        if (task.categoryId === id) task.categoryId = null;
      });
    });
    await repo.saveSharedData(shared);
    setDays({ ...shared.days });
  }, []);

  const value = {
    ready,
    settings,
    days,
    categories,
    syncDays,
    addTask,
    updateTask,
    removeTask,
    closeDayManually,
    updateSettings,
    addCategory,
    updateCategory,
    deleteCategory,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}

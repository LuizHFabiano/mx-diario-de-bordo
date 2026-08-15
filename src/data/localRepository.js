const DEFAULT_SETTINGS = { dayStart: '08:00', dayEnd: '23:00', allowManualClose: false };
const DEFAULT_CATEGORIES = [{ id: 'cat_pop_os', name: 'PoP de OS', color: '#E5484D' }];

function read(key, fallback) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// This object is the only place in the app that talks to localStorage.
// Every method returns a Promise on purpose, even though the current
// implementation is synchronous under the hood. Views and contexts always
// call it with `await`, so the day this needs to become a real HTTP client
// (fetch("/api/..."), Supabase, Firebase, etc.) the only file that changes
// is this one — nothing in context/ or views/ has to know the difference.
export const repo = {
  async getUsers() {
    return read('mx_users', []);
  },
  async saveUsers(list) {
    write('mx_users', list);
  },

  async getSharedData() {
    const existing = localStorage.getItem('mx_shared');
    if (existing) return JSON.parse(existing);
    const fresh = { settings: DEFAULT_SETTINGS, days: {} };
    write('mx_shared', fresh);
    return fresh;
  },
  async saveSharedData(data) {
    write('mx_shared', data);
  },

  async getCategories() {
    const existing = localStorage.getItem('mx_categories');
    if (existing) return JSON.parse(existing);
    write('mx_categories', DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  },
  async saveCategories(list) {
    write('mx_categories', list);
  },

  async getSession() {
    return localStorage.getItem('mx_session');
  },
  async setSession(email) {
    localStorage.setItem('mx_session', email);
  },
  async clearSession() {
    localStorage.removeItem('mx_session');
  },
};

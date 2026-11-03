const DEFAULT_SETTINGS = {
  dayStart: "08:00",
  dayEnd: "23:00",
  allowManualClose: false,
};
const DEFAULT_CATEGORIES = [
  { id: "cat_pop_os", name: "PoP", color: "#E5484D" },
];
const DEFAULT_ADMIN = {
  name: "admin",
  email: "admin@teste.com",
  password: "admin",
  role: "admin",
};

function read(key, fallback) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const repo = {
  async getUsers() {
    const users = read("mx_users", []);
    const admin = users.find((user) => user.email === DEFAULT_ADMIN.email);
    if (!admin) {
      users.push({ ...DEFAULT_ADMIN });
      write("mx_users", users);
    } else if (admin.role !== "admin") {
      admin.role = "admin";
      write("mx_users", users);
    }
    return users;
  },
  async saveUsers(list) {
    write("mx_users", list);
  },

  async getSharedData() {
    const existing = localStorage.getItem("mx_shared");
    if (existing) return JSON.parse(existing);
    const fresh = { settings: DEFAULT_SETTINGS, days: {} };
    write("mx_shared", fresh);
    return fresh;
  },
  async saveSharedData(data) {
    write("mx_shared", data);
  },

  async getCategories() {
    const existing = localStorage.getItem("mx_categories");
    if (existing) return JSON.parse(existing);
    write("mx_categories", DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  },
  async saveCategories(list) {
    write("mx_categories", list);
  },

  async getSession() {
    return localStorage.getItem("mx_session");
  },
  async setSession(email) {
    localStorage.setItem("mx_session", email);
  },
  async clearSession() {
    localStorage.removeItem("mx_session");
  },
};

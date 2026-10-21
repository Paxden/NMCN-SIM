const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const TK = "cbt-trainer-token";

export const getToken = () => localStorage.getItem(TK);
export const setToken = (t) => (t ? localStorage.setItem(TK, t) : localStorage.removeItem(TK));
export const hasToken = () => !!getToken();

async function call(method, path, body) {
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Cannot reach the server");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) setToken(null);
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  register: (b) => call("POST", "/auth/register", b),
  login: (b) => call("POST", "/auth/login", b),
  me: () => call("GET", "/auth/me"),
  saveProgress: (b) => call("PUT", "/auth/progress", b),
  startAttempt: () => call("POST", "/attempts"),
  submitAttempt: (id, tasks) => call("POST", `/attempts/${id}/submit`, { tasks }),
  myAttempts: () => call("GET", "/attempts/mine"),
  summary: () => call("GET", "/admin/summary"),
  managers: (status) => call("GET", `/admin/managers${status ? `?status=${status}` : ""}`),
  managerAttempts: (id) => call("GET", `/admin/managers/${id}/attempts`),
  assign: (id, centre) => call("PATCH", `/admin/managers/${id}/assignment`, { centre }),
  createUser: (b) => call("POST", "/admin/users", b),
};

import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api.me().then((r) => setUser(r.user)).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);

  const finish = (r) => { setToken(r.token); setUser(r.user); return r.user; };
  const value = {
    user, ready,
    login: async (email, password) => finish(await api.login({ email, password })),
    register: async (b) => finish(await api.register(b)),
    logout: () => { setToken(null); setUser(null); },
    refresh: () => api.me().then((r) => setUser(r.user)).catch(() => {}),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

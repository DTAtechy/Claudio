import { create } from "zustand";
import type { User } from "@claudio/shared";
import { api, getToken, setToken } from "@/lib/api";

interface AuthState {
  user: User | null;
  loading: boolean;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  init: async () => {
    if (!getToken()) {
      set({ loading: false });
      return;
    }
    try {
      const me = await api.me();
      set({ user: me, loading: false });
    } catch {
      setToken(null);
      set({ user: null, loading: false });
    }
  },
  login: async (email, password) => {
    const res = await api.login({ email, password });
    setToken(res.token);
    set({ user: res.user });
  },
  register: async (email, name, password) => {
    const res = await api.register({ email, name, password });
    setToken(res.token);
    set({ user: res.user });
  },
  logout: () => {
    setToken(null);
    set({ user: null });
  },
}));

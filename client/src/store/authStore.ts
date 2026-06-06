import { create } from 'zustand';
import api from '../api/client';

interface AuthState {
  loggedIn: boolean;
  loading: boolean;
  checkStatus: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  loggedIn: false,
  loading: true,
  checkStatus: async () => {
    try {
      const { data } = await api.get<{ loggedIn: boolean }>('/auth/status');
      set({ loggedIn: data.loggedIn, loading: false });
    } catch {
      set({ loggedIn: false, loading: false });
    }
  },
  logout: async () => {
    await api.post('/auth/logout');
    set({ loggedIn: false });
  },
}));

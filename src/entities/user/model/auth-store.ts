import { create } from 'zustand';
import type { User } from './types';

interface AuthState {
  token: string | null;
  user: User | null;
  login: (token: string, user: { id: string; email: string; role: string }) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>(set => ({
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  login: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },
  get isAuthenticated() {
    return !!this.token;
  },
}));

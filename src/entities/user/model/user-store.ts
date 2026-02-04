import { create } from 'zustand';
import { apiClient } from '@/shared/api/interceptor';
import { getErrorMessage } from '@/shared/api/errorUtils';
import type { User } from './types';

interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  createUser: (userData: {
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
  }) => Promise<void>;
  updateUser: (id: string, userData: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  inviteUser: (email: string) => Promise<void>;
}

export const useUserStore = create<UserState>(set => ({
  users: [],
  loading: false,
  error: null,

  fetchUsers: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get('/users');
      set({ users: response.data, loading: false });
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка загрузки пользователей', loading: false });
    }
  },

  createUser: async userData => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post('/users', userData);
      set(state => ({ users: [...state.users, response.data], loading: false }));
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка создания пользователя', loading: false });
    }
  },

  updateUser: async (id, userData) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.put(`/users/${id}`, userData);
      set(state => ({
        users: state.users.map(u => (u.id === id ? response.data : u)),
        loading: false,
      }));
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка обновления пользователя', loading: false });
    }
  },

  deleteUser: async id => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/users/${id}`);
      set(state => ({
        users: state.users.filter(u => u.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка удаления пользователя', loading: false });
    }
  },

  inviteUser: async email => {
    set({ loading: true, error: null });
    try {
      await apiClient.post('/invitations', { email });
      // Не обновляем список - приглашённый пользователь пока не активен
      set({ loading: false });
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка приглашения пользователя', loading: false });
    }
  },
}));

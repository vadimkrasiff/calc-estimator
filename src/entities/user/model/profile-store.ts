import { create } from 'zustand';
import { apiClient } from '@/shared/api/interceptor';
import { getErrorMessage } from '@/shared/api/errorUtils';

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface ProfileState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  updateProfile: (
    profileData: Partial<Omit<UserProfile, 'id' | 'email' | 'createdAt' | 'updatedAt'>>,
  ) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
}

export const useProfileStore = create<ProfileState>(set => ({
  profile: null,
  loading: false,
  error: null,

  fetchProfile: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get('/profile');
      set({ profile: response.data, loading: false });
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка загрузки профиля', loading: false });
    }
  },

  updateProfile: async profileData => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.put('/profile', profileData);
      set({ profile: response.data, loading: false });
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка обновления профиля', loading: false });
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    set({ loading: true, error: null });
    try {
      await apiClient.post('/profile/change-password', {
        currentPassword,
        newPassword,
      });
      set({ loading: false });
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка смены пароля', loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

import type { User } from '@/entities/user/model/types';
import { apiClient } from '@/shared/api/interceptor';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
  };
}
// Вход
export const onLogin = async (credentials: LoginRequest): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data; // возвращает { token, user }
  } catch (error) {
    const errorMessage = getErrorMessage(error) || 'Ошибка входа';
    throw new Error(errorMessage);
  }
};

// Проверка токена (получение профиля)
export const getProfile = async (): Promise<User> => {
  try {
    const response = await apiClient.get('/auth/profile');
    return response.data; // возвращает { id, email, role, ... }
  } catch (error) {
    const errorMessage = getErrorMessage(error) || 'Ошибка получения профиля';
    throw new Error(errorMessage);
  }
};

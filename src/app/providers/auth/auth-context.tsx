import type { User } from '@/entities/user/model/types';
import type { LoginResponse } from '@/features/auth/model/api';
import { createContext } from 'react';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

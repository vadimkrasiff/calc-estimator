import type { User } from '@/entities/user/model/types';
import { useEffect, useState, type ReactNode } from 'react';
import { AuthContext } from './auth-context';
import { getProfile, onLogin } from '@/features/auth/model/api';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const validateSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        if (isMounted) setLoading(false);
        return;
      }
      try {
        // Запрашиваем профиль по токену
        const userData = await getProfile();
        if (isMounted) setUser(userData);
      } catch {
        // Токен недействителен
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    validateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const authData = await onLogin({ email, password });
    if (authData.token) {
      // ← теперь token
      localStorage.setItem('token', authData.token);
      setUser(authData.user);
      localStorage.setItem('user', JSON.stringify(authData.user));
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>
  );
};

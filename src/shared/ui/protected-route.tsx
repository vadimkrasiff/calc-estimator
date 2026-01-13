import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '@/app/hooks/use-auth';
import logo from '../assets/android-chrome-48x48.png';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  adminOnly?: boolean;
}

export const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          width: '100vw',
        }}
      >
        <Spin size="large">
          <img src={logo} alt="Загрузка" style={{ width: 40, height: 40, opacity: 0.6 }} />
        </Spin>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};

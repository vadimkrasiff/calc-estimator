import { ProtectedRoute } from '@/shared/ui/protected-route';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/login-page';
import { RootLayout } from '@/widgets/root-layout/root-layout';
import { HeaderProvider } from './header-context';
import { MaterialsPage } from '@/pages/materials-page/materials-page';
import { CalculatorPage } from '@/pages/calculator-page/calculator-page';
import { AdminUsersPage } from '@/pages/admin-panel/admin-users-page';
import { RegisterByInvitationPage } from '@/pages/egister-by-invitation/register-by-invitation-page';
import { ProfilePage } from '@/pages/profile/profile';
import { SimpleCalculatorPage } from '@/pages/simple-calculator-page/simple-calculator-page';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterByInvitationPage /> },
  {
    element: (
      <HeaderProvider>
        <ProtectedRoute>
          <RootLayout />
        </ProtectedRoute>
      </HeaderProvider>
    ),
    children: [
      { path: '/', element: <CalculatorPage /> },
      { path: '/simple-calc', element: <SimpleCalculatorPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/materials', element: <MaterialsPage /> },
      {
        path: '/admin/users',
        element: (
          <ProtectedRoute adminOnly>
            <AdminUsersPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  { path: '*', element: <Navigate to="/" /> },
]);

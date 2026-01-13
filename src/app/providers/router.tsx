import { ProtectedRoute } from '@/shared/ui/protected-route';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/login-page';
import { RootLayout } from '@/widgets/root-layout/root-layout';
import { HeaderProvider } from './header-context';
import { MaterialsPage } from '@/pages/materials-page/materials-page';
import { HouseTypesPage } from '@/pages/house-types-page/house-types-page';
import { HouseTypeDetailPage } from '@/pages/house-type-detail-page/house-type-detail-page';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <HeaderProvider>
        <ProtectedRoute>
          <RootLayout />
        </ProtectedRoute>
      </HeaderProvider>
    ),
    children: [
      { path: '/', element: <>Калькулятор</> },
      { path: '/profile', element: <>Профиль</> },
      { path: '/house-types', element: <HouseTypesPage /> },
      { path: '/materials', element: <MaterialsPage /> },
      { path: '/house-types/:id', element: <HouseTypeDetailPage /> },
      {
        element: <ProtectedRoute adminOnly />,
        children: [{ path: '/admin/users', element: <>UserListPage</> }],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" /> },
]);

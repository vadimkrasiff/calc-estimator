import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'antd/dist/reset.css'; // Ensure you import Ant Design styles
import './index.css';
import { AuthProvider } from './app/providers/auth/auth-provider.tsx';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/providers/router.tsx';
import '@/shared/lib/dayjs-config';
import ru_RU from 'antd/locale/ru_RU';
import { ConfigProvider } from 'antd';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ConfigProvider locale={ru_RU}>
        <RouterProvider router={router} />
      </ConfigProvider>
    </AuthProvider>
  </StrictMode>,
);

import { Layout } from 'antd';
// import { Header } from '@/shared/ui/header/header';
import { Sidebar } from '@/shared/ui/sidebar/sidebar';
import { useHeaderConfig } from '@/app/hooks/use-header';
import { DynamicHeader } from '../dynamic-header/dynamic-header';
import { Outlet } from 'react-router-dom';

const { Content } = Layout;

export const RootLayout = () => {
  const headerConfig = useHeaderConfig();
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout style={{ padding: 12, gap: 12, maxWidth: '100vw' }}>
        <Sidebar />
        <Content
          style={{
            // background: '#fff',
            // borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {headerConfig && <DynamicHeader config={headerConfig} />}
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              height: '100%',
              padding: '20px 20px',
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

import { Layout, Typography } from 'antd';

const { Header: AntdHeader } = Layout;

export const Header = () => {
  return (
    <AntdHeader
      className="header"
      style={{
        height: 'auto',
        backgroundColor: 'white',
        borderBottom: '1px solid rgba(99, 99, 99, 0.07)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        borderRadius: 12,
      }}
    >
      <Typography.Title level={3}>Калькулятор</Typography.Title>
    </AntdHeader>
  );
};

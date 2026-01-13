import { Button, Space, Typography, Tabs, Skeleton } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import type { HeaderConfig } from '@/shared/lib/header-schema';
import { useNavigate } from 'react-router-dom';

interface DynamicHeaderProps {
  config: HeaderConfig;
}

export const DynamicHeader = ({ config }: DynamicHeaderProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (config.onBack) {
      config.onBack();
    } else {
      navigate(-1); // стандартный возврат
    }
  };

  const handleButtonAction = (action: HeaderConfig['buttons'][0]['action']) => {
    if (action.type === 'navigate') {
      navigate(action.path);
    } else if (action.type === 'callback') {
      action.fn();
    }
  };

  // Если loading = true, показываем skeleton
  if (config.loading) {
    return (
      <div
        style={{
          height: 'auto',
          backgroundColor: 'white',
          borderBottom: '1px solid rgba(99, 99, 99, 0.07)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 20px 0',
          borderRadius: 12,
          width: '100%',
        }}
      >
        <Skeleton active />
      </div>
    );
  }

  return (
    <div
      style={{
        height: 'auto',
        backgroundColor: 'white',
        borderBottom: '1px solid rgba(99, 99, 99, 0.07)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px 0',
        borderRadius: 12,
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {config.showBackButton && (
              <Button icon={<ArrowLeftOutlined />} onClick={handleBack} type="default" />
            )}
            <Typography.Title
              level={2}
              style={{
                height: 25,
                marginLeft: config.showBackButton ? 12 : 0,
              }}
            >
              {config.title}
            </Typography.Title>
          </div>
          {config.description && (
            <Typography.Text type="secondary">{config.description}</Typography.Text>
          )}
        </div>
        <Space>
          {config.buttons?.map(btn => (
            <Button
              key={btn.id}
              danger={btn.danger}
              disabled={btn.disabled}
              onClick={() => handleButtonAction(btn.action)}
            >
              {btn.label}
            </Button>
          ))}
        </Space>
      </div>

      {config.tabs && config.tabs.length > 0 && (
        <Tabs
          style={{
            width: '100%',
          }}
          onChange={(key: string) => {
            config?.onChangeTab?.(key);
          }}
          activeKey={config.tabs.find(tab => tab.active)?.id || config.tabs[0].id}
          items={config.tabs.map(tab => ({
            key: tab.id,
            label: tab.label,
          }))}
        />
      )}
    </div>
  );
};

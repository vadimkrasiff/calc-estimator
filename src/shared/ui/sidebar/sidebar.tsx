import { Avatar, Button, Menu, Typography } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../assets/android-chrome-48x48.png';
import styles from './sidebar.module.scss';
import cls from 'classnames';
import {
  UserOutlined,
  CalculatorOutlined,
  HomeOutlined,
  ToolOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import Sider from 'antd/es/layout/Sider';
import { useAuth } from '@/app/hooks/use-auth';
import type { ItemType, MenuItemType } from 'antd/es/menu/interface';
import { getAvatarColor } from '@/shared/lib/get-avatar-color';

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
  };

  const menuItems = [
    { key: '/', label: 'Калькулятор', icon: <CalculatorOutlined /> },
    { key: '/house-types', label: 'Типы домов', icon: <HomeOutlined /> },
    { key: '/materials', label: 'Материалы', icon: <ToolOutlined /> },
  ];

  const name = user ? user.lastName + ' ' + user.firstName : 'Пользователь';

  const userMenuItems: ItemType<MenuItemType>[] = [
    {
      key: name,
      label: <Typography.Text strong>{name}</Typography.Text>,
      icon: (
        <Avatar
          className={styles.avatar}
          size={collapsed ? 'small' : undefined}
          style={{
            backgroundColor: `var(--ant-${getAvatarColor(name || user?.email || 'Пользователь')}-3)`,
          }}
        >
          <Typography.Text strong style={{ whiteSpace: 'nowrap' }}>
            {getInitials(name)}
          </Typography.Text>
        </Avatar>
      ),
      children: [
        { key: '/profile', label: 'Профиль', icon: <UserOutlined /> },
        { key: 'logout', label: 'Выйти', danger: true, onClick: logout },
      ],
    },
  ];

  return (
    <Sider
      width={!collapsed ? 250 : 64}
      className={styles.sidebar}
      style={{
        position: 'sticky',
        top: 12,
        height: 'calc(100dvh - 24px)',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          gap: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            gap: 16,
          }}
        >
          <div className={cls(styles.logo, { [styles.logo__small]: collapsed })}>
            <div style={{ display: 'flex', gap: 8 }}>
              <img src={logo} alt="" />
              <Typography.Title
                hidden={collapsed}
                style={{ margin: 0, whiteSpace: 'nowrap' }}
                level={3}
              >
                ДомLike
              </Typography.Title>
            </div>
            <Button
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleCollapsed}
              size="middle"
              style={{ margin: '8px 4px' }}
            />
          </div>

          <Menu
            inlineCollapsed={collapsed}
            mode="inline"
            selectedKeys={[location.pathname]}
            onClick={({ key }) => navigate(key)}
            items={menuItems}
            style={{ border: 'none', width: '100%' }}
          />
        </div>
        <Menu
          inlineCollapsed={collapsed}
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)}
          items={userMenuItems}
          style={{ border: 'none', width: '100%' }}
        />
      </div>
    </Sider>
  );
};

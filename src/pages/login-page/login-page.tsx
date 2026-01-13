import { useState } from 'react';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Form, Input, Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/hooks/use-auth';

interface LoginValues {
  email: string;
  password: string;
}

export const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const onFinish = async (values: LoginValues) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success('Успешный вход');
      navigate('/profile', { replace: true });
    } catch (err) {
      message.error((err as Error).message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card title="Вход в систему" style={{ width: 400 }} className="shadow-lg">
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Некорректный email' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: 'Введите пароль' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Пароль" size="large" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} size="large" block>
              Войти
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

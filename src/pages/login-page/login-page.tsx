import { useState } from 'react';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Form, Input, Card } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/hooks/use-auth';
import { getErrorMessage } from '@/shared/api/errorUtils';

interface LoginValues {
  email: string;
  password: string;
}

export const LoginPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const onFinish = async (values: LoginValues) => {
    setLoading(true);

    form.setFields([
      { name: 'email', errors: [] },
      { name: 'password', errors: [] },
    ]);
    try {
      const data = await login(values.email, values.password);

      if (data.token) {
        navigate('/profile');
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error) || 'Неверный email или пароль';

      form.setFields([
        {
          name: 'email',
          errors: [errorMessage],
        },
        {
          name: 'password',
          errors: [errorMessage],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card title="Вход в систему" style={{ width: 400 }} className="shadow-lg">
        <Form
          form={form}
          // name="login"
          // initialValues={{ remember: true }}
          onFinish={onFinish}
          // autoComplete="off"
          onError={() => {}}
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
          <Button type="primary" htmlType="submit" loading={loading} size="large">
            Войти
          </Button>
        </Form>
      </Card>
    </div>
  );
};

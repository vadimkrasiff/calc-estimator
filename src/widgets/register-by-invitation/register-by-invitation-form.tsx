import { Form, Input, Button, Card, Alert, Spin } from 'antd';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '@/shared/api/interceptor';
import { getErrorMessage } from '@/shared/api/errorUtils';
import type { RuleObject } from 'antd/es/form';

interface RegisterFormData {
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
}

export const RegisterByInvitationForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState<string>('');

  const invitationToken = searchParams.get('invitation');

  // Проверяем токен при загрузке
  useEffect(() => {
    if (!invitationToken) {
      setError('Токен приглашения отсутствует');
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      try {
        const response = await apiClient.get(`/invitations/${invitationToken}`);
        setEmail(response.data.email);
      } catch (error) {
        setError(getErrorMessage(error) || 'Неверный или истёкший токен приглашения');
      } finally {
        setValidating(false);
        setLoading(false);
      }
    };

    validateToken();
  }, [invitationToken]);

  const onFinish = async (values: RegisterFormData) => {
    if (!invitationToken) return;

    try {
      await apiClient.post('/users/register-with-invitation', {
        invitationToken,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setError(getErrorMessage(error));
    }
  };

  const compareToFirstPassword = (_: RuleObject, value: string) => {
    if (value && value !== form.getFieldValue('password')) {
      return Promise.reject(new Error('Пароли не совпадают'));
    }
    return Promise.resolve();
  };

  if (loading) {
    return <Spin size="large" />;
  }

  if (validating) {
    return <Spin tip="Проверка токена..." />;
  }

  if (error) {
    return (
      <Card style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>
        <Alert message="Ошибка" description={error} type="error" showIcon />
        <Button onClick={() => navigate('/')} style={{ marginTop: 16 }} block>
          На главную
        </Button>
      </Card>
    );
  }

  if (success) {
    return (
      <Card style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>
        <Alert
          message="Успешно!"
          description="Регистрация завершена. Перенаправление на страницу входа..."
          type="success"
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card
      title="Регистрация по приглашению"
      style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item label="Email">
          <Input value={email} disabled />
        </Form.Item>

        <Form.Item name="firstName" label="Имя">
          <Input placeholder="Введите имя" />
        </Form.Item>

        <Form.Item name="lastName" label="Фамилия">
          <Input placeholder="Введите фамилию" />
        </Form.Item>

        <Form.Item
          name="password"
          label="Пароль"
          rules={[
            { required: true, message: 'Введите пароль' },
            { min: 6, message: 'Пароль должен быть не менее 6 символов' },
          ]}
        >
          <Input.Password placeholder="Введите пароль" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Подтвердите пароль"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Подтвердите пароль' },
            { validator: compareToFirstPassword },
          ]}
        >
          <Input.Password placeholder="Подтвердите пароль" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Завершить регистрацию
          </Button>
        </Form.Item>

        <Form.Item>
          <Button onClick={() => navigate('/login')} block>
            Уже есть аккаунт? Войти
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

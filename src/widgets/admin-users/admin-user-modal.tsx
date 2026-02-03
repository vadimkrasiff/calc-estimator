import { Modal, Form, Input, Select, message, Button } from 'antd';
import { useEffect } from 'react';
import { useUserStore } from '@/entities/user/model/user-store';
import type { User } from '@/entities/user/model/types';
import { getErrorMessage } from '@/shared/api/errorUtils';

interface AdminUserModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

export const AdminUserModal = ({ open, onClose, user }: AdminUserModalProps) => {
  const [form] = Form.useForm();
  const { updateUser, createUser } = useUserStore();

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });
    } else {
      form.resetFields();
    }
  }, [user, form]);

  const onFinish = async (values: {
    email: string;
    firstName?: string | undefined;
    lastName?: string | undefined;
    role: string;
  }) => {
    try {
      if (user) {
        await updateUser(user.id, values);
        message.success('Пользователь обновлён');
      } else {
        await createUser(values);
        message.success('Пользователь создан');
      }
      onClose();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={user ? `Редактировать ${user.email}` : 'Создать пользователя'}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Введите email' },
            { type: 'email', message: 'Неверный формат email' },
          ]}
        >
          <Input disabled={!!user} placeholder="user@example.com" />
        </Form.Item>

        <Form.Item name="firstName" label="Имя">
          <Input placeholder="Иван" />
        </Form.Item>

        <Form.Item name="lastName" label="Фамилия">
          <Input placeholder="Иванов" />
        </Form.Item>

        <Form.Item name="role" label="Роль" rules={[{ required: true, message: 'Выберите роль' }]}>
          <Select placeholder="Выберите роль">
            <Select.Option value="user">Пользователь</Select.Option>
            <Select.Option value="admin">Администратор</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Отмена
          </Button>
          <Button type="primary" htmlType="submit">
            {user ? 'Сохранить' : 'Создать'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

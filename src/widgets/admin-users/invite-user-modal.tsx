import { Modal, Form, Input, message, Button } from 'antd';
import { useUserStore } from '@/entities/user/model/user-store';
import { getErrorMessage } from '@/shared/api/errorUtils';

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
}

export const InviteUserModal = ({ open, onClose }: InviteUserModalProps) => {
  const [form] = Form.useForm();
  const { inviteUser } = useUserStore();

  const onFinish = async (values: { email: string }) => {
    try {
      await inviteUser(values.email);
      message.success('Пользователь приглашён');
      onClose();
      form.resetFields();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  return (
    <Modal open={open} onCancel={onClose} footer={null} title="Пригласить пользователя">
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Введите email' },
            { type: 'email', message: 'Неверный формат email' },
          ]}
        >
          <Input placeholder="user@example.com" />
        </Form.Item>

        <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Отмена
          </Button>
          <Button type="primary" htmlType="submit">
            Пригласить
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

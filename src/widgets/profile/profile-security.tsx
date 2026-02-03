import { Form, Input, Button, message, Card, Flex } from 'antd';
import { getErrorMessage } from '@/shared/api/errorUtils';
import { useProfileStore } from '@/entities/user/model/profile-store';

export const ProfileSecurity = () => {
  const [form] = Form.useForm();
  const { changePassword, loading } = useProfileStore();

  const onFinish = async (values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Новые пароли не совпадают');
      return;
    }

    try {
      await changePassword(values.currentPassword, values.newPassword);
      message.success('Пароль успешно изменён');
      form.resetFields();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  return (
    <Card title="Безопасность">
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="currentPassword"
          label="Текущий пароль"
          rules={[{ required: true, message: 'Введите текущий пароль' }]}
        >
          <Input.Password placeholder="Введите текущий пароль" />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label="Новый пароль"
          rules={[{ required: true, message: 'Введите новый пароль' }]}
        >
          <Input.Password placeholder="Введите новый пароль" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Подтвердите новый пароль"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Подтвердите новый пароль' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Пароли не совпадают'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="Подтвердите новый пароль" />
        </Form.Item>

        <Flex justify="flex-end">
          <Button type="primary" htmlType="submit" loading={loading}>
            Изменить пароль
          </Button>
        </Flex>
      </Form>
    </Card>
  );
};

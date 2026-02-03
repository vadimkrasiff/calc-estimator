import { Form, Input, Button, message, Card, Flex } from 'antd';
import type { UserProfile } from '@/entities/user/model/types';
import { useProfileStore } from '@/entities/user/model/profile-store';
import { useEffect, useState } from 'react';
import { getErrorMessage } from '@/shared/api/errorUtils';
import classNames from 'classnames';

interface ProfileGeneralProps {
  profile: UserProfile | null;
}

export const ProfileGeneral = ({ profile }: ProfileGeneralProps) => {
  const [form] = Form.useForm();
  const { updateProfile, loading } = useProfileStore();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (profile) {
      form.setFieldsValue({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
      });
    }
  }, [profile, form, editing]);

  const onFinish = async (
    values: Omit<UserProfile, 'id' | 'email' | 'createdAt' | 'updatedAt'>,
  ) => {
    try {
      await updateProfile(values);
      message.success('Профиль обновлён');
      setEditing(false);
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const startEditing = () => {
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    form.resetFields();
    form.setFieldsValue({
      firstName: profile?.firstName,
      lastName: profile?.lastName,
      email: profile?.email,
    });
  };

  if (!profile) {
    return <div>Загрузка...</div>;
  }

  return (
    <Card title="Общая информация">
      <Form
        className={classNames({ 'form-profile-general': !editing })}
        disabled={!editing}
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        <Form.Item name="email" label="Email">
          <Input disabled placeholder="Email" />
        </Form.Item>

        <Form.Item
          name="firstName"
          label="Имя"
          rules={[{ required: true, message: 'Введите имя' }]}
        >
          <Input placeholder="Введите имя" />
        </Form.Item>

        <Form.Item
          name="lastName"
          label="Фамилия"
          rules={[{ required: true, message: 'Введите фамилию' }]}
        >
          <Input placeholder="Введите фамилию" />
        </Form.Item>

        <Flex gap={8} justify="flex-end">
          {editing ? (
            <>
              <Button onClick={cancelEditing}>Отмена</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Сохранить
              </Button>
            </>
          ) : (
            <Button disabled={false} type="primary" onClick={startEditing}>
              Редактировать
            </Button>
          )}
        </Flex>
      </Form>
    </Card>
  );
};

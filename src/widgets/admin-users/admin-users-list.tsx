import { Table, Button, Space, message, Flex } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { User } from '@/entities/user/model/types';
import { useState } from 'react';
import { DeleteOutlined, EditOutlined, MailOutlined } from '@ant-design/icons';
import { useUserStore } from '@/entities/user/model/user-store';
import { AdminUserModal } from './admin-user-modal';
import { InviteUserModal } from './invite-user-modal';
import { getErrorMessage } from '@/shared/api/errorUtils';

export const AdminUsersList = () => {
  const { users, loading, deleteUser } = useUserStore();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteUser(id);
      message.success('Пользователь удалён');
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditModalOpen(true);
  };

  const columns: ColumnsType<User> = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      fixed: 'start',
    },
    {
      title: 'Имя',
      dataIndex: 'firstName',
      key: 'firstName',
    },
    {
      title: 'Фамилия',
      dataIndex: 'lastName',
      key: 'lastName',
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
    },
    {
      title: 'Дата регистрации',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: date => new Date(date).toLocaleDateString('ru-RU'),
    },
    {
      title: 'Действия',
      fixed: 'end',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Flex justify="flex-end" style={{ marginBottom: 16 }}>
        <Button onClick={() => setInviteModalOpen(true)}>
          <MailOutlined /> Пригласить по email
        </Button>
      </Flex>

      <Table
        scroll={{ x: 'max-content' }}
        style={{ width: '100%' }}
        dataSource={users}
        columns={columns}
        rowKey="id"
        loading={loading}
      />

      <AdminUserModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingUser(null);
        }}
        user={editingUser}
      />

      <InviteUserModal open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} />
    </div>
  );
};

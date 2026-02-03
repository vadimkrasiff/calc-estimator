import { useEffect } from 'react';
import { headerConfigSchema, type HeaderConfig } from '@/shared/lib/header-schema';
import { useSetHeaderConfig } from '@/app/hooks/use-header';
import { AdminUsersList } from '@/widgets/admin-users/admin-users-list';
import { useUserStore } from '@/entities/user/model/user-store';

export const AdminUsersPage = () => {
  const setHeaderConfig = useSetHeaderConfig();
  const { fetchUsers } = useUserStore();

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const config: HeaderConfig | null = headerConfigSchema.parse({
      title: 'Управление пользователями',
      description: 'Приглашение, редактирование и удаление пользователей',
      showBackButton: true,
    });

    setHeaderConfig(config);

    return () => setHeaderConfig(null);
  }, [setHeaderConfig]);

  return (
    <div style={{ overflow: 'hidden', flex: 1 }}>
      <AdminUsersList />
    </div>
  );
};

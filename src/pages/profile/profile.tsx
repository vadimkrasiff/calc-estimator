import { useState, useEffect } from 'react';
import { message } from 'antd';
import { headerConfigSchema, type HeaderConfig } from '@/shared/lib/header-schema';
import { useSetHeaderConfig } from '@/app/hooks/use-header';
import { useProfileStore } from '@/entities/user/model/profile-store';
import { ProfileGeneral } from '@/widgets/profile/profile-general';
import { ProfileSecurity } from '@/widgets/profile/profile-security';
import { getErrorMessage } from '@/shared/api/errorUtils';

export const ProfilePage = () => {
  const setHeaderConfig = useSetHeaderConfig();
  const { profile, fetchProfile, error } = useProfileStore();
  const [activeTab, setActiveTab] = useState<'general' | 'security'>('general');

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (error) {
      message.error(getErrorMessage(error));
    }
  }, [error]);

  useEffect(() => {
    const config: HeaderConfig | null = headerConfigSchema.parse({
      title: 'Профиль',
      description: 'Управление личной информацией',
      showBackButton: false,
      tabs: [
        { id: 'general', label: 'Общее', active: activeTab === 'general' },
        { id: 'security', label: 'Безопасность', active: activeTab === 'security' },
      ],
      onChangeTab: (key: string) => setActiveTab(key as 'general' | 'security'),
    });

    setHeaderConfig(config);

    return () => setHeaderConfig(null);
  }, [activeTab, setHeaderConfig]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {activeTab === 'general' ? <ProfileGeneral profile={profile} /> : <ProfileSecurity />}
    </div>
  );
};

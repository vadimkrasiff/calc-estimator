import { useEffect } from 'react';
import { headerConfigSchema, type HeaderConfig } from '@/shared/lib/header-schema';
import { useSetHeaderConfig } from '@/app/hooks/use-header';
import { HouseTypeList } from '@/widgets/house-type-list/house-type-list';
import { useHouseTypeStore } from '@/entities/house-type/model/house-type-store';

export const HouseTypesPage = () => {
  const setHeaderConfig = useSetHeaderConfig();
  const { loading } = useHouseTypeStore();

  useEffect(() => {
    const config: HeaderConfig | null = headerConfigSchema.parse({
      title: 'Типы домов',
      description: 'Управление типами домов и их характеристиками',
      showBackButton: true,
      loading, // ← передаём loading в headerConfig
    });

    setHeaderConfig(config);

    return () => setHeaderConfig(null);
  }, [loading, setHeaderConfig]); // ← добавляем loading в deps

  return (
    <div style={{ overflow: 'hidden', flex: 1 }}>
      <HouseTypeList />
    </div>
  );
};

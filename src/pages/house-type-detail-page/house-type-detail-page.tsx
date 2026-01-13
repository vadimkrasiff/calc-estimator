import { useState, useEffect } from 'react';
import { Tabs as AntdTabs, Skeleton } from 'antd';
import { useParams } from 'react-router-dom';
import { HouseTypeGeneral } from '@/widgets/house-type-detail/house-type-general';
import { HouseTypeMaterials } from '@/widgets/house-type-detail/house-type-materials';
import { headerConfigSchema, type HeaderConfig } from '@/shared/lib/header-schema';
import { useSetHeaderConfig } from '@/app/hooks/use-header';
import { useHouseTypeStore } from '@/entities/house-type/model/house-type-store';

interface MaterialRequirement {
  id: string;
  materialId: string;
  materialName?: string;
  quantityPerSqm: number; // количество на 1 кв.м
}

export const HouseTypeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const setHeaderConfig = useSetHeaderConfig();
  const { houseTypes, fetchHouseTypes } = useHouseTypeStore();
  const [activeTab, setActiveTab] = useState<'general' | 'materials'>('general');
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<MaterialRequirement[]>([]);

  const houseType = houseTypes.find(h => h.id == id);
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchHouseTypes();
        setMaterials([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, fetchHouseTypes]);

  useEffect(() => {
    const config: HeaderConfig | null = headerConfigSchema.parse({
      title: loading ? undefined : houseType?.name,
      description: loading ? undefined : houseType?.description,
      showBackButton: true,
      loading,
      buttons: [
        {
          id: 'delete',
          label: 'Удалить дом',
          danger: true,
          action: {
            type: 'callback',
            fn: () => {
              if (window.confirm('Вы уверены, что хотите удалить этот тип дома?')) {
                // TODO: реализовать удаление
              }
            },
          },
        },
      ],
      tabs: [
        { id: 'general', label: 'Общее', active: activeTab === 'general' },
        { id: 'materials', label: 'Материалы', active: activeTab === 'materials' },
      ],
      onChangeTab: (key: string) => setActiveTab(key as 'general' | 'materials'),
    });

    setHeaderConfig(config);

    return () => setHeaderConfig(null);
  }, [houseType, loading, activeTab, setHeaderConfig]);

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <Skeleton active />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {activeTab === 'general' ? (
        <HouseTypeGeneral houseType={houseType!} />
      ) : (
        <HouseTypeMaterials materials={materials} houseTypeId={id!} />
      )}
    </div>
  );
};

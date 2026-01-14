import { useState, useEffect } from 'react';
import { Skeleton, Modal, message } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { HouseTypeGeneral } from '@/widgets/house-type-detail/house-type-general';
import { HouseTypeMaterials } from '@/widgets/house-type-detail/house-type-materials';
import { headerConfigSchema, type HeaderConfig } from '@/shared/lib/header-schema';
import { useSetHeaderConfig } from '@/app/hooks/use-header';
import { useHouseTypeStore } from '@/entities/house-type/model/house-type-store';
import { getErrorMessage } from '@/shared/api/errorUtils';

export const HouseTypeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setHeaderConfig = useSetHeaderConfig();
  const { houseTypes, fetchHouseTypes, deleteHouseType } = useHouseTypeStore();
  const [activeTab, setActiveTab] = useState<'general' | 'materials'>('general');
  const [loading, setLoading] = useState(true);

  const houseType = houseTypes.find(h => h.id == id);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchHouseTypes();
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
              Modal.confirm({
                title: 'Подтверждение удаления',
                content: `Вы уверены, что хотите удалить тип дома "${houseType?.name}"?`,
                okText: 'Удалить',
                okType: 'danger',
                cancelText: 'Отмена',
                async onOk() {
                  try {
                    await deleteHouseType(id!);
                    message.success('Тип дома успешно удалён');
                    navigate('/house-types');
                  } catch (error) {
                    message.error(getErrorMessage(error) || 'Ошибка удаления');
                  }
                },
                onCancel() {},
              });
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
  }, [houseType, loading, activeTab, setHeaderConfig, id, deleteHouseType, navigate]);

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
        <HouseTypeMaterials houseTypeId={id!} />
      )}
    </div>
  );
};

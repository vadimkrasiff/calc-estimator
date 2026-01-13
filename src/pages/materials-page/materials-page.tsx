import { useState, useEffect, useCallback } from 'react';
// import { Tabs } from 'antd';
import { MaterialList } from '@/widgets/material-list/material-list';
import { MaterialPrices } from '@/widgets/material-prices/material-prices';
import { headerConfigSchema, type HeaderConfig } from '@/shared/lib/header-schema';
import { useSetHeaderConfig } from '@/app/hooks/use-header';

export const MaterialsPage = () => {
  const [activeTab, setActiveTab] = useState<'materials' | 'prices'>('materials');
  const setHeaderConfig = useSetHeaderConfig();

  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key as 'materials' | 'prices');
  }, []);
  useEffect(() => {
    const config: HeaderConfig | null = headerConfigSchema.parse({
      title: 'Материалы',
      description: 'Управление материалами и их ценами',
      showBackButton: true,
      onChangeTab: handleTabChange,
      tabs: [
        { id: 'materials', label: 'Материалы', active: activeTab === 'materials' },
        { id: 'prices', label: 'Цены материалов', active: activeTab === 'prices' },
      ],
    });

    setHeaderConfig(config);

    return () => setHeaderConfig(null);
  }, [activeTab, handleTabChange, setHeaderConfig]);

  return (
    <>
      <div style={{ overflow: 'hidden', flex: 1 }}>
        {activeTab === 'materials' ? <MaterialList /> : <MaterialPrices />}
      </div>
    </>
  );
};

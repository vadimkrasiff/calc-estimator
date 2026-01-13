import { Table, Button, Space, message, DatePicker, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Price } from '@/entities/price/model/types';
import { useEffect, useState } from 'react';
import { DeleteOutlined } from '@ant-design/icons';
import { usePriceStore } from '@/entities/price/model/price-store';
import { useMaterialStore } from '@/entities/material/model/material-store';
import { PriceModal } from './price-modal';
import dayjs from 'dayjs';
import { getErrorMessage } from '@/shared/utils/errorUtils';

export const MaterialPrices = () => {
  const { deletePrice, prices, fetchPrices } = usePriceStore();
  const { materials, fetchMaterials } = useMaterialStore();
  const [open, setOpen] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState<Price | null>(null);
  const [materialFilter, setMaterialFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Загружаем материалы при монтировании
  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleDelete = async (id: string) => {
    try {
      await deletePrice(id);
      message.success('Прайс удален');
    } catch (error) {
      // Используем утилиту из errorUtils.ts
      const errorMessage = getErrorMessage(error);
      message.error(errorMessage || 'Ошибка удаления');
    }
  };

  const onHandlePrice = (price?: Price) => {
    setOpen(true);
    if (price) setSelectedPrice(price);
  };

  const onCloseModal = () => {
    setOpen(false);
    setSelectedPrice(null);
  };

  const handleSelectFocus = async () => {
    // Загружаем материалы при каждом открытии Select
    await fetchMaterials();
  };

  const columns: ColumnsType<Price> = [
    {
      title: 'Материал',
      dataIndex: 'materialName',
      key: 'materialName',
      render: (name, record) => `${name || 'Нет названия'} (${record.materialId})`,
    },
    {
      title: 'Цена',
      dataIndex: 'price',
      key: 'price',
      render: value => `${value} руб.`,
    },
    {
      title: 'Поставщик',
      dataIndex: 'supplier',
      key: 'supplier',
    },
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      render: value => dayjs(value).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}></Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        <Select
          placeholder="Выберите материал"
          onFocus={handleSelectFocus} // ← загружаем материалы при фокусе
          value={materialFilter || undefined} // ← убираем значение, если null
          onChange={setMaterialFilter} // ← фильтруем по материалу
          options={materials.map(m => ({
            label: m.name,
            value: m.id,
          }))}
          style={{ minWidth: 200 }}
        />
        <DatePicker placeholder="выберите дату" />
        <Button onClick={() => onHandlePrice()}>Добавить</Button>
      </div>
      <Table dataSource={prices} columns={columns} rowKey="id" />

      <PriceModal open={open} onCloseModal={onCloseModal} selectedPrice={selectedPrice} />
    </div>
  );
};

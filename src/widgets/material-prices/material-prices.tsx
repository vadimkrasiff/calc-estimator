import { Table, Button, Space, DatePicker, Select, Switch, Flex } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Price } from '@/entities/price/model/types';
import { useEffect, useState } from 'react';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { usePriceStore } from '@/entities/price/model/price-store';
import { useMaterialStore } from '@/entities/material/model/material-store';
import { PriceModal } from './price-modal';
import dayjs from 'dayjs';
import type { TablePaginationConfig } from 'antd/lib';
import { getErrorMessage } from '@/shared/api/errorUtils';
import { message } from 'antd';

export const MaterialPrices = () => {
  const { prices, loading, pagination, filters, fetchPrices, setPagination, setFilters } =
    usePriceStore();
  const { materials, fetchMaterials } = useMaterialStore();
  const [open, setOpen] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState<Price | null>(null);
  const [dateFilter, setDateFilter] = useState<dayjs.Dayjs | null>(null);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleDelete = async (id: string) => {
    try {
      await usePriceStore.getState().deletePrice(id);
      message.success('Прайс удален');
    } catch (error) {
      message.error(getErrorMessage(error) || 'Ошибка удаления');
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

  const handleMaterialChange = (value: string) => {
    setFilters({ materialId: value || '' });
  };

  const handleDateChange = (date: dayjs.Dayjs | null) => {
    setDateFilter(date);
    setFilters({ date: date ? date.format('YYYY-MM-DD') : null });
  };

  const handleLatestOnlyChange = (checked: boolean) => {
    setFilters({ latestOnly: checked });
  };

  const clearFilters = () => {
    setFilters({ materialId: '', date: null, latestOnly: false });
    setDateFilter(null);
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setPagination({
      current: pagination.current || 1,
      pageSize: pagination.pageSize || 10,
    });
  };

  const columns: ColumnsType<Price> = [
    {
      fixed: 'start',
      title: 'Материал',
      dataIndex: 'materialName',
      key: 'materialName',
      render: (name, record) => `${name || 'Нет названия'} (${record.materialId})`,
    },
    {
      title: 'Цена',
      dataIndex: 'price',
      key: 'price',
      render: value =>
        `${value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} руб.`,
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
      fixed: 'end',
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => onHandlePrice(record)}></Button>
          <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}></Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Flex gap={8} wrap align="center" justify="space-between">
        <Flex gap={8} align="center" wrap>
          <Select
            placeholder="Выберите материал"
            value={filters.materialId || undefined}
            onChange={handleMaterialChange}
            style={{ minWidth: 200 }}
            allowClear
            options={materials.map(m => ({
              label: m.name,
              value: m.id,
            }))}
          />

          <DatePicker
            placeholder="Выберите дату"
            value={dateFilter}
            onChange={handleDateChange}
            allowClear
          />

          <Switch
            checked={filters.latestOnly}
            onChange={handleLatestOnlyChange}
            checkedChildren="Актуальные"
            unCheckedChildren="Все"
          />
          <Button onClick={clearFilters}>Очистить фильтры</Button>
        </Flex>
        <Button onClick={() => onHandlePrice()}>Добавить</Button>
      </Flex>

      <Table
        scroll={{ x: 'max-content' }}
        dataSource={prices}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} записей`,
        }}
        onChange={handleTableChange}
      />

      <PriceModal open={open} onCloseModal={onCloseModal} selectedPrice={selectedPrice} />
    </div>
  );
};

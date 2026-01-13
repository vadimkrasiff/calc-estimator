import { Table, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { HouseType } from '@/entities/house-type/model/types';
import { useEffect, useState } from 'react';
import { HouseTypeModal } from './house-type-modal';
import { useHouseTypeStore } from '@/entities/house-type/model/house-type-store';
import { useNavigate } from 'react-router-dom';

export const HouseTypeList = () => {
  const { houseTypes, loading, fetchHouseTypes } = useHouseTypeStore();
  const [open, setOpen] = useState(false);
  const [selectedHouseType, setSelectedHouseType] = useState<HouseType | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHouseTypes();
  }, [fetchHouseTypes]);

  const onHandleHouseType = (houseType?: HouseType) => {
    setOpen(true);
    if (houseType) setSelectedHouseType(houseType);
  };

  const onCloseModal = () => {
    setOpen(false);
    setSelectedHouseType(null);
  };

  const columns: ColumnsType<HouseType> = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
    },
  ];

  const onRowClick = (record: HouseType) => {
    navigate(`/house-types/${record.id}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        <Button onClick={() => onHandleHouseType()}>Добавить</Button>
      </div>
      <Table
        onRow={record => ({
          onClick: () => onRowClick(record),
          style: { cursor: 'pointer' },
        })}
        scroll={{ x: 'max-content' }}
        showHeader
        style={{ height: '100%' }}
        dataSource={houseTypes}
        columns={columns}
        rowKey="id"
        loading={loading}
      />

      <HouseTypeModal
        open={open}
        onCloseModal={onCloseModal}
        selectedHouseType={selectedHouseType}
      />
    </div>
  );
};

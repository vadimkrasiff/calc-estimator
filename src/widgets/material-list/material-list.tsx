import { Table, Button, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Material } from '@/entities/material/model/types';
import { useState, useEffect } from 'react';
import { MaterialModal } from './material-modal';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useMaterialStore } from '@/entities/material/model/material-store';

export const MaterialList = () => {
  const { materials, loading, fetchMaterials, deleteMaterial } = useMaterialStore();
  const [open, setOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  // Загружаем материалы при монтировании
  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const onHandleMaterial = (material?: Material) => {
    setOpen(true);
    if (material) setSelectedMaterial(material);
  };

  const onCloseModal = () => {
    setOpen(false);
    setSelectedMaterial(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMaterial(id);
      message.success('Материал удален');
    } catch (err) {
      message.error(err.message || 'Ошибка удаления');
    }
  };

  const columns: ColumnsType<Material> = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      fixed: 'start',
    },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: 'Единица измерения',
      dataIndex: 'unit',
      key: 'unit',
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
    },
    {
      fixed: 'end',
      title: 'Действия',
      key: 'actions',
      render: (_, material) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button icon={<EditOutlined />} onClick={() => onHandleMaterial(material)} />
          <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(material.id)} />
        </div>
      ),
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <Button onClick={() => onHandleMaterial()}>Добавить</Button>
      </div>
      <Table
        scroll={{ x: 'max-content' }}
        showHeader
        style={{ height: '100%' }}
        dataSource={materials}
        columns={columns}
        rowKey="id"
        loading={loading}
      />
      <MaterialModal open={open} onCloseModal={onCloseModal} selectedMaterial={selectedMaterial} />
    </div>
  );
};

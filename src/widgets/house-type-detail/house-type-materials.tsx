import { Table, Button, message, Space, Flex } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState, useEffect, useCallback } from 'react';
import { HouseTypeMaterialsModal } from '@/widgets/house-type-materials-modal/house-type-materials-modal';
import { HouseTypeMaterialEditModal } from '@/widgets/house-type-material-edit-modal/house-type-material-edit-modal';
import { useHouseTypeStore } from '@/entities/house-type/model/house-type-store';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { getErrorMessage } from '@/shared/api/errorUtils';

export interface MaterialRequirement {
  id: string;
  materialId: string;
  materialName?: string;
  quantityPerSqm: number;
}

interface HouseTypeMaterialsProps {
  houseTypeId: string;
}

export const HouseTypeMaterials = ({ houseTypeId }: HouseTypeMaterialsProps) => {
  const [materials, setMaterials] = useState<MaterialRequirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialRequirement | null>(null);
  const {
    fetchHouseTypeMaterials,
    deleteHouseTypeMaterial,
    addHouseTypeMaterials,
    updateHouseTypeMaterial,
  } = useHouseTypeStore();

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchHouseTypeMaterials(houseTypeId);
      setMaterials(data);
    } catch (error) {
      message.error(getErrorMessage(error) || 'Ошибка загрузки материалов');
    } finally {
      setLoading(false);
    }
  }, [fetchHouseTypeMaterials, houseTypeId]);

  useEffect(() => {
    loadMaterials();
  }, [houseTypeId, loadMaterials]);

  const handleAddMaterials = async (
    materialRequirements: { materialId: string; quantityPerSqm: number }[],
  ) => {
    try {
      const processedMaterials = materialRequirements.map(m => ({
        ...m,
        materialId: String(m.materialId),
      }));
      await addHouseTypeMaterials(houseTypeId, processedMaterials);
      await loadMaterials();
    } catch {
      //
    }
  };

  const handleUpdateMaterial = async (id: string, quantityPerSqm: number) => {
    try {
      await updateHouseTypeMaterial(id, quantityPerSqm);
      await loadMaterials();
      message.success('Материал успешно обновлён');
    } catch (error) {
      message.error(getErrorMessage(error) || 'Ошибка обновления материала');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteHouseTypeMaterial(id);
      message.success('Материал удалён');
      await loadMaterials(); // обновляем список
    } catch (error) {
      message.error(getErrorMessage(error) || 'Ошибка удаления материала');
    }
  };

  const handleEditMaterial = (material: MaterialRequirement) => {
    setEditingMaterial(material);
    setEditModalOpen(true);
  };

  const columns: ColumnsType<MaterialRequirement> = [
    {
      title: 'Материал',
      dataIndex: 'materialName',
      key: 'materialName',
      render: (_, record) => {
        return record.materialName
          ? `${record.materialName} (${record.materialId})`
          : `Материал ${record.materialId}`;
      },
    },
    {
      title: 'Количество на 1 м²',
      dataIndex: 'quantityPerSqm',
      key: 'quantityPerSqm',
      render: value => `${value} шт.`,
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditMaterial(record)}></Button>
          <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)}></Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Flex justify="flex-end" style={{ marginBottom: 16 }}>
        <Button onClick={() => setModalOpen(true)}>Добавить</Button>
      </Flex>

      <Table dataSource={materials} columns={columns} rowKey="id" loading={loading} />

      <HouseTypeMaterialsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        houseTypeId={houseTypeId}
        initialMaterials={materials}
        onAddMaterials={handleAddMaterials}
      />

      <HouseTypeMaterialEditModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingMaterial(null);
        }}
        material={editingMaterial}
        onUpdateMaterial={handleUpdateMaterial}
      />
    </div>
  );
};

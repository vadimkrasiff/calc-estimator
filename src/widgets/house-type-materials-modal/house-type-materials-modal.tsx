import { Modal, Form, InputNumber, Select, Button, Table, message, Flex } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState, useEffect } from 'react';
import { useMaterialStore } from '@/entities/material/model/material-store';

interface MaterialRequirement {
  materialId: string;
  quantityPerSqm: number;
}

interface HouseTypeMaterialsModalProps {
  open: boolean;
  onClose: () => void;
  houseTypeId: string;
  initialMaterials: MaterialRequirement[];
  onAddMaterials: (materials: MaterialRequirement[]) => Promise<void>;
}

interface FormData {
  materialId: string;
  quantityPerSqm: number;
}

export const HouseTypeMaterialsModal = ({
  open,
  onClose,
  // houseTypeId,
  initialMaterials,
  onAddMaterials,
}: HouseTypeMaterialsModalProps) => {
  const [form] = Form.useForm();
  const [tempMaterials, setTempMaterials] = useState<MaterialRequirement[]>([]);
  const { materials, fetchMaterials } = useMaterialStore();
  const [loading, setLoading] = useState(false);

  const onCLoseModal = () => {
    onClose();
    form.resetFields();
    setTempMaterials([]);
  };

  useEffect(() => {
    if (open) {
      fetchMaterials();
    }
  }, [open, initialMaterials, fetchMaterials]);

  const handleAddToTemp = () => {
    form
      .validateFields()
      .then((values: FormData) => {
        const processedValues = {
          ...values,
          materialId: String(values.materialId), // ← преобразуем в строку
        };

        const existingIndex = tempMaterials.findIndex(
          m => m.materialId === processedValues.materialId,
        );
        if (existingIndex >= 0) {
          message.warning('Материал уже добавлен');
          return;
        }

        setTempMaterials(prev => [...prev, processedValues]);
        form.resetFields(['materialId', 'quantityPerSqm']);
      })
      .catch(() => {});
  };

  const handleRemoveTemp = (materialId: string) => {
    setTempMaterials(prev => prev.filter(m => m.materialId !== materialId));
  };

  const handleSubmit = async () => {
    if (tempMaterials.length === 0) {
      message.warning('Добавьте хотя бы один материал');
      return;
    }

    setLoading(true);
    try {
      // Преобразуем все materialId в строки перед отправкой
      const processedMaterials = tempMaterials.map(m => ({
        ...m,
        materialId: String(m.materialId),
      }));

      await onAddMaterials(processedMaterials);
      message.success('Материалы успешно добавлены');
      onCLoseModal();
    } catch (error) {
      message.error(getErrorMessage(error) || 'Ошибка добавления материалов');
    } finally {
      setLoading(false);
    }
  };

  const materialColumns: ColumnsType<MaterialRequirement> = [
    {
      title: 'Материал',
      render: (_, record) => {
        const material = materials.find(m => m.id == record.materialId);
        return material ? `${material.name} (${material.id})` : `Материал ${record.materialId}`;
      },
    },
    {
      title: 'Количество на 1 м²',
      dataIndex: 'quantityPerSqm',
      render: value => `${value} шт.`,
    },
    {
      title: 'Действия',
      render: (_, record) => (
        <Button size="small" type="link" danger onClick={() => handleRemoveTemp(record.materialId)}>
          Удалить
        </Button>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onCLoseModal}
      footer={[
        <Button key="cancel" onClick={onCLoseModal}>
          Отмена
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          Добавить материалы
        </Button>,
      ]}
      title="Добавление материалов"
      width={800}
    >
      <Form form={form} layout="vertical">
        <Flex gap={8} style={{ width: '100%', marginBottom: 16 }}>
          <Form.Item
            name="materialId"
            label="Материал"
            rules={[{ required: true, message: 'Выберите материал' }]}
            style={{ flex: 1 }}
          >
            <Select
              placeholder="Выберите материал"
              options={materials
                .filter(m => !initialMaterials.find(i => i.materialId == m.id))
                .map(m => ({
                  label: `${m.name} (${m.id})`,
                  value: m.id,
                }))}
            />
          </Form.Item>

          <Form.Item
            name="quantityPerSqm"
            label="Количество на 1 м²"
            style={{ flex: 1 }}
            rules={[{ required: true, message: 'Введите количество' }]}
          >
            <InputNumber
              placeholder="Введите количество"
              // width={'100%'}
              style={{ width: '100%' }}
              min={0.01}
              step={0.01}
              precision={2}
            />
          </Form.Item>

          <Form.Item label=" ">
            <Button onClick={handleAddToTemp}>Добавить в список</Button>
          </Form.Item>
        </Flex>
      </Form>

      <Table
        dataSource={tempMaterials}
        columns={materialColumns}
        rowKey="materialId"
        pagination={false}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={3}>
              Всего материалов: {tempMaterials.length}
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </Modal>
  );
};

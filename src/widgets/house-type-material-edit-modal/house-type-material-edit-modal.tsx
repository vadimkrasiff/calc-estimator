import { Modal, Form, InputNumber, Button, message } from 'antd';
import type { MaterialRequirement } from '@/widgets/house-type-detail/house-type-materials';
import { useEffect } from 'react';
import { getErrorMessage } from '@/shared/api/errorUtils';

interface HouseTypeMaterialEditModalProps {
  open: boolean;
  onClose: () => void;
  material: MaterialRequirement | null;
  onUpdateMaterial: (id: string, quantityPerSqm: number) => Promise<void>;
}

export const HouseTypeMaterialEditModal = ({
  open,
  onClose,
  material,
  onUpdateMaterial,
}: HouseTypeMaterialEditModalProps) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (material) {
      form.setFieldsValue({
        quantityPerSqm: material.quantityPerSqm,
      });
    } else {
      form.resetFields();
    }
  }, [material, form]);

  const onFinish = async (values: { id: string; quantityPerSqm: number }) => {
    if (!material) return;

    try {
      await onUpdateMaterial(material.id, values.quantityPerSqm);
      message.success('Материал успешно обновлён');
      onClose();
    } catch (error) {
      message.error(getErrorMessage(error) || 'Ошибка обновления материала');
    }
  };

  if (!material) {
    return null;
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={`Редактирование материала: ${material.materialName || `Материал ${material.materialId}`}`}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="quantityPerSqm"
          label="Количество на 1 м²"
          rules={[{ required: true, message: 'Введите количество' }]}
          initialValue={material.quantityPerSqm}
        >
          <InputNumber
            placeholder="Введите количество"
            min={0.01}
            step={0.01}
            precision={2}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Отмена
          </Button>
          <Button type="primary" htmlType="submit">
            Сохранить
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

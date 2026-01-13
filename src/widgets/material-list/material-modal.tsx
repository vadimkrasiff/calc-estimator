import type { Material } from '@/entities/material/model/types';
import { Button, Form, Input, Modal, Select, message } from 'antd';
import { useEffect } from 'react';
import { useMaterialStore } from '@/entities/material/model/material-store';

export const MaterialModal = ({
  open,
  onCloseModal,
  selectedMaterial,
}: {
  open: boolean;
  onCloseModal: () => void;
  selectedMaterial: Material | null;
}) => {
  const [form] = Form.useForm();
  const { createMaterial, updateMaterial } = useMaterialStore();

  // Обновляем форму при изменении selectedMaterial
  useEffect(() => {
    if (selectedMaterial) {
      form.setFieldsValue({
        name: selectedMaterial.name,
        category: selectedMaterial.category,
        unit: selectedMaterial.unit,
        description: selectedMaterial.description,
      });
    } else {
      form.resetFields(); // очищаем при создании
    }
  }, [selectedMaterial, form]);

  const title = selectedMaterial ? `Материал "${selectedMaterial.name}"` : 'Добавление материала';
  const onSaveButtonText = selectedMaterial ? 'Сохранить' : 'Добавить';

  const onFinish = async values => {
    try {
      // Удаляем description, если он пустой
      const processedValues = {
        ...values,
        ...([null, undefined, ''].includes(values.description) ? { description: undefined } : {}),
      };

      if (selectedMaterial) {
        // Обновляем существующий материал
        await updateMaterial(selectedMaterial.id, processedValues);
        message.success('Материал обновлён');
      } else {
        // Создаём новый материал
        await createMaterial(processedValues);
        message.success('Материал добавлен');
      }
      onCloseModal(); // закрываем после сохранения
    } catch (error) {
      message.error(getErrorMessage(error) || 'Ошибка сохранения');
    }
  };

  return (
    <Modal open={open} onCancel={onCloseModal} cancelText={'Закрыть'} footer={[]} title={title}>
      <Form
        layout={'vertical'}
        onFinish={onFinish}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        form={form}
      >
        <Form.Item
          name="name"
          label="Название"
          rules={[{ required: true, message: 'Введите название' }]}
        >
          <Input placeholder="Введите название" />
        </Form.Item>

        <Form.Item
          name="category"
          label="Категория"
          rules={[{ required: true, message: 'Выберите категорию' }]}
        >
          <Select placeholder="Выберите категорию">
            <Select.Option value="Кладочные материалы">Кладочные материалы</Select.Option>
            <Select.Option value="Утеплители">Утеплители</Select.Option>
            <Select.Option value="Кровля">Кровля</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="unit"
          label="Единица измерения"
          rules={[{ required: true, message: 'Выберите единицу измерения' }]}
        >
          <Select placeholder="Выберите единицу измерения">
            <Select.Option value="шт">шт</Select.Option>
            <Select.Option value="м²">м²</Select.Option>
            <Select.Option value="м³">м³</Select.Option>
            <Select.Option value="кг">кг</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="description" label="Описание">
          <Input.TextArea
            rows={3}
            autoSize={{ maxRows: 6, minRows: 3 }}
            placeholder="Укажите описание"
          />
        </Form.Item>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <Button htmlType="reset" onClick={onCloseModal}>
            Закрыть
          </Button>
          <Button type="primary" htmlType="submit">
            {onSaveButtonText}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

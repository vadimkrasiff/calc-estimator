// Удаляем LUMBER_CATEGORY_ID — он больше не нужен!

import type { Material } from '@/entities/material/model/types';
import { Button, Flex, Form, Input, InputNumber, Modal, Select, Divider, message } from 'antd';
import { useEffect } from 'react';
import { useMaterialStore } from '@/entities/material/model/material-store';
import { useCategoryStore } from '@/entities/material-category/model/category-store';
import { getErrorMessage } from '@/shared/api/errorUtils';

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
  const { categories, fetchCategories } = useCategoryStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Следим только за unit
  const selectedUnit = Form.useWatch('unit', form);

  // Определяем, какие поля показывать
  const showCrossSection = selectedUnit === 'м³' || selectedUnit === 'пог.м'; // ширина + высота
  const showThicknessOnly = selectedUnit === 'м²'; // только толщина
  const showDimensions = showCrossSection || showThicknessOnly;

  useEffect(() => {
    if (selectedMaterial) {
      form.setFieldsValue({
        name: selectedMaterial.name,
        categoryId: selectedMaterial.categoryId,
        unit: selectedMaterial.unit,
        description: selectedMaterial.description,
        width: selectedMaterial.width,
        nominalWidth: selectedMaterial.nominalWidth,
        nominalHeight: selectedMaterial.nominalHeight,
        height: selectedMaterial.height,
        defaultWasteFactor: selectedMaterial.defaultWasteFactor,
      });
    } else {
      form.resetFields();
    }
  }, [selectedMaterial, form]);

  const title = selectedMaterial ? `Материал "${selectedMaterial.name}"` : 'Добавление материала';
  const onSaveButtonText = selectedMaterial ? 'Сохранить' : 'Добавить';

  const onFinish = async (values: Omit<Material, 'id' | 'createdAt'>) => {
    try {
      const processedValues = {
        ...values,
        description: values.description || undefined,
        width: values.width || undefined,
        height: values.height || undefined,
        defaultWasteFactor: Number(values.defaultWasteFactor) || undefined,
      };

      if (selectedMaterial) {
        await updateMaterial(selectedMaterial.id, processedValues);
        message.success('Материал обновлён');
      } else {
        await createMaterial(processedValues);
        message.success('Материал добавлен');
      }
      onCloseModal();
    } catch (error) {
      message.error(getErrorMessage(error) || 'Ошибка сохранения');
    }
  };

  return (
    <Modal
      width={700}
      open={open}
      onCancel={onCloseModal}
      cancelText={'Закрыть'}
      footer={[]}
      title={title}
    >
      <Form
        layout={'vertical'}
        onFinish={onFinish}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        form={form}
      >
        <Flex flex={1} gap={8}>
          <Form.Item
            style={{ flex: '1 0 0' }}
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input placeholder="Введите название" />
          </Form.Item>

          <Form.Item
            style={{ flex: '1 0 0' }}
            name="categoryId"
            label="Категория"
            rules={[{ required: true, message: 'Выберите категорию' }]}
          >
            <Select placeholder="Выберите категорию">
              {categories.map(cat => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Flex>

        <Flex flex={1} gap={8}>
          <Form.Item
            name="unit"
            label="Единица измерения"
            style={{ flex: '1 0 0' }}
            rules={[{ required: true, message: 'Выберите единицу измерения' }]}
          >
            <Select placeholder="Выберите единицу измерения">
              <Select.Option value="шт">шт</Select.Option>
              <Select.Option value="м²">м²</Select.Option>
              <Select.Option value="м³">м³</Select.Option>
              <Select.Option value="кг">кг</Select.Option>
              <Select.Option value="пог.м">пог.м</Select.Option>
            </Select>
          </Form.Item>
        </Flex>

        <Form.Item name="description" label="Описание">
          <Input.TextArea
            rows={3}
            autoSize={{ maxRows: 6, minRows: 3 }}
            placeholder="Укажите описание"
          />
        </Form.Item>

        {/* Универсальные поля для материалов с габаритами */}
        {showDimensions && (
          <>
            <Divider>Габариты (в миллиметрах)</Divider>
            <Flex gap={8}>
              {showCrossSection && (
                <Form.Item
                  name="width"
                  label="Ширина (мм)"
                  rules={[{ required: true, message: 'Укажите ширину' }]}
                >
                  <InputNumber style={{ width: '100%' }} placeholder="150" min={1} precision={0} />
                </Form.Item>
              )}

              <Form.Item
                name="height"
                label={showThicknessOnly ? 'Толщина (мм)' : 'Высота/Толщина (мм)'}
                rules={[{ required: true, message: 'Укажите толщину' }]}
              >
                <InputNumber style={{ width: '100%' }} placeholder="50" min={1} precision={0} />
              </Form.Item>
            </Flex>

            {showCrossSection && (
              <Flex gap={8}>
                <Form.Item
                  name="nominalWidth"
                  label="Номинальная ширина (мм)"
                  rules={[{ required: true, message: 'Укажите ширину' }]}
                >
                  <InputNumber style={{ width: '100%' }} placeholder="150" min={1} precision={0} />
                </Form.Item>

                <Form.Item
                  name="nominalHeight"
                  label={
                    showThicknessOnly
                      ? 'Номинальная  толщина (мм)'
                      : 'Номинальная высота/толщина (мм)'
                  }
                  rules={[{ required: true, message: 'Укажите толщину' }]}
                >
                  <InputNumber style={{ width: '100%' }} placeholder="50" min={1} precision={0} />
                </Form.Item>
              </Flex>
            )}

            <Form.Item name="defaultWasteFactor" label="Коэффициент отходов (например, 1.05 = +5%)">
              <InputNumber
                style={{ width: '100%' }}
                placeholder="1.05"
                min={1}
                step={0.01}
                precision={2}
              />
            </Form.Item>
          </>
        )}

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

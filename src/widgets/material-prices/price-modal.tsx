import type { Price } from '@/entities/price/model/types';
import { Button, Form, Input, InputNumber, Modal, Select, message } from 'antd';
import { useEffect, useState } from 'react';
import { usePriceStore } from '@/entities/price/model/price-store';
import { apiClient } from '@/shared/api/interceptor';
import { getErrorMessage } from '@/shared/api/errorUtils';

interface MaterialOption {
  id: string;
  name: string;
}

export const PriceModal = ({
  open,
  onCloseModal,
  selectedPrice,
}: {
  open: boolean;
  onCloseModal: () => void;
  selectedPrice: Price | null;
}) => {
  const [form] = Form.useForm();
  const { createPrice, updatePrice } = usePriceStore();
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Загружаем материалы при открытии модалки
  useEffect(() => {
    if (open) {
      loadMaterials();
    }
  }, [open]);

  const onClose = () => {
    onCloseModal();
    form.resetFields();
  };
  const loadMaterials = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/materials/select-options');
      setMaterials(response.data);
    } catch (error) {
      message.error(getErrorMessage(error) || 'Ошибка загрузки материалов');
    } finally {
      setLoading(false);
    }
  };

  // Обновляем форму при изменении selectedPrice
  useEffect(() => {
    if (selectedPrice) {
      form.setFieldsValue({
        materialId: selectedPrice.materialId,
        price: selectedPrice.price,
        // region: selectedPrice.region,
        supplier: selectedPrice.supplier,
        // date: selectedPrice.date,
      });
    } else {
      form.resetFields();
    }
  }, [selectedPrice, form]);

  const title = selectedPrice ? `Цена "${selectedPrice.supplier}"` : 'Добавление цены';
  const onSaveButtonText = selectedPrice ? 'Сохранить' : 'Добавить';

  const onFinish = async (values: Omit<Price, 'id'>) => {
    try {
      // Преобразуем materialId в строку, если он пришёл как число
      const processedValues = {
        ...values,
        materialId: String(values.materialId),
      };

      if (selectedPrice) {
        await updatePrice(selectedPrice.id, processedValues);
        message.success('Прайс обновлён');
      } else {
        await createPrice(processedValues);
        message.success('Прайс добавлен');
      }
      onClose();
    } catch (error) {
      message.error(getErrorMessage(error) || 'Ошибка сохранения');
    }
  };

  return (
    <Modal open={open} onCancel={onClose} cancelText={'Закрыть'} footer={[]} title={title}>
      <Form
        layout={'vertical'}
        onFinish={onFinish}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        form={form}
      >
        <Form.Item
          name="materialId"
          label="Материал"
          rules={[{ required: true, message: 'Выберите материал' }]}
        >
          <Select
            placeholder="Выберите материал"
            loading={loading}
            options={materials.map(m => ({
              label: `${m.name} (${m.id})`,
              value: String(m.id), // ← преобразуем в строку
            }))}
          />
        </Form.Item>

        <Form.Item name="price" label="Цена" rules={[{ required: true, message: 'Введите цену' }]}>
          <InputNumber
            precision={2}
            step={0.01}
            min={0}
            placeholder="Введите цену"
            style={{ width: '100%' }}
          />
        </Form.Item>

        {/* <Form.Item
          name="region"
          label="Регион"
          rules={[{ required: true, message: 'Введите регион' }]}
        >
          <Input placeholder="Введите регион" />
        </Form.Item> */}

        <Form.Item
          name="supplier"
          label="Поставщик"
          rules={[{ required: true, message: 'Введите поставщика' }]}
        >
          <Input placeholder="Введите поставщика" />
        </Form.Item>

        {/* <Form.Item name="date" label="Дата" rules={[{ required: true, message: 'Введите дату' }]}>
          <Input type="date" placeholder="Выберите дату" />
        </Form.Item> */}

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

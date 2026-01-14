import { Form, Input, Button, message } from 'antd';
import type { HouseType } from '@/entities/house-type/model/types';
import { useHouseTypeStore } from '@/entities/house-type/model/house-type-store';
import { useEffect } from 'react';
import { getErrorMessage } from '@/shared/api/errorUtils';

interface HouseTypeGeneralProps {
  houseType: HouseType;
}

export const HouseTypeGeneral = ({ houseType }: HouseTypeGeneralProps) => {
  const [form] = Form.useForm();
  const { updateHouseType } = useHouseTypeStore();

  useEffect(() => {
    if (houseType) {
      form.setFieldsValue({
        name: houseType.name,
        description: houseType.description,
      });
    }
  }, [houseType, form]);

  const onFinish = async (values: Omit<HouseType, 'id'>) => {
    try {
      const processedValues = {
        ...values,
        ...(values.description === '' ? { description: undefined } : {}),
      };

      await updateHouseType(houseType.id, processedValues);
      message.success('Тип дома обновлён');
    } catch (error) {
      message.error(getErrorMessage(error) || 'Ошибка сохранения');
    }
  };

  return (
    <Form layout="vertical" form={form} onFinish={onFinish} style={{ maxWidth: 600 }}>
      <Form.Item
        name="name"
        label="Название"
        rules={[{ required: true, message: 'Введите название' }]}
      >
        <Input placeholder="Введите название типа дома" />
      </Form.Item>

      <Form.Item name="description" label="Описание">
        <Input.TextArea
          rows={4}
          autoSize={{ maxRows: 6, minRows: 3 }}
          placeholder="Укажите описание"
        />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit">
          Сохранить изменения
        </Button>
      </Form.Item>
    </Form>
  );
};

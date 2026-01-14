import { Form, Select, InputNumber, Button, Card, Divider, Flex } from 'antd';
import { useEffect } from 'react';
import { useHouseTypeStore } from '@/entities/house-type/model/house-type-store';
import { useMaterialStore } from '@/entities/material/model/material-store';
import { usePriceStore } from '@/entities/price/model/price-store';

interface CalculatorFormData {
  houseTypeId: string;
  length: number;
  width: number;
  floors: number;
}

interface CalculatorFormProps {
  onSubmit: (data: CalculatorFormData) => void;
  loading: boolean;
}

export const CalculatorForm = ({ onSubmit, loading }: CalculatorFormProps) => {
  const [form] = Form.useForm();
  const { houseTypes, fetchHouseTypes } = useHouseTypeStore();
  const { fetchMaterials } = useMaterialStore();
  const { fetchPrices } = usePriceStore();

  useEffect(() => {
    fetchHouseTypes();
    fetchMaterials();
    fetchPrices();
  }, [fetchHouseTypes, fetchMaterials, fetchPrices]);

  const onFinish = (values: CalculatorFormData) => {
    onSubmit(values);
  };

  return (
    <Card title="Параметры дома">
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="houseTypeId"
          label="Тип дома"
          rules={[{ required: true, message: 'Выберите тип дома' }]}
        >
          <Select
            placeholder="Выберите тип дома"
            options={houseTypes.map(h => ({
              label: h.name,
              value: h.id,
            }))}
          />
        </Form.Item>

        <Divider size="small" />

        <Flex gap={8} style={{ width: '100%' }}>
          <Form.Item
            name="length"
            label="Длина (м)"
            rules={[{ required: true, message: 'Введите длину' }]}
            style={{ flex: 1 }}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Длина"
              min={1}
              step={0.1}
              precision={1}
            />
          </Form.Item>

          <Form.Item
            name="width"
            label="Ширина (м)"
            rules={[{ required: true, message: 'Введите ширину' }]}
            style={{ flex: 1 }}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Ширина"
              min={1}
              step={0.1}
              precision={1}
            />
          </Form.Item>
        </Flex>

        <Form.Item
          name="floors"
          label="Количество этажей"
          style={{ width: '100%' }}
          rules={[{ required: true, message: 'Введите количество этажей' }]}
        >
          <InputNumber style={{ width: '50%' }} placeholder="Количество этажей" min={1} max={10} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Рассчитать стоимость
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

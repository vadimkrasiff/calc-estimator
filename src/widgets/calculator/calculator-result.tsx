import { Card, Table, Space, Tag, Flex } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface MaterialCost {
  materialId: string;
  materialName: string;
  quantityPerSqm: number;
  quantityRequired: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
}

interface CalculatorResultProps {
  totalCost: number;
  materials: MaterialCost[];
  area: number;
  dimensions: {
    length: number;
    width: number;
    floors: number;
  };
}

const formatNumber = (num: number): string => {
  return num.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatCurrency = (num: number): string => {
  return `${formatNumber(num)} руб.`;
};

export const CalculatorResult = ({
  totalCost,
  materials,
  area,
  dimensions,
}: CalculatorResultProps) => {
  const materialColumns: ColumnsType<MaterialCost> = [
    {
      title: 'Материал',
      dataIndex: 'materialName',
      key: 'materialName',
    },
    {
      title: 'На 1 м²',
      dataIndex: 'quantityPerSqm',
      key: 'quantityPerSqm',
      render: value => formatNumber(value),
    },
    {
      title: 'Всего',
      key: 'quantityRequired',
      render: (_, record) => `${formatNumber(record.quantityRequired)} ${record.unit}`,
    },
    {
      title: 'Цена за ед.',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: 'Стоимость',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: value => formatCurrency(value),
    },
  ];

  return (
    <Card title="Результат расчёта">
      <Space orientation="vertical" style={{ width: '100%' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
          Общая стоимость: <span style={{ color: '#1890ff' }}>{formatCurrency(totalCost)}</span>
        </div>

        <Flex gap={8} align="center">
          <Tag color="blue">Площадь: {formatNumber(area)} м²</Tag>
          <Tag color="green">
            Габариты: {dimensions.length}×{dimensions.width}×{dimensions.floors} эт.
          </Tag>
        </Flex>

        <Table
          style={{ width: '100%' }}
          dataSource={materials}
          columns={materialColumns}
          rowKey="materialId"
          pagination={false}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={4}>
                <strong>Итого:</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <strong>{formatCurrency(totalCost)}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Space>
    </Card>
  );
};

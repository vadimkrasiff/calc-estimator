import { Card, Table, Space, Tag, Flex } from 'antd';
import type { ColumnsType } from 'antd/es/table';

// 🔑 Упрощённый интерфейс — без quantityPerSqm
interface MaterialCost {
  materialId: string;
  materialName: string;
  quantityRequired: number; // только итоговое количество
  quantityRequiredWidthWasteFactor: number; // только итоговое количество
  unit: string;
  unitPrice: number;
  totalCost: number;
  totalCostWidthWasteFactor: number;
  calculationType: string; // роль материала
}

interface CalculatorResultProps {
  totalCost: number;
  totalCostWidthWasteFactor: number;
  materials: MaterialCost[];
  area: number;
  baseArea: number;
  dimensions: {
    length: number;
    width: number;
    floors: number;
  };
  coefficients: {
    floorMultiplier: number;
    shapeRatio: number;
    ceilingHeight?: number[];
    roofPitch?: number;
    floorJoistSpacing?: number;
  };
}

// Сопоставление ролей с читаемыми названиями
const CALCULATION_TYPE_LABELS: Record<string, string> = {
  walls_logs: 'Брус для сруба',
  bottom_binding: 'Нижняя обвязка',
  floors_beams: 'Лаги',
  floors_subfloor: 'Черновой пол',
  ceilings_beams: 'Балки перекрытия',
  roofs_trusses: 'Стропила',
  roofs_sheathing: 'Обрешётка',
  upper_floor_beams: 'Лаги для 2 этажа',
  foundation_piles: 'Фундамент (свайный)',
  insulation: 'Утеплитель',
  vapor_barrier: 'Пароизоляционная плёнка',
  roofing_material: 'Кровельные материалы',
  interventr_insulation: 'Межвенцовый утеплитель',
  roof_battens: 'Контробрешётка',
  addit_foundation_piles: 'Оголовок усиленный',
};

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
  totalCostWidthWasteFactor,
  materials,
  area,
  baseArea,
  dimensions,
  coefficients,
}: CalculatorResultProps) => {
  const materialColumns: ColumnsType<MaterialCost> = [
    {
      fixed: 'start',
      title: 'Роль',
      dataIndex: 'calculationType',
      key: 'calculationType',
      render: (value: string) => <Tag color="blue">{CALCULATION_TYPE_LABELS[value] || value}</Tag>,
    },
    {
      title: 'Материал',
      dataIndex: 'materialName',
      key: 'materialName',
      className: 'text-wrap',
    },
    {
      title: 'Количество (шт.)',
      key: 'quantityPieces',
      dataIndex: 'quantityPieces',
      render: (value: string | number) => (value ? value + ' шт.' : ''),
    },
    {
      title: 'Всего',
      key: 'quantityRequired',
      render: (_, record) => `${formatNumber(record.quantityRequired)} ${record.unit}`,
    },
    {
      title: 'Всего c учтом коэфф. отходов',
      key: 'quantityRequiredWidthWasteFactor',
      render: (_, record) =>
        `${formatNumber(record.quantityRequiredWidthWasteFactor)} ${record.unit}`,
    },
    {
      title: 'Цена за ед.',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (value: number) => formatCurrency(value),
    },
    {
      fixed: 'end',
      title: 'Стоимость',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: value => formatCurrency(value),
    },
    {
      fixed: 'end',
      title: 'Стоимость c учтом коэфф. отходов',
      dataIndex: 'totalCostWidthWasteFactor',
      key: 'totalCostWidthWasteFactor',
      render: value => formatCurrency(value),
    },
  ];

  return (
    <Card title="Результат расчёта">
      <Space orientation="vertical" style={{ width: '100%' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
          Общая стоимость: <span style={{ color: '#1890ff' }}>{formatCurrency(totalCost)}</span>
        </div>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
          Общая стоимость (с учетом коэфф. отходов):{' '}
          <span style={{ color: '#1890ff' }}>{formatCurrency(totalCostWidthWasteFactor)}</span>
        </div>
        <Flex wrap gap={8} align="center">
          <Tag color="blue">Площадь: {formatNumber(area)} м²</Tag>
          <Tag color="gold">1 этаж: {formatNumber(baseArea)} м²</Tag>
          <Tag color="green">
            Габариты: {dimensions.length}×{dimensions.width}×{dimensions.floors} эт.
          </Tag>
          <Tag color="orange">Коэф. этажности: {coefficients.floorMultiplier.toFixed(2)}</Tag>
          <Tag color="cyan">Форма: {coefficients.shapeRatio.toFixed(2)}</Tag>
          {coefficients.ceilingHeight && (
            <Tag color="purple">Высота потолка: {coefficients.ceilingHeight} м</Tag>
          )}
          {coefficients.roofPitch && (
            <Tag color="volcano">Уклон крыши: {coefficients.roofPitch}</Tag>
          )}
          {coefficients.floorJoistSpacing && (
            <Tag color="geekblue">Шаг лаг: {coefficients.floorJoistSpacing} м</Tag>
          )}
        </Flex>

        <Table
          scroll={{ x: 'max-content' }}
          style={{ width: '100%' }}
          dataSource={materials}
          columns={materialColumns}
          rowKey="calculationType"
          pagination={false}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <strong style={{ position: 'sticky', left: 16 }}>Итого:</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} colSpan={5}></Table.Summary.Cell>

              <Table.Summary.Cell index={6}>
                <strong>{formatCurrency(totalCost)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={7}>
                <strong>{formatCurrency(totalCostWidthWasteFactor)}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Space>
    </Card>
  );
};

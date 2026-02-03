import { Table, Tag, Typography } from 'antd';
import { useMemo } from 'react';
import type { MaterialWithQuantity } from './calc-form'; // Путь к интерфейсу в вашем файле формы
import type { Material } from '@/entities/material/model/types';

const { Text } = Typography;

interface CalculationResultTableProps {
  materialsData: Record<string, MaterialWithQuantity>;
  allMaterials: Material[];
}

// Сопоставление ролей с читаемыми названиями
const CALCULATION_TYPE_LABELS: Record<string, string> = {
  walls_logs: 'Брус для сруба',
  bottom_binding: 'Нижняя обвязка',
  floors_beams: 'Лаги',
  roofs_trusses: 'Стропила',
  roofs_sheathing: 'Обрешётка',
  upper_floor_beams: 'Лаги для 2 этажа',
  foundation: 'Фундамент',
  insulation: 'Утеплитель',
  vapor_barrier: 'Пароизоляционная плёнка',
  roofing_material: 'Кровельные материалы',
  interventr_insulation: 'Межвенцовый утеплитель',
  roof_battens: 'Контробрешётка',
  walls_frame_structure: 'Каркас (стойки, балки)',
  walls_cladding_ext: 'Внешняя обшивка',
  walls_cladding_int: 'Внутренняя обшивка',
  floors_subfloor: 'Черновой пол',
  ceilings_beams: 'Балки перекрытия',
  walls_blocks: 'Газобетонные блоки',
};

// Функция форматирования валюты
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
  }).format(value);
};

interface TableRow {
  calculationType: string;
  materialName: string;
  unit: string;
  quantity: number;
  pricePerUnit: number | null;
  totalCost: number;
  dimensions?: string;
}

export const CalculationResultTable = ({
  materialsData,
  allMaterials,
}: CalculationResultTableProps) => {
  const tableData = useMemo(() => {
    return Object.entries(materialsData).map(([roleName, materialInfo]) => {
      const { materialId, quantity } = materialInfo;

      // Находим материал по ID
      const material = allMaterials.find(mat => mat.id.toString() === materialId.toString());

      if (!material) {
        return {
          calculationType: roleName,
          materialName: 'Материал не найден',
          unit: '',
          quantity,
          pricePerUnit: null,
          totalCost: 0,
        };
      }

      const pricePerUnit = material.latestPrice || 0;
      const totalCost = pricePerUnit * quantity;

      // Формируем строку с размерами, если они есть
      let dimensions = '';
      if (material.width && material.height) {
        dimensions = `${material.width}×${material.height} мм`;
      }

      return {
        calculationType: roleName,
        materialName: material.name,
        unit: material.unit,
        quantity,
        pricePerUnit,
        totalCost,
        dimensions,
      };
    });
  }, [materialsData, allMaterials]);

  // Вычисляем общую стоимость
  const totalCost = useMemo(() => {
    return tableData.reduce((sum, item) => sum + item.totalCost, 0);
  }, [tableData]);

  const materialColumns = [
    {
      title: 'Тип материала',
      dataIndex: 'calculationType',
      key: 'calculationType',
      render: (calculationType: string) => (
        <Text strong>{CALCULATION_TYPE_LABELS[calculationType] || calculationType}</Text>
      ),
      width: 200,
      fixed: 'left' as const,
    },
    {
      title: 'Наименование материала',
      dataIndex: 'materialName',
      key: 'materialName',
      render: (name: string, record: TableRow) => (
        <div>
          <div>{name}</div>
          {record.dimensions && (
            <Tag color="blue" style={{ marginTop: 4, display: 'inline-block' }}>
              {record.dimensions}
            </Tag>
          )}
        </div>
      ),
      width: 250,
    },
    {
      title: 'Единица измерения',
      dataIndex: 'unit',
      key: 'unit',
      width: 120,
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity: number) => <Text strong>{quantity.toFixed(2)}</Text>,
      width: 100,
    },
    {
      title: 'Цена за ед.',
      dataIndex: 'pricePerUnit',
      key: 'pricePerUnit',
      render: (price: number | null) => {
        if (price === null) {
          return <Text type="secondary">Цена не указана</Text>;
        }
        return <Text>{formatCurrency(price)}</Text>;
      },
      width: 150,
    },
    {
      title: 'Сумма',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (total: number) => <Text strong>{formatCurrency(total)}</Text>,
      width: 150,
      fixed: 'end' as const,
    },
  ];

  return (
    <Table
      scroll={{ x: 'max-content' }}
      style={{ width: '100%', marginTop: 24 }}
      dataSource={tableData}
      columns={materialColumns}
      rowKey="calculationType"
      pagination={false}
      summary={() => (
        <Table.Summary.Row>
          <Table.Summary.Cell index={0}>
            <strong style={{ position: 'sticky', left: 16 }}>Итого:</strong>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={2} colSpan={4}></Table.Summary.Cell>
          <Table.Summary.Cell index={5}>
            <strong>{formatCurrency(totalCost)}</strong>
          </Table.Summary.Cell>
        </Table.Summary.Row>
      )}
    />
  );
};

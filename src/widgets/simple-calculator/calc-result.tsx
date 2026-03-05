import { Table, Tag, Typography, Card, Space, Flex, Button, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useMemo } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { ColumnsType } from 'antd/es/table';
import type { MaterialWithQuantity } from './calc-form';
import type { Material } from '@/entities/material/model/types';

const { Text } = Typography;

// 🔑 Интерфейс для отображения результатов
export interface MaterialCost {
  materialId: string;
  materialName: string;
  quantityRequired: number;
  quantityRequiredWidthWasteFactor?: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  totalCostWidthWasteFactor?: number;
  calculationType: string;
  description?: string;
  price?: number;
  isLabor?: boolean;
  laborPricePerUnit?: number;
  quantityPieces?: number;
  dimensions?: string;
}

interface CalculationResultTableProps {
  materialsData: Record<string, MaterialWithQuantity>;
  allMaterials: Material[];
  calculatedMaterials?: MaterialCost[];
  totalCost?: number;
}

// Сопоставление ролей с читаемыми названиями
const CALCULATION_TYPE_LABELS: Record<string, string> = {
  walls_logs: 'Брус для сруба',
  bottom_binding: 'Нижняя обвязка',
  floors_beams: 'Лаги',
  roofs_trusses: 'Стропила',
  roofs_sheathing: 'Обрешётка',
  upper_floor_beams: 'Лаги для 2 этажа',
  foundation_piles: 'Фундамент (свайный)',
  foundation_strip: 'Фундамент (ленточный)',
  foundation_slab: 'Фундамент (плитный)',
  foundation_columns: 'Фундамент (столбчатый)',
  addit_foundation_piles: 'Оголовок усиленный',
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

const formatNumber = (num: number): string => {
  return num.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatCurrency = (num: number): string => {
  return `${formatNumber(num)} руб.`;
};

// Интерфейс для древовидных данных
interface TreeNode {
  key: string;
  title: string;
  children?: TreeNode[];
  record?: MaterialCost;
  isGroup?: boolean;
  roleKey?: string;
  totalCost?: number;
  totalCostWithWaste?: number;
}

// 🌳 Функция для построения дерева с группировкой по ролям
const buildTreeData = (materials: MaterialCost[]): TreeNode[] => {
  const roleGroups: Record<string, TreeNode> = {};

  materials.forEach(item => {
    // Определяем базовую роль (без суффикса _labor)
    let roleKey = item.calculationType;
    if (item.isLabor && roleKey.endsWith('_labor')) {
      roleKey = roleKey.replace('_labor', '');
    }

    // Создаём группу, если её ещё нет
    if (!roleGroups[roleKey]) {
      roleGroups[roleKey] = {
        key: `group-${roleKey}`,
        title: CALCULATION_TYPE_LABELS[roleKey] || roleKey,
        children: [],
        isGroup: true,
        roleKey,
        totalCost: 0,
        totalCostWithWaste: 0,
      };
    }

    // Добавляем элемент в группу
    roleGroups[roleKey].children!.push({
      key: `${roleKey}-${item.isLabor ? 'labor' : 'material'}-${item.materialId}`,
      title: item.isLabor ? 'Стоимость работ' : item.materialName,
      record: item,
    });

    // Обновляем итоги группы
    roleGroups[roleKey].totalCost = (roleGroups[roleKey].totalCost || 0) + item.totalCost;
    roleGroups[roleKey].totalCostWithWaste =
      (roleGroups[roleKey].totalCostWithWaste || 0) +
      (item.totalCostWidthWasteFactor || item.totalCost);
  });

  // Сортируем группы по названию
  return Object.values(roleGroups).sort((a, b) => a.title.localeCompare(b.title));
};

// 📊 Функция экспорта в Excel
const downloadExcel = async (data: {
  materials: MaterialCost[];
  totalCost: number;
  totalCostWidthWasteFactor?: number;
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Калькулятор материалов';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Материалы');

  // Заголовки
  const headerRow = sheet.addRow([
    'Роль',
    'Тип',
    'Материал',
    'Количество',
    'Ед. изм.',
    'Цена за ед.',
    'Стоимость',
  ]);

  headerRow.height = 40;
  headerRow.eachCell(cell => {
    cell.font = { bold: true, size: 12, name: 'Arial', color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Группируем материалы по ролям
  const roleGroups: Record<string, MaterialCost[]> = {};
  data.materials.forEach(item => {
    let roleKey = item.calculationType;
    if (item.isLabor && roleKey.endsWith('_labor')) {
      roleKey = roleKey.replace('_labor', '');
    }
    if (!roleGroups[roleKey]) roleGroups[roleKey] = [];
    roleGroups[roleKey].push(item);
  });

  // Добавляем строки с группировкой
  Object.entries(roleGroups).forEach(([roleKey, items]) => {
    // Заголовок группы
    const groupRow = sheet.addRow([
      CALCULATION_TYPE_LABELS[roleKey] || roleKey,
      'ГРУППА',
      '',
      '',
      '',
      '',
      '',
    ]);
    groupRow.height = 25;
    groupRow.eachCell(cell => {
      cell.font = { bold: true, size: 11, name: 'Arial' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Элементы группы
    items.forEach((item, idx) => {
      const bgColor = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF5F5F5';
      const row = sheet.addRow([
        '',
        item.isLabor ? 'Работа' : 'Материал',
        item.materialName,
        formatNumber(item.quantityRequired),
        item.unit,
        formatCurrency(item.unitPrice),
        formatCurrency(item.totalCost),
      ]);
      row.height = 30;
      row.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: item.isLabor ? 'FFE6F7FF' : bgColor },
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        cell.font = { name: 'Arial', size: 11 };
        // Выравнивание числовых колонок
        if ([4, 6, 7].includes(colNumber)) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else if (colNumber === 5) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    });

    // Итог по группе
    const groupTotal = items.reduce((sum, i) => sum + i.totalCost, 0);
    const totalRow = sheet.addRow([
      '',
      'ИТОГ ПО ГРУППЕ',
      '',
      '',
      '',
      '',
      formatCurrency(groupTotal),
    ]);
    totalRow.eachCell(cell => {
      cell.font = { bold: true, size: 11, name: 'Arial' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDAE3F3' } };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      if (cell.col === '7') cell.alignment = { horizontal: 'right', vertical: 'middle' };
    });

    sheet.addRow([]); // Пустая строка между группами
  });

  // Общий итог
  const finalTotal = data.materials.reduce((sum, i) => sum + i.totalCost, 0);
  const finalRow = sheet.addRow(['ОБЩИЙ ИТОГ:', '', '', '', '', '', formatCurrency(finalTotal)]);
  finalRow.height = 35;
  finalRow.eachCell(cell => {
    cell.font = { bold: true, size: 12, name: 'Arial', color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    if (cell.col === '7') cell.alignment = { horizontal: 'right', vertical: 'middle' };
  });

  // Ширина колонок
  sheet.getColumn(1).width = 25;
  sheet.getColumn(2).width = 12;
  sheet.getColumn(3).width = 35;
  sheet.getColumn(4).width = 15;
  sheet.getColumn(5).width = 10;
  sheet.getColumn(6).width = 15;
  sheet.getColumn(7).width = 18;

  // Генерация файла
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const date = new Date();
  const fileName = `расчет_материалов_${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}.xlsx`;
  saveAs(blob, fileName);
};

export const CalculationResultTable = ({
  materialsData,
  allMaterials,
  calculatedMaterials,
  totalCost: propTotalCost,
}: CalculationResultTableProps) => {
  // 🔄 Если переданы рассчитанные материалы — используем их, иначе собираем из materialsData
  const materials = useMemo(() => {
    if (calculatedMaterials && calculatedMaterials.length > 0) {
      return calculatedMaterials;
    }
    // Fallback: сборка из старого формата
    return Object.entries(materialsData).map(([roleName, materialInfo]) => {
      const { materialId, quantity, laborPrice } = materialInfo;
      const material = allMaterials.find(mat => mat.id.toString() === materialId.toString());

      if (!material) {
        return {
          materialId,
          materialName: 'Материал не найден',
          quantityRequired: quantity,
          unit: '',
          unitPrice: 0,
          totalCost: 0,
          calculationType: roleName,
        };
      }

      const pricePerUnit = material.latestPrice || 0;
      const totalCost = pricePerUnit * quantity;

      const result: MaterialCost = {
        materialId: material.id.toString(),
        materialName: material.name,
        quantityRequired: quantity,
        unit: material.unit || 'шт',
        unitPrice: pricePerUnit,
        totalCost,
        calculationType: roleName,
        description: material.description,
        price: pricePerUnit,
        quantityPieces: quantity,
      };

      // Если указана цена работы — добавляем отдельную запись
      if (laborPrice && laborPrice > 0) {
        result.isLabor = true;
        result.laborPricePerUnit = laborPrice;
      }

      return result;
    });
  }, [materialsData, allMaterials, calculatedMaterials]);

  const treeData = useMemo(() => buildTreeData(materials), [materials]);

  const totalCost = useMemo(() => {
    if (propTotalCost !== undefined) return propTotalCost;
    return materials.reduce((sum, item) => sum + item.totalCost, 0);
  }, [materials, propTotalCost]);

  // 📋 Колонки таблицы
  const columns: ColumnsType<TreeNode> = [
    {
      title: 'Роль / Материал',
      key: 'name',
      fixed: 'start',
      width: '30%',
      render: (_, record) => {
        if (record.isGroup) {
          return (
            <Text strong style={{ fontSize: '16px' }}>
              {record.title}
            </Text>
          );
        }
        return (
          <div style={{ paddingLeft: 24 }}>
            <Tag color={record.record?.isLabor ? 'green' : 'blue'} style={{ marginRight: 8 }}>
              {record.record?.isLabor ? 'Работа' : 'Материал'}
            </Tag>
            {record.title}
          </div>
        );
      },
    },
    {
      title: 'Количество',
      key: 'quantity',
      width: '12%',
      render: (_, record) => {
        // Показываем количество только у группы (берём из материала, не из работы)
        if (record.isGroup) {
          const materialChild = record.children?.find(child => !child.record?.isLabor);
          if (!materialChild?.record) return '-';
          const qty = materialChild.record.quantityRequired;
          return qty > 0 ? `${formatNumber(qty)} ${materialChild.record.unit}` : '-';
        }
        return '';
      },
    },
    {
      title: 'Цена за ед.',
      key: 'unitPrice',
      width: '15%',
      render: (_, record) => {
        if (record.isGroup) return '-';
        if (!record.record) return '-';
        return formatCurrency(record.record.unitPrice);
      },
    },
    {
      title: 'Стоимость',
      key: 'cost',
      width: '15%',
      fixed: 'end',
      render: (_, record) => {
        if (record.isGroup) {
          return <Text strong>{record.totalCost ? formatCurrency(record.totalCost) : '-'}</Text>;
        }
        if (!record.record) return '-';
        return formatCurrency(record.record.totalCost);
      },
    },
  ];

  const handleDownload = () => {
    if (materials.length === 0) {
      message.warning('Нет данных для экспорта');
      return;
    }
    downloadExcel({
      materials,
      totalCost,
      totalCostWidthWasteFactor: totalCost,
    });
    message.success('Файл Excel загружен');
  };

  const getRowClassName = (record: TreeNode) => (record.isGroup ? 'group-row' : '');

  return (
    <Card
      title="Результат расчёта"
      extra={
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
          Скачать Excel
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Итоговая стоимость */}
        <Flex wrap gap={16} align="center" justify="space-between">
          <Flex wrap gap={16} align="center">
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              Итого: <span style={{ color: '#1890ff' }}>{formatCurrency(totalCost)}</span>
            </div>
          </Flex>
        </Flex>

        {/* Таблица с древовидной структурой */}
        <Table
          rowClassName={getRowClassName}
          columns={columns}
          dataSource={treeData}
          rowKey="key"
          pagination={false}
          defaultExpandAllRows={true}
          scroll={{ x: 'max-content' }}
          expandable={{ indentSize: 20 }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <Text strong>Общий итог:</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}></Table.Summary.Cell>
              <Table.Summary.Cell index={3}>
                <Text strong>{formatCurrency(totalCost)}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Space>
    </Card>
  );
};

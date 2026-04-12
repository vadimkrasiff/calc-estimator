import { Table, Tag, Typography, Card, Space, Flex, Button, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useMemo } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { ColumnsType } from 'antd/es/table';
import type { MaterialWithQuantity } from './calc-form';
import type { AnyType, Material } from '@/entities/material/model/types';

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

// ✅ Сопоставление ролей с группами верхнего уровня
const ROLE_TO_GROUP: Record<string, 'roof' | 'loghouse' | 'foundation'> = {
  // 🏠 Крыша
  roofs_trusses: 'roof',
  roofs_sheathing: 'roof',
  roofing_material: 'roof',
  roof_battens: 'roof',
  insulation: 'roof',
  vapor_barrier: 'roof',

  // 🪵 Сруб
  walls_logs: 'loghouse',
  bottom_binding: 'loghouse',
  floors_beams: 'loghouse',
  upper_floor_beams: 'loghouse',
  interventr_insulation: 'loghouse',
  walls_frame_structure: 'loghouse',
  walls_cladding_ext: 'loghouse',
  walls_cladding_int: 'loghouse',
  floors_subfloor: 'loghouse',
  ceilings_beams: 'loghouse',
  walls_blocks: 'loghouse',

  // 🏗️ Фундамент
  foundation_piles: 'foundation',
  foundation_strip: 'foundation',
  foundation_slab: 'foundation',
  foundation_columns: 'foundation',
  addit_foundation_piles: 'foundation',
};

// ✅ Названия и цвета групп
const GROUP_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  roof: {
    label: '🏠 Крыша',
    color: 'orange',
    description: 'Стропила, обрешётка, кровля, утепление',
  },
  loghouse: {
    label: '🪵 Сруб',
    color: 'blue',
    description: 'Брус, лаги, обвязка, межвенцовый утеплитель',
  },
  foundation: {
    label: '🏗️ Фундамент',
    color: 'green',
    description: 'Сваи, лента, плита или столбы',
  },
};

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

// ✅ Интерфейс для древовидных данных (три уровня: Категория → Роль → Материал)
interface TreeNode {
  key: string;
  title: string;
  children?: TreeNode[];
  record?: MaterialCost;
  isGroup?: boolean; // Роль (вторая уровень)
  isCategory?: boolean; // Категория (первый уровень)
  groupKey?: string; // 'roof' | 'loghouse' | 'foundation'
  roleKey?: string;
  totalCost?: number;
  totalCostWithWaste?: number;
}

// 🌳 Функция для построения дерева с трёхуровневой группировкой
const buildTreeData = (materials: MaterialCost[]): TreeNode[] => {
  // Структура: { categoryKey: { roleKey: TreeNode } }
  const grouped: Record<string, Record<string, TreeNode>> = {
    roof: {},
    loghouse: {},
    foundation: {},
  };

  materials.forEach(item => {
    let roleKey = item.calculationType;
    if (item.isLabor && roleKey.endsWith('_labor')) {
      roleKey = roleKey.replace('_labor', '');
    }

    const groupKey = ROLE_TO_GROUP[roleKey] || 'loghouse';

    if (!grouped[groupKey][roleKey]) {
      grouped[groupKey][roleKey] = {
        key: `role-${groupKey}-${roleKey}`,
        title: CALCULATION_TYPE_LABELS[roleKey] || roleKey,
        children: [],
        isGroup: true,
        roleKey,
        groupKey,
        totalCost: 0,
        totalCostWithWaste: 0,
      };
    }

    grouped[groupKey][roleKey].children!.push({
      key: `item-${roleKey}-${item.isLabor ? 'labor' : 'material'}-${item.materialId}`,
      title: item.isLabor ? '💼 Стоимость работ' : item.materialName,
      record: item,
    });

    grouped[groupKey][roleKey].totalCost =
      (grouped[groupKey][roleKey].totalCost || 0) + item.totalCost;
    grouped[groupKey][roleKey].totalCostWithWaste =
      (grouped[groupKey][roleKey].totalCostWithWaste || 0) +
      (item.totalCostWidthWasteFactor || item.totalCost);
  });

  const result: TreeNode[] = [];

  // Порядок: Крыша → Сруб → Фундамент
  (['roof', 'loghouse', 'foundation'] as const).forEach(groupKey => {
    const roles = Object.values(grouped[groupKey]);
    if (roles.length === 0) return;

    const categoryTotal = roles.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    const categoryTotalWithWaste = roles.reduce((sum, r) => sum + (r.totalCostWithWaste || 0), 0);

    result.push({
      key: `cat-${groupKey}`,
      title: GROUP_CONFIG[groupKey].label,
      children: roles.sort((a, b) => a.title.localeCompare(b.title)),
      isCategory: true,
      groupKey,
      totalCost: categoryTotal,
      totalCostWithWaste: categoryTotalWithWaste,
    });
  });

  return result;
};

// 📊 Функция экспорта в Excel с трёхуровневой группировкой
const downloadExcel = async (data: {
  materials: MaterialCost[];
  totalCost: number;
  totalCostWidthWasteFactor?: number;
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Калькулятор материалов';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Материалы');

  // Заголовки с дополнительной колонкой "Группа"
  const headerRow = sheet.addRow([
    'Группа',
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

  // Группируем: { categoryKey: { roleKey: MaterialCost[] } }
  const grouped: Record<string, Record<string, MaterialCost[]>> = {
    roof: {},
    loghouse: {},
    foundation: {},
  };

  data.materials.forEach(item => {
    let roleKey = item.calculationType;
    if (item.isLabor && roleKey.endsWith('_labor')) {
      roleKey = roleKey.replace('_labor', '');
    }
    const groupKey = ROLE_TO_GROUP[roleKey] || 'loghouse';
    if (!grouped[groupKey][roleKey]) grouped[groupKey][roleKey] = [];
    grouped[groupKey][roleKey].push(item);
  });

  // Рендеринг с иерархией
  (['roof', 'loghouse', 'foundation'] as const).forEach(groupKey => {
    const roles = grouped[groupKey];
    if (Object.keys(roles).length === 0) return;

    // Заголовок категории
    const catRow = sheet.addRow([GROUP_CONFIG[groupKey].label, '', '', '', '', '', '', '']);
    catRow.height = 30;
    catRow.eachCell(cell => {
      cell.font = { bold: true, size: 13, name: 'Arial', color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb:
            GROUP_CONFIG[groupKey].color === 'orange'
              ? 'FFFFA500'
              : GROUP_CONFIG[groupKey].color === 'blue'
                ? 'FF1890FF'
                : 'FF52C41A',
        },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        right: { style: 'thin' },
      };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    });

    // Роли внутри категории
    Object.entries(roles).forEach(([roleKey, items]) => {
      // Заголовок роли
      const roleRow = sheet.addRow([
        '',
        CALCULATION_TYPE_LABELS[roleKey] || roleKey,
        'ГРУППА',
        '',
        '',
        '',
        '',
        '',
      ]);
      roleRow.height = 25;
      roleRow.eachCell(cell => {
        cell.font = { bold: true, size: 11, name: 'Arial' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      // Элементы роли
      items.forEach((item, idx) => {
        const bgColor = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF5F5F5';
        const row = sheet.addRow([
          '',
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
          if ([5, 7, 8].includes(colNumber)) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          } else if (colNumber === 6) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        });
      });

      // Итог по роли
      const roleTotal = items.reduce((sum, i) => sum + i.totalCost, 0);
      const roleTotalRow = sheet.addRow([
        '',
        '',
        'ИТОГ ПО РОЛИ',
        '',
        '',
        '',
        '',
        formatCurrency(roleTotal),
      ]);
      roleTotalRow.eachCell(cell => {
        cell.font = { bold: true, size: 11, name: 'Arial' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDAE3F3' } };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        if (cell.col === '8') cell.alignment = { horizontal: 'right', vertical: 'middle' };
      });

      sheet.addRow([]);
    });

    // Итог по категории
    const catTotal = Object.values(roles)
      .flat()
      .reduce((sum, i) => sum + i.totalCost, 0);
    const catTotalRow = sheet.addRow([
      '',
      '',
      '',
      `ИТОГО ${GROUP_CONFIG[groupKey].label.split(' ')[1]?.toUpperCase() || ''}`,
      '',
      '',
      '',
      formatCurrency(catTotal),
    ]);
    catTotalRow.eachCell(cell => {
      cell.font = { bold: true, size: 12, name: 'Arial' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb:
            (GROUP_CONFIG[groupKey].color === 'orange'
              ? 'FFFFA500'
              : GROUP_CONFIG[groupKey].color === 'blue'
                ? 'FF1890FF'
                : 'FF52C41A') + '20',
        },
      };
      cell.border = {
        top: { style: 'medium' },
        left: { style: 'thin' },
        bottom: { style: 'medium' },
        right: { style: 'thin' },
      };
      if (cell.col === '8') cell.alignment = { horizontal: 'right', vertical: 'middle' };
    });

    sheet.addRow([]);
  });

  // Общий итог
  const finalTotal = data.materials.reduce((sum, i) => sum + i.totalCost, 0);
  const finalRow = sheet.addRow([
    '',
    '',
    '',
    '🔷 ОБЩИЙ ИТОГ:',
    '',
    '',
    '',
    formatCurrency(finalTotal),
  ]);
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
    if (cell.col === '8') cell.alignment = { horizontal: 'right', vertical: 'middle' };
  });

  // Ширина колонок
  sheet.getColumn(1).width = 15;
  sheet.getColumn(2).width = 25;
  sheet.getColumn(3).width = 12;
  sheet.getColumn(4).width = 35;
  sheet.getColumn(5).width = 15;
  sheet.getColumn(6).width = 10;
  sheet.getColumn(7).width = 15;
  sheet.getColumn(8).width = 18;

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
  const materials = useMemo(() => {
    if (calculatedMaterials && calculatedMaterials.length > 0) {
      return calculatedMaterials;
    }
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

  // 📋 Колонки таблицы с поддержкой трёх уровней
  const columns: ColumnsType<TreeNode> = [
    {
      title: 'Группа / Роль / Материал',
      key: 'name',
      fixed: 'start',
      width: '35%',
      render: (_, record) => {
        // 🏠 Категория (первый уровень)
        if (record.isCategory && record.groupKey) {
          return (
            <Flex align="center" gap={8}>
              <Tag
                color={GROUP_CONFIG[record.groupKey].color as AnyType}
                style={{ fontSize: '12px' }}
              >
                {record.title.split(' ')[0]}
              </Tag>
              <Text strong style={{ fontSize: '16px' }}>
                {record.title.split(' ').slice(1).join(' ')}
              </Text>
            </Flex>
          );
        }
        // 🔧 Роль (второй уровень)
        if (record.isGroup) {
          return (
            <div style={{ paddingLeft: 16 }}>
              <Tag color="default" style={{ marginRight: 8, fontSize: '11px' }}>
                Роль
              </Tag>
              <Text strong>{record.title}</Text>
            </div>
          );
        }
        // 📦 Материал или работа (третий уровень)
        return (
          <div style={{ paddingLeft: 40 }}>
            <Tag color={record.record?.isLabor ? 'green' : 'blue'} style={{ marginRight: 8 }}>
              {record.record?.isLabor ? '💼 Работа' : '📦 Материал'}
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
        if (record.isGroup) {
          const materialChild = record.children?.find(child => !child.record?.isLabor);
          if (!materialChild?.record) return '-';
          const qty = materialChild.record.quantityRequired;
          return qty > 0 ? `${formatNumber(qty)} ${materialChild.record.unit}` : '-';
        }
        return record.isCategory ? '' : '-';
      },
    },
    {
      title: 'Цена за ед.',
      key: 'unitPrice',
      width: '15%',
      render: (_, record) => {
        if (record.isCategory || record.isGroup) return '-';
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
        if (record.isCategory || record.isGroup) {
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

  // Считаем суммы по категориям для отображения
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    treeData.forEach(cat => {
      if (cat.isCategory && cat.groupKey && cat.totalCost) {
        totals[cat.groupKey] = cat.totalCost;
      }
    });
    return totals;
  }, [treeData]);

  const getRowClassName = (record: TreeNode) => {
    if (record.isCategory) return 'category-row';
    if (record.isGroup) return 'role-row';
    return '';
  };

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
        {/* Итоговая стоимость + суммы по категориям */}
        <Flex wrap gap={16} align="center" justify="space-between">
          <Flex wrap gap={16} align="center">
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              Итого: <span style={{ color: '#1890ff' }}>{formatCurrency(totalCost)}</span>
            </div>
          </Flex>
          {/* Теги с суммами по группам */}
          <Flex wrap gap={8}>
            {(['roof', 'loghouse', 'foundation'] as const).map(groupKey => {
              const cost = categoryTotals[groupKey];
              if (!cost) return null;
              return (
                <Tag
                  key={groupKey}
                  color={GROUP_CONFIG[groupKey].color as AnyType}
                  style={{ cursor: 'default' }}
                >
                  {GROUP_CONFIG[groupKey].label.split(' ')[1]}: {formatCurrency(cost)}
                </Tag>
              );
            })}
          </Flex>
        </Flex>

        {/* Таблица с трёхуровневой иерархией */}
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
              <Table.Summary.Cell index={0} colSpan={1}>
                <Text strong>🔷 Общий итог:</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} colSpan={2}></Table.Summary.Cell>
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

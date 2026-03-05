import { Card, Table, Space, Tag, Flex, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// 🔑 Упрощённый интерфейс — без quantityPerSqm
interface MaterialCost {
  materialId: string;
  materialName: string;
  quantityRequired: number;
  quantityRequiredWidthWasteFactor: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  totalCostWidthWasteFactor: number;
  calculationType: string;
  isLabor?: boolean;
  laborPricePerUnit?: number;
}

// Интерфейс для древовидных данных
interface TreeNode {
  key: string;
  title: string;
  children?: TreeNode[];
  record?: MaterialCost;
  isGroup?: boolean;
  roleKey?: string; // Ключ роли для группировки
  totalCost?: number;
  totalCostWithWaste?: number;
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

// Функция для построения дерева с уникальными ключами
const buildTreeData = (materials: MaterialCost[]): TreeNode[] => {
  const roleGroups: Record<string, TreeNode> = {};

  // Сначала группируем по ролям (без суффикса _labor)
  materials.forEach(item => {
    // Определяем базовую роль (без _labor)
    let roleKey = item.calculationType;
    if (item.isLabor && roleKey.endsWith('_labor')) {
      roleKey = roleKey.replace('_labor', '');
    }

    // Если группа для этой роли еще не создана
    if (!roleGroups[roleKey]) {
      roleGroups[roleKey] = {
        key: `group-${roleKey}`, // Используем roleKey как ключ группы
        title: CALCULATION_TYPE_LABELS[roleKey] || roleKey,
        children: [],
        isGroup: true,
        roleKey: roleKey,
        totalCost: 0,
        totalCostWithWaste: 0,
      };
    }

    // Добавляем элемент в группу
    roleGroups[roleKey].children!.push({
      key: item.calculationType, // Используем calculationType как ключ (он уникальный)
      title: item.isLabor ? 'Стоимость работ' : item.materialName,
      record: item,
    });

    // Обновляем общую стоимость группы
    roleGroups[roleKey].totalCost = (roleGroups[roleKey].totalCost || 0) + item.totalCost;
    roleGroups[roleKey].totalCostWithWaste =
      (roleGroups[roleKey].totalCostWithWaste || 0) + item.totalCostWidthWasteFactor;
  });

  // Сортируем группы по названию
  return Object.values(roleGroups).sort((a, b) => a.title.localeCompare(b.title));
};

// Функция для создания стилизованного Excel файла с помощью exceljs
const downloadExcel = async (data: {
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
}) => {
  // Создаем новую рабочую книгу
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Калькулятор материалов';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ========== ЛИСТ 1: Параметры расчета ==========
  const paramsSheet = workbook.addWorksheet('Параметры');

  // Заголовок
  paramsSheet.mergeCells('A1:B1');
  const titleCell = paramsSheet.getCell('A1');
  titleCell.value = 'Параметры расчета';
  titleCell.font = {
    bold: true,
    size: 14,
    name: 'Arial',
    color: { argb: 'FFFFFFFF' },
  };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  titleCell.alignment = {
    horizontal: 'center',
    vertical: 'middle',
  };
  titleCell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };

  // Параметры
  const params = [
    ['Площадь общая:', `${formatNumber(data.area)} м²`],
    ['Площадь 1 этажа:', `${formatNumber(data.baseArea)} м²`],
    [
      'Габариты:',
      `${data.dimensions.length}×${data.dimensions.width}×${data.dimensions.floors} эт.`,
    ],
    ['Коэффициент этажности:', data.coefficients.floorMultiplier.toFixed(2)],
    ['Коэффициент формы:', data.coefficients.shapeRatio.toFixed(2)],
  ];

  // Добавляем дополнительные параметры, если они есть
  if (data.coefficients.ceilingHeight) {
    params.push(['Высота потолка:', `${data.coefficients.ceilingHeight} м`]);
  }
  if (data.coefficients.roofPitch) {
    params.push(['Уклон крыши:', `${data.coefficients.roofPitch}°`]);
  }
  if (data.coefficients.floorJoistSpacing) {
    params.push(['Шаг лаг:', `${data.coefficients.floorJoistSpacing} м`]);
  }

  // Добавляем строки с параметрами
  paramsSheet.addRows(params);

  // Стилизуем строки с параметрами
  for (let i = 2; i <= params.length + 1; i++) {
    const row = paramsSheet.getRow(i);
    row.eachCell(cell => {
      cell.font = { name: 'Arial', size: 11 };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { vertical: 'middle' };
    });

    // Выравнивание значений по правому краю
    row.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
  }

  // Пустая строка
  paramsSheet.addRow([]);

  // Итоговые суммы
  const totalRow1 = paramsSheet.addRow(['Итоговая стоимость:', formatCurrency(data.totalCost)]);
  totalRow1.eachCell(cell => {
    cell.font = { bold: true, size: 12, name: 'Arial' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F0FA' },
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
  totalRow1.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };

  const totalRow2 = paramsSheet.addRow([
    'Итоговая стоимость (с учетом отходов):',
    formatCurrency(data.totalCostWidthWasteFactor),
  ]);
  totalRow2.eachCell(cell => {
    cell.font = { bold: true, size: 12, name: 'Arial' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F0FA' },
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
  totalRow2.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };

  // Настройка ширины колонок
  paramsSheet.getColumn(1).width = 35;
  paramsSheet.getColumn(2).width = 25;

  // ========== ЛИСТ 2: Материалы ==========
  const materialsSheet = workbook.addWorksheet('Материалы');

  // Заголовки таблицы
  const headerRow = materialsSheet.addRow([
    'Роль',
    'Тип',
    'Материал',
    'Количество\n(без отходов)',
    'Количество\n(с отходами)',
    'Ед. изм.',
    'Цена за ед.',
    'Стоимость\n(без отходов)',
    'Стоимость\n(с отходами)',
  ]);

  // Стилизация заголовков
  headerRow.height = 40;
  headerRow.eachCell(cell => {
    cell.font = {
      bold: true,
      size: 12,
      name: 'Arial',
      color: { argb: 'FFFFFFFF' },
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Группируем по ролям для Excel
  const roleGroups: Record<string, MaterialCost[]> = {};
  data.materials.forEach(item => {
    let roleKey = item.calculationType;
    if (item.isLabor && roleKey.endsWith('_labor')) {
      roleKey = roleKey.replace('_labor', '');
    }

    if (!roleGroups[roleKey]) {
      roleGroups[roleKey] = [];
    }
    roleGroups[roleKey].push(item);
  });

  // Добавляем данные с группировкой
  Object.entries(roleGroups).forEach(([roleKey, items]) => {
    // Заголовок группы
    const groupRow = materialsSheet.addRow([
      CALCULATION_TYPE_LABELS[roleKey] || roleKey,
      'ГРУППА',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
    groupRow.height = 25;
    groupRow.eachCell(cell => {
      cell.font = { bold: true, size: 11, name: 'Arial' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
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

      const row = materialsSheet.addRow([
        '',
        item.isLabor ? 'Работа' : 'Материал',
        item.materialName,
        formatNumber(item.quantityRequired),
        formatNumber(item.quantityRequiredWidthWasteFactor),
        item.unit,
        formatCurrency(item.unitPrice),
        formatCurrency(item.totalCost),
        formatCurrency(item.totalCostWidthWasteFactor),
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

        // Выравнивание
        if ([4, 5, 7, 8, 9].includes(colNumber)) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else if (colNumber === 6) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    });

    // Итог по группе
    const groupTotal = items.reduce((sum, i) => sum + i.totalCost, 0);
    const groupTotalWithWaste = items.reduce((sum, i) => sum + i.totalCostWidthWasteFactor, 0);

    const totalRow = materialsSheet.addRow([
      '',
      'ИТОГ ПО ГРУППЕ',
      '',
      '',
      '',
      '',
      '',
      formatCurrency(groupTotal),
      formatCurrency(groupTotalWithWaste),
    ]);
    totalRow.eachCell(cell => {
      cell.font = { bold: true, size: 11, name: 'Arial' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDAE3F3' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      if (cell.col === '8' || cell.col === '9') {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    });

    // Пустая строка между группами
    materialsSheet.addRow([]);
  });

  // Общий итог
  const finalTotalRow = materialsSheet.addRow([
    'ОБЩИЙ ИТОГ:',
    '',
    '',
    '',
    '',
    '',
    '',
    formatCurrency(data.totalCost),
    formatCurrency(data.totalCostWidthWasteFactor),
  ]);

  finalTotalRow.height = 35;
  finalTotalRow.eachCell(cell => {
    cell.font = { bold: true, size: 12, name: 'Arial' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    if (cell.col === '8' || cell.col === '9') {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }
  });

  // Настройка ширины колонок
  materialsSheet.getColumn(1).width = 25; // Роль
  materialsSheet.getColumn(2).width = 12; // Тип
  materialsSheet.getColumn(3).width = 35; // Материал
  materialsSheet.getColumn(4).width = 15; // Количество (без отходов)
  materialsSheet.getColumn(5).width = 15; // Количество (с отходами)
  materialsSheet.getColumn(6).width = 10; // Ед. изм.
  materialsSheet.getColumn(7).width = 15; // Цена за ед.
  materialsSheet.getColumn(8).width = 18; // Стоимость (без отходов)
  materialsSheet.getColumn(9).width = 18; // Стоимость (с отходами)

  // ========== ЛИСТ 3: Информация ==========
  const infoSheet = workbook.addWorksheet('Информация');
  infoSheet.getColumn(1).width = 80;

  infoSheet.addRow(['Информация о расчёте']).eachCell(cell => {
    cell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    cell.alignment = { horizontal: 'center' };
  });

  infoSheet.addRow([`Дата расчёта: ${new Date().toLocaleString('ru-RU')}`]);
  infoSheet.addRow([]);
  infoSheet.addRow(['Условные обозначения:']).eachCell(cell => {
    cell.font = { bold: true };
  });
  infoSheet.addRow(['• Материалы и работы сгруппированы по ролям']);
  infoSheet.addRow(['• Количество без отходов - расчётное количество без учёта запаса']);
  infoSheet.addRow(['• Количество с отходами - количество с учётом коэффициента отходов']);
  infoSheet.addRow(['• Работы выделены голубым цветом']);

  // Генерация файла
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const date = new Date();
  const fileName = `расчет_материалов_${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}.xlsx`;

  saveAs(blob, fileName);
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
  const treeData = buildTreeData(materials);

  const columns: ColumnsType<TreeNode> = [
    {
      title: 'Роль / Материал',
      key: 'name',
      fixed: 'start',
      width: '25%',
      render: (_, record) => {
        if (record.isGroup) {
          return <strong style={{ fontSize: '16px' }}>{record.title}</strong>;
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
        // Только у группы показываем количество материала
        if (record.isGroup) {
          // Берем первый материал из группы (у материала и работы одинаковая информация)
          const materialChild = record.children?.find(child => !child.record?.isLabor);
          if (!materialChild?.record) return '';

          const qty = materialChild.record.quantityRequired;
          return qty > 0 ? `${formatNumber(qty)} ${materialChild.record.unit}` : '-';
        }

        // У материала и работы - пусто
        return '';
      },
    },
    {
      title: 'Кол-во (с отходами)',
      key: 'quantityWithWaste',
      width: '12%',
      render: (_, record) => {
        // Только у группы показываем количество материала с отходами
        if (record.isGroup) {
          const materialChild = record.children?.find(child => !child.record?.isLabor);
          if (!materialChild?.record) return '';

          const qty = materialChild.record.quantityRequiredWidthWasteFactor;
          return qty > 0 ? `${formatNumber(qty)} ${materialChild.record.unit}` : '-';
        }

        // У материала и работы - пусто
        return '';
      },
    },
    {
      title: 'Цена за ед.',
      key: 'unitPrice',
      width: '12%',
      render: (_, record) => {
        // У группы - пусто
        if (record.isGroup) return '';
        // У материала и работы - показываем цену
        if (!record.record) return '';
        return formatCurrency(record.record.unitPrice);
      },
    },
    {
      title: 'Стоимость',
      key: 'cost',
      width: '12%',
      fixed: 'end',
      render: (_, record) => {
        // У группы - итог (материал + работа)
        if (record.isGroup) {
          return <strong>{record.totalCost && formatCurrency(record.totalCost)}</strong>;
        }
        // У материала и работы - своя стоимость
        if (!record.record) return '';
        return formatCurrency(record.record.totalCost);
      },
    },
    {
      title: 'Стоимость (с отходами)',
      key: 'costWithWaste',
      width: '12%',
      fixed: 'end',

      render: (_, record) => {
        // У группы - итог с отходами
        if (record.isGroup) {
          return (
            <strong>
              {record.totalCostWithWaste && formatCurrency(record.totalCostWithWaste)}
            </strong>
          );
        }
        // У материала и работы - своя стоимость с отходами
        if (!record.record) return '';
        return formatCurrency(record.record.totalCostWidthWasteFactor);
      },
    },
  ];

  const handleDownload = () => {
    downloadExcel({
      totalCost,
      totalCostWidthWasteFactor,
      materials,
      area,
      baseArea,
      dimensions,
      coefficients,
    });
  };

  const getRowClassName = (record: TreeNode) => {
    if (record.isGroup) {
      return 'group-row';
    }
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
        <Flex wrap gap={16} align="center" justify="space-between">
          <Flex wrap gap={16} align="center">
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              Стоимость: <span style={{ color: '#1890ff' }}>{formatCurrency(totalCost)}</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              С отходами:{' '}
              <span style={{ color: '#1890ff' }}>{formatCurrency(totalCostWidthWasteFactor)}</span>
            </div>
          </Flex>
        </Flex>

        <Flex wrap gap={8} align="center">
          <Tag color="blue">Площадь: {formatNumber(area)} м²</Tag>
          <Tag color="gold">1 этаж: {formatNumber(baseArea)} м²</Tag>
          <Tag color="green">
            Габариты: {dimensions.length}×{dimensions.width}×{dimensions.floors} эт.
          </Tag>
          <Tag color="orange">Коэф. этажности: {coefficients.floorMultiplier.toFixed(2)}</Tag>
          <Tag color="cyan">Форма: {coefficients.shapeRatio.toFixed(2)}</Tag>
          {coefficients.ceilingHeight && (
            <Tag color="purple">Высота потолка: {coefficients.ceilingHeight.join(', ')} м</Tag>
          )}
          {coefficients.roofPitch && (
            <Tag color="volcano">Уклон крыши: {coefficients.roofPitch}°</Tag>
          )}
          {coefficients.floorJoistSpacing && (
            <Tag color="geekblue">Шаг лаг: {coefficients.floorJoistSpacing} м</Tag>
          )}
        </Flex>

        <Table
          rowClassName={getRowClassName}
          columns={columns}
          dataSource={treeData}
          rowKey="key"
          pagination={false}
          defaultExpandAllRows={true}
          scroll={{ x: 'max-content' }}
          expandable={{
            indentSize: 20,
          }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={1}>
                <strong>Общий итог:</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} colSpan={3}></Table.Summary.Cell>
              <Table.Summary.Cell index={4}>
                <strong>{formatCurrency(totalCost)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5}>
                <strong>{formatCurrency(totalCostWidthWasteFactor)}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Space>
    </Card>
  );
};

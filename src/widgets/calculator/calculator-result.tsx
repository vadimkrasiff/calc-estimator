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

  // Данные материалов
  data.materials.forEach((material, index) => {
    // Чередование цветов строк
    const bgColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF5F5F5';

    const row = materialsSheet.addRow([
      CALCULATION_TYPE_LABELS[material.calculationType] || material.calculationType,
      material.materialName,
      formatNumber(material.quantityRequired),
      formatNumber(material.quantityRequiredWidthWasteFactor),
      material.unit,
      formatCurrency(material.unitPrice),
      formatCurrency(material.totalCost),
      formatCurrency(material.totalCostWidthWasteFactor),
    ]);

    row.height = 30;

    // Стилизация ячеек
    row.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.font = { name: 'Arial', size: 11 };

      // Выравнивание в зависимости от типа данных
      if ([3, 4, 6, 7, 8].includes(colNumber)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if (colNumber === 5) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = {
          horizontal: 'left',
          vertical: 'middle',
          wrapText: colNumber === 2, // Перенос только для колонки "Материал"
        };
      }
    });
  });

  // Пустая строка
  materialsSheet.addRow([]);

  // Итоговая строка
  const totalRow = materialsSheet.addRow([
    'ИТОГО:',
    '',
    '',
    '',
    '',
    '',
    formatCurrency(data.totalCost),
    formatCurrency(data.totalCostWidthWasteFactor),
  ]);

  totalRow.height = 35;
  totalRow.eachCell(cell => {
    cell.font = { bold: true, size: 12, name: 'Arial' };
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
  });

  // Выравнивание итоговой строки
  totalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };

  // Настройка ширины колонок
  materialsSheet.getColumn(1).width = 30; // Роль
  materialsSheet.getColumn(2).width = 40; // Материал
  materialsSheet.getColumn(3).width = 18; // Количество (без отходов)
  materialsSheet.getColumn(4).width = 18; // Количество (с отходами)
  materialsSheet.getColumn(5).width = 10; // Ед. изм.
  materialsSheet.getColumn(6).width = 15; // Цена за ед.
  materialsSheet.getColumn(7).width = 20; // Стоимость (без отходов)
  materialsSheet.getColumn(8).width = 20; // Стоимость (с отходами)

  // ========== ЛИСТ 3: Информация ==========
  const infoSheet = workbook.addWorksheet('Информация');

  // Заголовок
  infoSheet.mergeCells('A1:A2');
  const infoTitleCell = infoSheet.getCell('A1');
  infoTitleCell.value = 'Информация о расчёте';
  infoTitleCell.font = {
    bold: true,
    size: 14,
    name: 'Arial',
    color: { argb: 'FFFFFFFF' },
  };
  infoTitleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  infoTitleCell.alignment = {
    horizontal: 'center',
    vertical: 'middle',
  };

  // Дата расчёта
  infoSheet.addRow([`Дата расчёта: ${new Date().toLocaleString('ru-RU')}`]);
  infoSheet.addRow([]);

  // Условные обозначения
  const legendTitle = infoSheet.addRow(['Условные обозначения:']);
  legendTitle.getCell(1).font = { bold: true, size: 12, name: 'Arial' };

  infoSheet.addRow(['• Количество без отходов - расчётное количество материала без учёта запаса']);
  infoSheet.addRow([
    '• Количество с отходами - количество материала с учётом коэффициента отходов',
  ]);
  infoSheet.addRow(['• Стоимость без отходов - стоимость расчётного количества']);
  infoSheet.addRow(['• Стоимость с отходами - итоговая стоимость с учётом запаса']);

  // Настройка ширины колонки
  infoSheet.getColumn(1).width = 80;

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
      title: 'Количество (без отходов)',
      key: 'quantityRequired',
      render: (_, record) => `${formatNumber(record.quantityRequired)} ${record.unit}`,
    },
    {
      title: 'Количество (с отходами)',
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
      render: (value: number) => formatCurrency(value),
    },
    {
      fixed: 'end',
      title: 'Стоимость с учетом отходов',
      dataIndex: 'totalCostWidthWasteFactor',
      key: 'totalCostWidthWasteFactor',
      render: (value: number) => formatCurrency(value),
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

  return (
    <Card
      title="Результат расчёта"
      extra={
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
          Скачать Excel
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
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
            <Tag color="purple">Высота потолка: {coefficients.ceilingHeight} м</Tag>
          )}
          {coefficients.roofPitch && (
            <Tag color="volcano">Уклон крыши: {coefficients.roofPitch}°</Tag>
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
              <Table.Summary.Cell index={0} colSpan={2}>
                <strong style={{ position: 'sticky', left: 16 }}>Итого:</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} colSpan={3}></Table.Summary.Cell>
              <Table.Summary.Cell index={5}>
                <strong>{formatCurrency(totalCost)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6}>
                <strong>{formatCurrency(totalCostWidthWasteFactor)}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Space>
    </Card>
  );
};

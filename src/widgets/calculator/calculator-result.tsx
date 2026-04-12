import { Card, Table, Space, Tag, Flex, Button, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// 🔑 Интерфейс материала (без изменений)
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

// Интерфейс для древовидных данных (добавлен groupKey)
interface TreeNode {
  key: string;
  title: string;
  children?: TreeNode[];
  record?: MaterialCost;
  isGroup?: boolean;
  isCategory?: boolean; // ✅ Новый флаг для категории верхнего уровня
  roleKey?: string;
  groupKey?: string; // ✅ Ключ группы (foundation|loghouse|roof)
  totalCost?: number;
  totalCostWithWaste?: number;
  isSubService?: boolean;
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

// ✅ Сопоставление ролей с группами верхнего уровня
const ROLE_TO_GROUP: Record<string, 'foundation' | 'loghouse' | 'roof'> = {
  // 🏗️ Фундамент
  foundation_piles: 'foundation',
  foundation_strip: 'foundation',
  foundation_slab: 'foundation',
  foundation_columns: 'foundation',
  addit_foundation_piles: 'foundation',

  // 🪵 Сруб (стены, перекрытия, утепление полов/потолков)
  walls_logs: 'loghouse',
  walls_logs_kiln_drying: 'loghouse', // ✅ Камерная сушка
  walls_logs_cup_cutting: 'loghouse', // ✅ Нарезка чаш
  bottom_binding: 'loghouse',
  floors_beams: 'loghouse',
  floors_subfloor: 'loghouse',
  ceilings_beams: 'loghouse',
  upper_floor_beams: 'loghouse',
  ceiling_lags: 'loghouse',
  floor1_insulation: 'loghouse',
  floor2_insulation: 'loghouse',
  ceiling_insulation: 'loghouse',
  interventr_insulation: 'loghouse',

  // 🏠 Крыша (стропила, обрешётка, кровля, утепление крыши)
  roofs_trusses: 'roof',
  roofs_sheathing: 'roof',
  roof_battens: 'roof',
  roofing_material: 'roof',
  roof_insulation: 'roof',
  insulation: 'roof',
  vapor_barrier: 'roof',
};

// ✅ Названия групп (без изменений)
const GROUP_LABELS: Record<string, string> = {
  foundation: '🏗️ Фундамент',
  loghouse: '🪵 Сруб',
  roof: '🏠 Крыша',
};

// ✅ Цвета для групп (без изменений)
const GROUP_COLORS: Record<string, string> = {
  foundation: '#52c41a',
  loghouse: '#1890ff',
  roof: '#fa8c16',
};

// ✅ Сопоставление ролей с читаемыми названиями
const CALCULATION_TYPE_LABELS: Record<string, string> = {
  walls_logs: 'Брус для сруба',
  walls_logs_kiln_drying: 'Камерная сушка бруса', // ✅ Новая позиция
  walls_logs_cup_cutting: 'Нарезка чаш', // ✅ Новая позиция
  bottom_binding: 'Нижняя обвязка',
  floors_beams: 'Лаги для 1 этажа',
  floors_subfloor: 'Черновой пол',
  ceilings_beams: 'Балки перекрытия',
  roofs_trusses: 'Стропила',
  roofs_sheathing: 'Обрешётка',
  upper_floor_beams: 'Лаги для 2 этажа',
  ceiling_lags: 'Лаги для потолка',
  foundation_piles: 'Фундамент (свайный)',
  foundation_strip: 'Фундамент (ленточный)',
  foundation_slab: 'Фундамент (плитный)',
  foundation_columns: 'Фундамент (столбчатый)',
  roof_insulation: 'Утепление крыши',
  ceiling_insulation: 'Утепление потолка',
  floor1_insulation: 'Утепление перекрытия 1 этажа',
  floor2_insulation: 'Утепление перекрытия 2 этажа',
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

// ✅ Функция для построения дерева с группировкой: Категория → Роль → Материал
// ✅ Функция для построения дерева с группировкой: Категория → Роль → Материал/Услуга
const buildTreeData = (materials: MaterialCost[]): TreeNode[] => {
  // Группируем сначала по категориям, затем по ролям
  const grouped: Record<string, Record<string, TreeNode>> = {
    foundation: {},
    loghouse: {},
    roof: {},
  };

  // ✅ Служебные роли-услуги, которые нужно вкладывать в базовую роль
  const SUB_SERVICES: Record<string, string> = {
    walls_logs_kiln_drying: 'walls_logs',
    walls_logs_cup_cutting: 'walls_logs',
  };

  materials.forEach(item => {
    let roleKey = item.calculationType;
    if (item.isLabor && roleKey.endsWith('_labor')) {
      roleKey = roleKey.replace('_labor', '');
    }

    // ✅ Если это под-услуга — определяем базовую роль
    const baseRoleKey = SUB_SERVICES[roleKey] || roleKey;
    const isSubService = SUB_SERVICES[roleKey] !== undefined;

    const groupKey = ROLE_TO_GROUP[baseRoleKey] || 'loghouse';

    if (!grouped[groupKey][baseRoleKey]) {
      grouped[groupKey][baseRoleKey] = {
        key: `role-${groupKey}-${baseRoleKey}`,
        title: CALCULATION_TYPE_LABELS[baseRoleKey] || baseRoleKey,
        children: [],
        isGroup: true,
        roleKey: baseRoleKey,
        groupKey: groupKey,
        totalCost: 0,
        totalCostWithWaste: 0,
      };
    }

    // ✅ Формируем заголовок для под-услуг
    const itemTitle = isSubService
      ? `${roleKey === 'walls_logs_kiln_drying' ? '🔥 Камерная сушка' : '✂️ Нарезка чаш'}`
      : item.isLabor
        ? '💼 Стоимость работ'
        : item.materialName;

    grouped[groupKey][baseRoleKey].children!.push({
      key: `item-${item.calculationType}-${item.materialId}`,
      title: itemTitle,
      record: item,
      isSubService: isSubService, // ✅ Флаг для визуального выделения
    });

    grouped[groupKey][baseRoleKey].totalCost =
      (grouped[groupKey][baseRoleKey].totalCost || 0) + item.totalCost;
    grouped[groupKey][baseRoleKey].totalCostWithWaste =
      (grouped[groupKey][baseRoleKey].totalCostWithWaste || 0) + item.totalCostWidthWasteFactor;
  });

  const result: TreeNode[] = [];

  // Порядок групп: Крыша → Сруб → Фундамент
  (['roof', 'loghouse', 'foundation'] as const).forEach(groupKey => {
    const roles = Object.values(grouped[groupKey]);
    if (Object.keys(roles).length === 0) return;

    const categoryTotal = roles.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    const categoryTotalWithWaste = roles.reduce((sum, r) => sum + (r.totalCostWithWaste || 0), 0);

    const categoryNode: TreeNode = {
      key: `cat-${groupKey}`,
      title: GROUP_LABELS[groupKey],
      children: roles.sort((a, b) => a.title.localeCompare(b.title)),
      isCategory: true,
      groupKey: groupKey,
      totalCost: categoryTotal,
      totalCostWithWaste: categoryTotalWithWaste,
    };

    result.push(categoryNode);
  });

  return result;
};

// ✅ Надёжная функция авто-ширины для exceljs
const setAutoWidth = (ws: ExcelJS.Worksheet, col: number, min: number, max: number) => {
  let maxLen = 0;
  ws.getColumn(col).eachCell({ includeEmpty: false }, cell => {
    const val = String(cell.value || '');
    const lines = val.split('\n');
    const len = Math.max(...lines.map(l => l.trim().length), 0);
    if (len > maxLen) maxLen = len;
  });
  // 1.15 - коэффициент для кириллицы + Arial 11pt, +2 - отступы
  const width = Math.ceil(maxLen * 1.15) + 2;
  ws.getColumn(col).width = Math.min(Math.max(width, min), max);
};

// ✅ Основная функция экспорта
const downloadExcel = async (data: {
  totalCost: number;
  totalCostWidthWasteFactor: number;
  materials: MaterialCost[];
  area: number;
  baseArea: number;
  dimensions: { length: number; width: number; floors: number };
  coefficients: {
    floorMultiplier: number;
    shapeRatio: number;
    ceilingHeight?: number[];
    roofPitch?: number;
    floorJoistSpacing?: number;
  };
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Калькулятор материалов';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ==========================================
  // ЛИСТ 1: Параметры
  // ==========================================
  const paramsSheet = workbook.addWorksheet('Параметры');
  paramsSheet.mergeCells('A1:B1');
  const titleCell = paramsSheet.getCell('A1');
  titleCell.value = 'Параметры расчета';
  titleCell.font = { bold: true, size: 14, name: 'Arial', color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };

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

  if (data.coefficients.ceilingHeight)
    params.push(['Высота потолка:', `${data.coefficients.ceilingHeight} м`]);
  if (data.coefficients.roofPitch) params.push(['Уклон крыши:', `${data.coefficients.roofPitch}°`]);
  if (data.coefficients.floorJoistSpacing)
    params.push(['Шаг лаг:', `${data.coefficients.floorJoistSpacing} м`]);

  paramsSheet.addRows(params);
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
    row.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
  }

  paramsSheet.addRow([]);
  const addTotalRow = (sheet: ExcelJS.Worksheet, label: string, value: string) => {
    const r = sheet.addRow([label, value]);
    r.eachCell(cell => {
      cell.font = { bold: true, size: 12, name: 'Arial' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F0FA' } };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    r.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
  };
  addTotalRow(paramsSheet, 'Итоговая стоимость:', formatCurrency(data.totalCost));
  addTotalRow(
    paramsSheet,
    'Итоговая стоимость (с учетом отходов):',
    formatCurrency(data.totalCostWidthWasteFactor),
  );

  // ==========================================
  // ЛИСТ 2: Материалы
  // ==========================================
  const materialsSheet = workbook.addWorksheet('Материалы');
  const headerRow = materialsSheet.addRow([
    'Группа',
    'Роль',
    'Тип',
    'Материал/Услуга',
    'Количество\n(без отходов)',
    'Количество\n(с отходами)',
    'Ед. изм.',
    'Цена за ед.',
    'Стоимость',
    'Стоимость\n(с отходами)',
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

  const SUB_SERVICES: Record<string, string> = {
    walls_logs_kiln_drying: 'walls_logs',
    walls_logs_cup_cutting: 'walls_logs',
  };

  const grouped: Record<string, Record<string, MaterialCost[]>> = {
    foundation: {},
    loghouse: {},
    roof: {},
  };

  data.materials.forEach(item => {
    let roleKey = item.calculationType;
    if (item.isLabor && roleKey.endsWith('_labor')) roleKey = roleKey.replace('_labor', '');
    const baseRoleKey = SUB_SERVICES[roleKey] || roleKey;
    const groupKey = ROLE_TO_GROUP[baseRoleKey] || 'loghouse';
    if (!grouped[groupKey][baseRoleKey]) grouped[groupKey][baseRoleKey] = [];
    grouped[groupKey][baseRoleKey].push(item);
  });

  (['roof', 'loghouse', 'foundation'] as const).forEach(groupKey => {
    const roles = grouped[groupKey];
    if (Object.keys(roles).length === 0) return;

    const catRow = materialsSheet.addRow([
      GROUP_LABELS[groupKey],
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
    catRow.height = 30;
    catRow.eachCell(cell => {
      cell.font = { bold: true, size: 13, name: 'Arial', color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: GROUP_COLORS[groupKey].replace('#', 'FF') },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    });

    Object.entries(roles).forEach(([roleKey, items]) => {
      const roleRow = materialsSheet.addRow([
        '',
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

      items.forEach((item, idx) => {
        const isSubService = SUB_SERVICES[item.calculationType.replace('_labor', '')] !== undefined;
        const isLabor = item.isLabor;
        const bgColor = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF5F5F5';
        const materialName = isSubService ? `→ ${item.materialName}` : item.materialName;
        const typeLabel = isLabor ? 'Работа' : isSubService ? 'Услуга' : 'Материал';

        const row = materialsSheet.addRow([
          '',
          '',
          typeLabel,
          materialName,
          formatNumber(item.quantityRequired),
          formatNumber(item.quantityRequiredWidthWasteFactor),
          item.unit,
          formatCurrency(item.unitPrice),
          formatCurrency(item.totalCost),
          formatCurrency(item.totalCostWidthWasteFactor),
        ]);
        row.height = isSubService ? 25 : 30;

        row.eachCell((cell, colNum) => {
          const fillColor = isLabor ? 'FFE6F7FF' : isSubService ? 'FFFFF4E6' : bgColor;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
          cell.font = { name: 'Arial', size: isSubService ? 10 : 11, italic: isSubService };
          if ([5, 6, 8, 9, 10].includes(colNum))
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          else if (colNum === 7) cell.alignment = { horizontal: 'center', vertical: 'middle' };
          else cell.alignment = { horizontal: 'left', vertical: 'middle' };
        });
      });

      const rTotal = items.reduce((s, i) => s + i.totalCost, 0);
      const rTotalW = items.reduce((s, i) => s + i.totalCostWidthWasteFactor, 0);
      const totalRoleRow = materialsSheet.addRow([
        '',
        '',
        'ИТОГ ПО РОЛИ',
        '',
        '',
        '',
        '',
        '',
        formatCurrency(rTotal),
        formatCurrency(rTotalW),
      ]);
      totalRoleRow.eachCell(cell => {
        cell.font = { bold: true, size: 11, name: 'Arial' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDAE3F3' } };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        if (cell.col === '9' || cell.col === '10')
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
      });
      materialsSheet.addRow([]);
    });

    const cTotal = Object.values(roles)
      .flat()
      .reduce((s, i) => s + i.totalCost, 0);
    const cTotalW = Object.values(roles)
      .flat()
      .reduce((s, i) => s + i.totalCostWidthWasteFactor, 0);
    const catTotalRow = materialsSheet.addRow([
      '',
      '',
      '',
      `ИТОГО ${GROUP_LABELS[groupKey].split(' ')[1]?.toUpperCase() || ''}`,
      '',
      '',
      '',
      '',
      formatCurrency(cTotal),
      formatCurrency(cTotalW),
    ]);
    catTotalRow.eachCell(cell => {
      cell.font = { bold: true, size: 12, name: 'Arial' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: GROUP_COLORS[groupKey].replace('#', 'FF') + '20' },
      };
      cell.border = {
        top: { style: 'medium' },
        left: { style: 'thin' },
        bottom: { style: 'medium' },
        right: { style: 'thin' },
      };
      if (cell.col === '9' || cell.col === '10')
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
    });
    materialsSheet.addRow([]);
  });

  const finalRow = materialsSheet.addRow([
    '',
    '',
    '',
    '🔷 ОБЩИЙ ИТОГ:',
    '',
    '',
    '',
    '',
    formatCurrency(data.totalCost),
    formatCurrency(data.totalCostWidthWasteFactor),
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
    if (cell.col === '9' || cell.col === '10')
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
  });

  // ==========================================
  // ЛИСТ 3: Информация
  // ==========================================
  const infoSheet = workbook.addWorksheet('Информация');
  infoSheet.addRow(['Информация о расчёте']).eachCell(cell => {
    cell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.alignment = { horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  infoSheet.addRow([`Дата расчёта: ${new Date().toLocaleString('ru-RU')}`]);
  infoSheet.addRow([]);
  infoSheet.addRow(['📁 Группировка:']).eachCell(cell => (cell.font = { bold: true, size: 12 }));
  infoSheet.addRow(['   1. 🏠 Крыша — стропила, обрешётка, кровля, утепление']);
  infoSheet.addRow(['   2. 🪵 Сруб — брус, лаги, перекрытия, утепление полов/потолков']);
  infoSheet.addRow(['   3. 🏗️ Фундамент — сваи, лента, плита, столбы']);
  infoSheet.addRow([]);
  infoSheet
    .addRow(['🔑 Условные обозначения:'])
    .eachCell(cell => (cell.font = { bold: true, size: 12 }));
  infoSheet.addRow(['   📦 Материал — основной строительный материал']);
  infoSheet.addRow(['   💼 Работа — стоимость монтажа/установки']);
  infoSheet.addRow(['   🔥 Услуга (внутри «Брус для сруба»): Камерная сушка']);
  infoSheet.addRow(['   ✂️ Услуга (внутри «Брус для сруба»): Нарезка чаш']);
  infoSheet.addRow(['   → Услуги и работы отображаются как вложенные элементы']);
  infoSheet.addRow([]);
  infoSheet.addRow(['📐 Пояснения:']).eachCell(cell => (cell.font = { bold: true, size: 12 }));
  infoSheet.addRow(['   • Количество с отходами = расчётное × коэффициент запаса']);
  infoSheet.addRow(['   • Камерная сушка считается за м³ объёма бруса']);
  infoSheet.addRow(['   • Нарезка чаш считается поштучно: 4 угла × кол-во рядов']);
  infoSheet.addRow(['   • Утепление потолка/лаг потолка — только для холодной кровли']);
  infoSheet.addRow([]);
  infoSheet.addRow(['⚠️ Примечание:']).eachCell(cell => (cell.font = { bold: true, size: 12 }));
  infoSheet.addRow(['   Расчёт приблизительный. Для точной сметы обратитесь к специалисту.']);

  // ==========================================
  // 📏 АВТО-ШИРИНА (ИСПРАВЛЕННАЯ)
  // ==========================================
  // Лист 1
  setAutoWidth(paramsSheet, 1, 25, 45);
  setAutoWidth(paramsSheet, 2, 15, 35);

  // Лист 2
  for (let i = 1; i <= 10; i++) {
    const min = i === 4 ? 30 : 12;
    const max = i === 4 ? 55 : 25;
    setAutoWidth(materialsSheet, i, min, max);
  }

  // Лист 3
  setAutoWidth(infoSheet, 1, 50, 95);

  // ==========================================
  // 💾 ЭКСПОРТ
  // ==========================================
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const date = new Date();
  const fileName = `расчет_материалов_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.xlsx`;
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
      title: 'Группа / Роль / Материал',
      key: 'name',
      fixed: 'start',
      width: '30%',
      render: (_, record) => {
        // 🏗️ Категория
        if (record.isCategory) {
          return (
            <Flex align="center" gap={8}>
              <Tag color={GROUP_COLORS[record.groupKey!]} style={{ fontSize: '12px' }}>
                {record.title.split(' ')[0]}
              </Tag>
              <Typography.Text strong style={{ fontSize: '16px' }}>
                {record.title.split(' ').slice(1).join(' ')}
              </Typography.Text>
            </Flex>
          );
        }
        // 🔧 Роль внутри категории
        if (record.isGroup) {
          return (
            <div style={{ paddingLeft: 16 }}>
              <Tag color="default" style={{ marginRight: 8, fontSize: '11px' }}>
                Роль
              </Tag>
              <Typography.Text strong>{record.title}</Typography.Text>
            </div>
          );
        }
        // 📦 Материал / 💼 Работа / 🔥✂️ Услуга
        const calculationType = record.record?.calculationType || '';
        const isLabor = record.record?.isLabor;
        const isSubService = record.isSubService;

        // Определяем тип и цвет тега
        let tagColor = 'blue';
        let tagLabel = '📦 Материал';

        if (isLabor) {
          tagColor = 'green';
          tagLabel = '💼 Работа';
        } else if (isSubService) {
          tagColor = 'orange';
          tagLabel = calculationType.includes('kiln_drying') ? '🔥 Услуга' : '✂️ Услуга';
        }

        return (
          <div style={{ paddingLeft: isSubService ? 64 : 40 }}>
            <Tag color={tagColor} style={{ marginRight: 8, fontSize: '11px' }}>
              {tagLabel}
            </Tag>
            <Typography.Text type={isSubService ? 'secondary' : undefined}>
              {record.title}
            </Typography.Text>
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
      title: 'Кол-во (с отходами)',
      key: 'quantityWithWaste',
      width: '12%',
      render: (_, record) => {
        if (record.isGroup) {
          const materialChild = record.children?.find(child => !child.record?.isLabor);
          if (!materialChild?.record) return '-';
          const qty = materialChild.record.quantityRequiredWidthWasteFactor;
          return qty > 0 ? `${formatNumber(qty)} ${materialChild.record.unit}` : '-';
        }
        return record.isCategory ? '' : '-';
      },
    },
    {
      title: 'Цена за ед.',
      key: 'unitPrice',
      width: '12%',
      render: (_, record) => {
        if (record.isCategory || record.isGroup) return '-';
        if (!record.record) return '-';
        return formatCurrency(record.record.unitPrice);
      },
    },
    {
      title: 'Стоимость',
      key: 'cost',
      width: '12%',
      fixed: 'end',
      render: (_, record) => {
        if (record.isCategory || record.isGroup) {
          return (
            <Typography.Text strong>
              {record.totalCost ? formatCurrency(record.totalCost) : '-'}
            </Typography.Text>
          );
        }
        if (!record.record) return '-';
        return formatCurrency(record.record.totalCost);
      },
    },
    {
      title: 'Стоимость (с отходами)',
      key: 'costWithWaste',
      width: '12%',
      fixed: 'end',
      render: (_, record) => {
        if (record.isCategory || record.isGroup) {
          return (
            <Typography.Text strong>
              {record.totalCostWithWaste ? formatCurrency(record.totalCostWithWaste) : '-'}
            </Typography.Text>
          );
        }
        if (!record.record) return '-';
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
    if (record.isCategory) return 'category-row';
    if (record.isGroup) return 'role-row';
    return '';
  };

  // Считаем суммы по категориям для отображения
  const categoryTotals = treeData.reduce(
    (acc, cat) => {
      if (cat.isCategory && cat.groupKey) {
        acc[cat.groupKey] = {
          cost: cat.totalCost || 0,
          costWithWaste: cat.totalCostWithWaste || 0,
        };
      }
      return acc;
    },
    {} as Record<string, { cost: number; costWithWaste: number }>,
  );

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
        {/* Итоговые суммы */}
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
          {/* Суммы по категориям */}
          <Flex wrap gap={8}>
            {(['foundation', 'loghouse', 'roof'] as const).map(groupKey => {
              const totals = categoryTotals[groupKey];
              if (!totals) return null;
              return (
                <Tag key={groupKey} color={GROUP_COLORS[groupKey]} style={{ cursor: 'default' }}>
                  {GROUP_LABELS[groupKey].split(' ')[1]}: {formatCurrency(totals.costWithWaste)}
                </Tag>
              );
            })}
          </Flex>
        </Flex>

        {/* Теги параметров */}
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

        {/* Таблица */}
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
                <Typography.Text strong>🔷 ОБЩИЙ ИТОГ:</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} colSpan={3}></Table.Summary.Cell>
              <Table.Summary.Cell index={4}>
                <Typography.Text strong>{formatCurrency(totalCost)}</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5}>
                <Typography.Text strong>
                  {formatCurrency(totalCostWidthWasteFactor)}
                </Typography.Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Space>
    </Card>
  );
};

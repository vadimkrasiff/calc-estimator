import type { MaterialCost } from '@/pages/calculator-page/calculator-page';
import {
  Card,
  Descriptions,
  // Collapse, Tag,
  Space,
  // Typography, Button
} from 'antd';
// import { useState } from 'react';

// const { Title, Text } = Typography;
// const { Panel } = Collapse;

// Форматирование обычных чисел
const formatNumber = (num: number): string => {
  return num.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Форматирование малых чисел (для сечения и толщины)
// const formatSmallNumber = (num: number): string => {
//   if (Math.abs(num) < 0.01) {
//     return num.toLocaleString('ru-RU', {
//       minimumFractionDigits: 4,
//       maximumFractionDigits: 4,
//     });
//   }
//   return num.toLocaleString('ru-RU', {
//     minimumFractionDigits: 3,
//     maximumFractionDigits: 3,
//   });
// };

const formatCurrency = (num: number): string => {
  return `${formatNumber(num)} руб.`;
};

interface CalculationFormulaProps {
  totalCost: number;
  materials: MaterialCost[];
  area: number;
  totalCostWidthWasteFactor: number;
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
    roofHeight?: number;
    floorJoistSpacing?: number;
  };
}

// const CALCULATION_TYPE_LABELS: Record<string, string> = {
//   walls_logs: 'Брус/бревно для сруба',
//   floors_beams: 'Лаги для 1 этажа',
//   floors_subfloor: 'Черновой пол',
//   ceilings_beams: 'Балки перекрытия',
//   roofs_trusses: 'Стропила',
//   roofs_sheathing: 'Обрешётка',
//   bottom_binding: 'Нижняя обвязка',
//   upper_floor_beams: 'Лаги для 2 этажа',
//   insulation: 'Теплоизоляция',
// };

// // Легенда формул
// const FORMULA_LEGENDS: Record<string, string> = {
//   walls_logs: `
//     L_стен = P_дома × N_этажей<br/>
//     N_брусьев_в_ряду = ⌈L_стен / 6⌉<br/>
//     N_рядов = ⌈H_стен / H_бруса_после_профилировки⌉<br/>
//     N_брусьев_всего = N_брусьев_в_ряду × N_рядов<br/>
//     V_бруса = N_брусьев_всего × V_1_бруса<br/>
//     V = V_бруса × K_отходов<br/>
//     где:<br/>
//     • P_дома — периметр дома (м)<br/>
//     • N_этажей — количество этажей<br/>
//     • H_стен — общая высота стен (м)<br/>
//     • H_бруса_после_профилировки — высота бруса после профилировки (м)<br/>
//     • V_1_бруса — объём одного бруса из таблицы (м³)<br/>
//     • K_отходов — коэффициент отходов (1.05)
//   `,
//   floors_beams: `
//     N_лаг = ⌊(L_стены - 0.6) / 0.6⌋ + 1<br/>
//     N_брусьев_на_лагу = ⌈L_лаги / 6⌉<br/>
//     N_брусьев_всего = N_лаг × N_брусьев_на_лагу<br/>
//     V_бруса = N_брусьев_всего × V_1_бруса<br/>
//     V = V_бруса × K_отходов<br/>
//     где:<br/>
//     • L_стены — длина стены (м)<br/>
//     • L_лаги — длина лаги (м)<br/>
//     • V_1_бруса — объём одного бруса из таблицы (м³)<br/>
//     • K_отходов — коэффициент отходов (1.05)
//   `,
//   ceilings_beams: `
//     N_балок = ⌊(L_стены / 0.6)⌋ + 1<br/>
//     V = N_балок × (L_пролёта + 0.4) × S_сечения × K_отходов<br/>
//     где:<br/>
//     • L_стены — длина стены (м)<br/>
//     • L_пролёта — короткая сторона (м)<br/>
//     • S_сечения — сечение балки (м²)<br/>
//     • K_отходов — коэффициент отходов (1.05)
//   `,
//   floors_subfloor: `
//     V = N_досок × L_доски × S_сечения × K_отходов<br/>
//     где:<br/>
//     • N_досок = ⌊L_помещения / W_доски⌋ + 1<br/>
//     • L_доски = L_помещения + 0.04<br/>
//     • S_сечения = W_доски × H_доски<br/>
//     • K_отходов — коэффициент отходов (1.10)
//   `,
//   roofs_trusses: `
//     L_стропила = √(H_конька² + (W_дома/2)²) + L_выступа<br/>
//     L_выступа = 0.527 × √(1 + k_уклона²)<br/>
//     N_стропил = ⌊(L_дома + 1.4) / 0.6⌋ + 1<br/>
//     N_брусьев_всего = ⌈(N_стропил × L_стропила) / 6⌉<br/>
//     V_бруса = N_брусьев_всего × V_1_бруса<br/>
//     V = V_бруса × K_отходов<br/>
//     где:<br/>
//     • H_конька = (W_дома / 2) × k_уклона<br/>
//     • k_уклона — уклон крыши<br/>
//     • V_1_бруса — объём одного бруса из таблицы (м³)<br/>
//     • K_отходов — коэффициент отходов (1.05)
//   `,
//   roofs_sheathing: `
//     L_выступа = 0.527 × √(1 + k_уклона²)<br/>
//     N_рядов_внутренних = ⌊L_до_сруба / 0.3⌋ + 1<br/>
//     N_рядов_всех = ⌊L_всего / 0.3⌋ + 1<br/>
//     N_досок_внутренних = ⌈(L_дома × N_рядов_внутренних) / 6⌉ × 2<br/>
//     N_досок_всех = ⌈(L_дома_с_выступом × N_рядов_всех) / 6⌉ × 2<br/>
//     N_досок_всего = N_досок_внутренних + N_досок_всех<br/>
//     V_доски = N_досок_всего × V_1_доски<br/>
//     V = V_доски × K_отходов<br/>
//     где:<br/>
//     • L_до_сруба = (W_дома / 2) × √(1 + k_уклона²)<br/>
//     • L_всего = L_до_сруба + L_выступа<br/>
//     • L_дома_с_выступом = L_дома + 1.4<br/>
//     • V_1_доски — объём одной доски из таблицы (м³)<br/>
//     • K_отходов — коэффициент отходов (1.05)
//   `,
//   bottom_binding: `
//     N_брусьев = ⌈P_дома / 6⌉<br/>
//     V_бруса = N_брусьев × V_1_бруса<br/>
//     V = V_бруса × K_отходов<br/>
//     где:<br/>
//     • P_дома — периметр дома (м)<br/>
//     • V_1_бруса — объём одного бруса из таблицы (м³)<br/>
//     • K_отходов — коэффициент отходов (1.05)
//   `,
//   upper_floor_beams: `
//     N_лаг = ⌊(L_стены - 0.6) / 0.6⌋ + 1<br/>
//     N_брусьев_на_лагу = ⌈L_лаги / 6⌉<br/>
//     N_брусьев_всего = N_лаг × N_брусьев_на_лагу<br/>
//     V_бруса = N_брусьев_всего × V_1_бруса<br/>
//     V = V_бруса × K_отходов<br/>
//     где:<br/>
//     • L_стены — длина стены (м)<br/>
//     • L_лаги — длина лаги (м)<br/>
//     • V_1_бруса — объём одного бруса из таблицы (м³)<br/>
//     • K_отходов — коэффициент отходов (1.05)
//   `,
//   insulation: `
//     S_полов = S_дома × N_этажей<br/>
//     H_конька = (W_дома / 2) × k_уклона<br/>
//     L_до_сруба = √(H_конька² + (W_дома/2)²)<br/>
//     S_крыши = W_дома × L_до_сруба × 2<br/>
//     S_всего = S_полов + S_крыши<br/>
//     S = S_всего × K_отходов<br/>
//     где:<br/>
//     • S_дома — площадь дома (м²)<br/>
//     • N_этажей — количество этажей<br/>
//     • k_уклона — уклон крыши<br/>
//     • K_отходов — коэффициент отходов (1.05)
//   `,
// };

export const CalculationFormula = ({
  totalCost,
  area,
  baseArea,
  dimensions,
  coefficients,
  totalCostWidthWasteFactor,
}: CalculationFormulaProps) => {
  // const [expanded, setExpanded] = useState(false);

  const perimeter = (dimensions.length + dimensions.width) * 2;
  const totalWallHeight = (coefficients.ceilingHeight?.[0] || 2.8) * dimensions.floors;
  const wallArea = perimeter * totalWallHeight;
  const roofPitch = coefficients.roofPitch || 0.5;
  const pitchFactor = Math.sqrt(1 + roofPitch * roofPitch);
  const roofArea = baseArea * pitchFactor;

  // Определяем короткую и длинную стороны
  // const shortSide = Math.min(dimensions.length, dimensions.width);
  // const longSide = Math.max(dimensions.length, dimensions.width);

  // const formulaSteps = materials.map((mat, idx) => {
  //   let formulaDescription = '';
  //   let tags: React.ReactNode[] = [];
  //   let legend = '';

  //   switch (mat.calculationType) {
  //     case 'walls_logs': {
  //       const rawWidth = (mat.width || 150) / 1000;
  //       const rawHeight = (mat.height || 150) / 1000;
  //       const wasteFactor = mat.wasteFactor || 1.05;

  //       const logVolume = (() => {
  //         const table: Record<string, number> = {
  //           '100x100': 0.06,
  //           '100x150': 0.09,
  //           '150x150': 0.135,
  //           '100x180': 0.108,
  //           '150x180': 0.162,
  //           '180x180': 0.194,
  //           '100x200': 0.12,
  //           '150x200': 0.18,
  //           '180x200': 0.216,
  //           '200x200': 0.24,
  //           '250x200': 0.3,
  //           '250x250': 0.375,
  //           '250x300': 0.45,
  //           '300x300': 0.54,
  //         };
  //         const key = `${Math.round(rawHeight * 1000)}x${Math.round(rawWidth * 1000)}`;
  //         return table[key] || 0.135;
  //       })();

  //       formulaDescription = `${mat.quantityPieces || 0} шт × ${formatSmallNumber(logVolume)} м³ × ${formatNumber(wasteFactor)} = ${formatNumber(mat.quantityRequired)} м³ × ${formatCurrency(mat.price)}`;
  //       legend = FORMULA_LEGENDS.walls_logs;
  //       tags = [
  //         <Tag key="type" color="blue">
  //           {CALCULATION_TYPE_LABELS[mat.calculationType]}
  //         </Tag>,
  //         <Tag key="logs">Брусьев: {mat.quantityPieces || 0} шт</Tag>,
  //         <Tag key="volume">Объём 1 бруса: {formatSmallNumber(logVolume)} м³</Tag>,
  //         <Tag key="waste">Отходы: ×{formatNumber(wasteFactor)}</Tag>,
  //       ];
  //       break;
  //     }

  //     case 'floors_beams':
  //     case 'upper_floor_beams': {
  //       const logLength = 6.0;
  //       const spacing = 0.6;
  //       const wallLength = longSide;
  //       const count = Math.floor((wallLength - spacing) / spacing) + 1;
  //       const logsPerBeam = Math.ceil(shortSide / logLength);
  //       const totalLogs = count * logsPerBeam;
  //       const wasteFactor = mat.wasteFactor || 1.05;

  //       const logVolume = (() => {
  //         const table: Record<string, number> = {
  //           '100x100': 0.06,
  //           '100x150': 0.09,
  //           '150x150': 0.135,
  //           '100x180': 0.108,
  //           '150x180': 0.162,
  //           '180x180': 0.194,
  //           '100x200': 0.12,
  //           '150x200': 0.18,
  //           '180x200': 0.216,
  //           '200x200': 0.24,
  //           '250x200': 0.3,
  //           '250x250': 0.375,
  //           '250x300': 0.45,
  //           '300x300': 0.54,
  //         };
  //         const key = `${mat.height || 150}x${mat.width || 150}`;
  //         return table[key] || 0.135;
  //       })();

  //       const volume = totalLogs * logVolume;
  //       formulaDescription = `${mat.quantityPieces || 0} шт × ${formatSmallNumber(logVolume)} м³ × ${formatNumber(wasteFactor)} = ${formatNumber(volume * wasteFactor)} м³ × ${formatCurrency(mat.price)}`;
  //       legend =
  //         FORMULA_LEGENDS[mat.calculationType as keyof typeof FORMULA_LEGENDS] ||
  //         FORMULA_LEGENDS.floors_beams;
  //       tags = [
  //         <Tag key="type" color="green">
  //           {CALCULATION_TYPE_LABELS[mat.calculationType]}
  //         </Tag>,
  //         <Tag key="logs">Брусьев: {mat.quantityPieces || 0} шт</Tag>,
  //         <Tag key="volume">Объём 1 бруса: {formatSmallNumber(logVolume)} м³</Tag>,
  //         <Tag key="waste">Отходы: ×{formatNumber(wasteFactor)}</Tag>,
  //       ];
  //       break;
  //     }

  //     case 'floors_subfloor': {
  //       const boardLength = shortSide;
  //       const roomLength = longSide;
  //       const boardWidth = (mat.width || 150) / 1000;
  //       const boardThickness = (mat.height || 40) / 1000;
  //       const boardCount = Math.floor(roomLength / boardWidth) + 1;
  //       const boardLengthWithOverhang = boardLength + 0.04;
  //       const crossSection = boardWidth * boardThickness;
  //       const wasteFactor = mat.wasteFactor || 1.1;

  //       formulaDescription = `${boardCount} шт × ${formatNumber(boardLengthWithOverhang)} м × ${formatSmallNumber(crossSection)} м² × ${formatNumber(wasteFactor)} = ${formatNumber(mat.quantityRequired)} м³ × ${formatCurrency(mat.price)}`;
  //       legend = FORMULA_LEGENDS.floors_subfloor;
  //       tags = [
  //         <Tag key="type" color="gold">
  //           {CALCULATION_TYPE_LABELS[mat.calculationType]}
  //         </Tag>,
  //         <Tag key="boards">Досок: {boardCount} шт</Tag>,
  //         <Tag key="length">Длина: ${formatNumber(boardLengthWithOverhang)} м</Tag>,
  //         <Tag key="section">Сечение: ${formatSmallNumber(crossSection)} м²</Tag>,
  //         <Tag key="waste">Отходы: ×{formatNumber(wasteFactor)}</Tag>,
  //       ];
  //       break;
  //     }

  //     case 'ceilings_beams': {
  //       const span = shortSide;
  //       const wallLength = longSide;
  //       const spacing = 0.6;
  //       const count = Math.floor(wallLength / spacing) + 1;
  //       const lengthPerBeam = span + 0.4;
  //       const crossSection = ((mat.width || 100) / 1000) * ((mat.height || 200) / 1000);
  //       const wasteFactor = mat.wasteFactor || 1.05;

  //       formulaDescription = `${count} шт × ${formatNumber(lengthPerBeam)} м × ${formatSmallNumber(crossSection)} м² × ${formatNumber(wasteFactor)} = ${formatNumber(mat.quantityRequired)} м³ × ${formatCurrency(mat.price)}`;
  //       legend = FORMULA_LEGENDS.ceilings_beams;
  //       tags = [
  //         <Tag key="type" color="orange">
  //           {CALCULATION_TYPE_LABELS[mat.calculationType]}
  //         </Tag>,
  //         <Tag key="beams">Балок: {count} шт</Tag>,
  //         <Tag key="span">Пролёт: ${formatNumber(span)} м</Tag>,
  //         <Tag key="section">Сечение: ${formatSmallNumber(crossSection)} м²</Tag>,
  //         <Tag key="waste">Отходы: ×{formatNumber(wasteFactor)}</Tag>,
  //       ];
  //       break;
  //     }

  //     case 'roofs_trusses': {
  //       const thinSide = Math.min(mat.width || 100, mat.height || 200) / 1000;

  //       const wasteFactor = mat.wasteFactor || 1.0;

  //       const logVolume = (() => {
  //         const table: Record<string, number> = {
  //           '100x100': 0.06,
  //           '100x150': 0.09,
  //           '150x150': 0.135,
  //           '100x180': 0.108,
  //           '150x180': 0.162,
  //           '180x180': 0.194,
  //           '100x200': 0.12,
  //           '150x200': 0.18,
  //           '180x200': 0.216,
  //           '200x200': 0.24,
  //           '250x200': 0.3,
  //           '250x250': 0.375,
  //           '250x300': 0.45,
  //           '300x300': 0.54,
  //         };
  //         const key = `${Math.round(thinSide * 1000)}x${Math.max(mat.width || 100, mat.height || 200)}`;
  //         return table[key] || 0.135;
  //       })();

  //       formulaDescription = `${mat.quantityPieces || 0} шт × ${formatSmallNumber(logVolume)} м³ × ${formatNumber(wasteFactor)} = ${formatNumber(mat.quantityRequired)} м³ × ${formatCurrency(mat.price)}`;
  //       legend = FORMULA_LEGENDS.roofs_trusses;
  //       tags = [
  //         <Tag key="type" color="purple">
  //           {CALCULATION_TYPE_LABELS[mat.calculationType]}
  //         </Tag>,
  //         <Tag key="logs">Брусьев: {mat.quantityPieces || 0} шт</Tag>,
  //         <Tag key="volume">Объём 1 бруса: ${formatSmallNumber(logVolume)} м³</Tag>,
  //         <Tag key="waste">Отходы: ×{formatNumber(wasteFactor)}</Tag>,
  //       ];
  //       break;
  //     }

  //     case 'roofs_sheathing': {
  //       const wasteFactor = mat.wasteFactor || 1.05;

  //       const thinSide = Math.min(mat.width || 100, mat.height || 25) / 1000;
  //       const logVolume = (() => {
  //         const table: Record<string, number> = {
  //           '100x100': 0.06,
  //           '100x150': 0.09,
  //           '150x150': 0.135,
  //           '100x180': 0.108,
  //           '150x180': 0.162,
  //           '180x180': 0.194,
  //           '100x200': 0.12,
  //           '150x200': 0.18,
  //           '180x200': 0.216,
  //           '25x100': 0.015,
  //           '200x200': 0.24,
  //           '250x200': 0.3,
  //           '250x250': 0.375,
  //           '250x300': 0.45,
  //           '300x300': 0.54,
  //         };
  //         const key = `${Math.round(thinSide * 1000)}x${Math.max(mat.width || 100, mat.height || 25)}`;
  //         return table[key] || 0.06;
  //       })();

  //       formulaDescription = `${mat.quantityPieces || 0} шт × ${formatSmallNumber(logVolume)} м³ × ${formatNumber(wasteFactor)} = ${formatNumber(mat.quantityRequired)} м³ × ${formatCurrency(mat.price)}`;
  //       legend = FORMULA_LEGENDS.roofs_sheathing;
  //       tags = [
  //         <Tag key="type" color="cyan">
  //           {CALCULATION_TYPE_LABELS[mat.calculationType]}
  //         </Tag>,
  //         <Tag key="boards">Досок: {mat.quantityPieces || 0} шт</Tag>,
  //         <Tag key="volume">Объём 1 доски: ${formatSmallNumber(logVolume)} м³</Tag>,
  //         <Tag key="waste">Отходы: ×{formatNumber(wasteFactor)}</Tag>,
  //       ];
  //       break;
  //     }

  //     case 'bottom_binding': {
  //       const rawWidth = (mat.width || 150) / 1000;
  //       const rawHeight = (mat.height || 150) / 1000;
  //       const wasteFactor = mat.wasteFactor || 1.05;

  //       const logVolume = (() => {
  //         const table: Record<string, number> = {
  //           '100x100': 0.06,
  //           '100x150': 0.09,
  //           '150x150': 0.135,
  //           '100x180': 0.108,
  //           '150x180': 0.162,
  //           '180x180': 0.194,
  //           '100x200': 0.12,
  //           '150x200': 0.18,
  //           '180x200': 0.216,
  //           '200x200': 0.24,
  //           '250x200': 0.3,
  //           '250x250': 0.375,
  //           '250x300': 0.45,
  //           '300x300': 0.54,
  //         };
  //         const key = `${Math.round(rawHeight * 1000)}x${Math.round(rawWidth * 1000)}`;
  //         return table[key] || 0.135;
  //       })();

  //       formulaDescription = `${mat.quantityPieces || 0} шт × ${formatSmallNumber(logVolume)} м³ × ${formatNumber(wasteFactor)} = ${formatNumber(mat.quantityRequired)} м³ × ${formatCurrency(mat.price)}`;
  //       legend = FORMULA_LEGENDS.bottom_binding;
  //       tags = [
  //         <Tag key="type" color="lime">
  //           {CALCULATION_TYPE_LABELS[mat.calculationType]}
  //         </Tag>,
  //         <Tag key="logs">Брусьев: ${mat.quantityPieces || 0} шт</Tag>,
  //         <Tag key="volume">Объём 1 бруса: ${formatSmallNumber(logVolume)} м³</Tag>,
  //         <Tag key="waste">Отходы: ×{formatNumber(wasteFactor)}</Tag>,
  //       ];
  //       break;
  //     }

  //     case 'insulation': {
  //       const floorArea = baseArea * dimensions.floors;
  //       const gableHeight = (shortSide / 2) * roofPitch;
  //       const rafterBaseLength = Math.sqrt(Math.pow(gableHeight, 2) + Math.pow(shortSide / 2, 2));
  //       const roofArea = shortSide * rafterBaseLength * 2;
  //       const totalArea = floorArea + roofArea;
  //       const wasteFactor = mat.wasteFactor || 1.05;

  //       formulaDescription = `${formatNumber(totalArea)} м² × ${formatNumber(wasteFactor)} = ${formatNumber(mat.quantityRequired)} м² × ${formatCurrency(mat.price)}`;
  //       legend = FORMULA_LEGENDS.insulation;
  //       tags = [
  //         <Tag key="type" color="magenta">
  //           {CALCULATION_TYPE_LABELS[mat.calculationType]}
  //         </Tag>,
  //         <Tag key="area">Площадь: ${formatNumber(totalArea)} м²</Tag>,
  //         <Tag key="waste">Отходы: ×{formatNumber(wasteFactor)}</Tag>,
  //       ];
  //       break;
  //     }

  //     default:
  //       formulaDescription = `Расчёт не поддерживается`;
  //       legend = 'Формула недоступна';
  //       tags = [
  //         <Tag key="type" color="red">
  //           Неизвестный тип
  //         </Tag>,
  //       ];
  //   }

  //   return {
  //     key: `step-${idx}`,
  //     title: mat.materialName,
  //     description: formulaDescription,
  //     legend,
  //     tags,
  //     totalCost: mat.totalCost,
  //   };
  // });

  return (
    <Card title="Формула расчёта">
      <Space orientation="vertical" style={{ width: '100%' }}>
        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="Общая площадь">{formatNumber(area)} м²</Descriptions.Item>
          <Descriptions.Item label="Базовая площадь">{formatNumber(baseArea)} м²</Descriptions.Item>
          <Descriptions.Item label="Габариты">
            {dimensions.length}×{dimensions.width}×{dimensions.floors} эт.
          </Descriptions.Item>
          <Descriptions.Item label="Периметр">{formatNumber(perimeter)} м</Descriptions.Item>
          <Descriptions.Item label="Площадь стен">{formatNumber(wallArea)} м²</Descriptions.Item>
          <Descriptions.Item label="Площадь крыши">{formatNumber(roofArea)} м²</Descriptions.Item>
          <Descriptions.Item label="Высота потолка 1 этажа">
            {coefficients.ceilingHeight?.[0]
              ? `${formatNumber(coefficients.ceilingHeight[0])} м`
              : '-'}
          </Descriptions.Item>
          {coefficients.ceilingHeight?.[1] && (
            <Descriptions.Item label="Высота потолка 2 этажа">
              {`${formatNumber(coefficients.ceilingHeight[1])} м`}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Высота крыши">
            {coefficients.roofHeight ? `${formatNumber(coefficients.roofHeight)} м` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Шаг лаг">
            {coefficients.floorJoistSpacing
              ? `${formatNumber(coefficients.floorJoistSpacing)} м`
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Итого">{formatCurrency(totalCost)}</Descriptions.Item>
          <Descriptions.Item label="Итого (с учетом коэфф. отходов)">
            {formatCurrency(totalCostWidthWasteFactor)}
          </Descriptions.Item>
        </Descriptions>

        {/* <Collapse
          activeKey={expanded ? 'formula' : ''}
          onChange={key => setExpanded(key.includes('formula'))}
        >
          <Panel header="Детализация расчёта" key="formula">
            {formulaSteps.map(step => (
              <div
                key={step.key}
                style={{
                  marginBottom: 16,
                  padding: 12,
                  border: '1px solid #f0f0f0',
                  borderRadius: 4,
                }}
              >
                <Title level={5}>{step.title}</Title>
                <Text code style={{ display: 'block', margin: '8px 0' }}>
                  {step.description} = {formatCurrency(step.totalCost)}
                </Text>
                <div style={{ marginTop: 8, fontSize: '0.9em', color: '#666' }}>
                  <strong>Формула:</strong>
                  <br />
                  <div dangerouslySetInnerHTML={{ __html: step.legend }} />
                </div>
                <Space wrap style={{ marginTop: 8 }}>
                  {step.tags}
                </Space>
              </div>
            ))}
          </Panel>
        </Collapse> */}

        {/* <Button type="dashed" block onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Скрыть детали' : 'Показать формулу расчёта'}
        </Button> */}
      </Space>
    </Card>
  );
};

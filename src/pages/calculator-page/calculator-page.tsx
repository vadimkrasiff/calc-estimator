import { useState, useEffect } from 'react';
import { CalculatorForm } from '@/widgets/calculator/calculator-form';
import { CalculatorResult } from '@/widgets/calculator/calculator-result';
import { CalculationFormula } from '@/widgets/calculator/calculation-formula';
import { headerConfigSchema, type HeaderConfig } from '@/shared/lib/header-schema';
import { useSetHeaderConfig } from '@/app/hooks/use-header';
import { message } from 'antd';
import { useMaterialStore } from '@/entities/material/model/material-store';
import type { AnyType } from '@/entities/material/model/types';

interface CalculatorFormData {
  houseTypeId: string;
  length: number;
  width: number;
  floors: number;
  roofType: 'gable' | 'hip' | 'shed' | 'flat';
  ceilingHeights: number[];
  foundationType: 'pile' | 'strip' | 'slab' | 'column';
  categoryHouse: string;
  logCalculationMethod?: 'perimeter' | 'linear';
  linearWallLength?: number;
  linearBottomBindingLength?: number;
  roofHeight: number;
  insulationType: boolean;

  // Материалы по ролям
  [key: string]: AnyType;
}

export interface MaterialCost {
  materialId: string;
  materialName: string;
  quantityRequired: number;
  quantityRequiredWidthWasteFactor: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  totalCostWidthWasteFactor: number;
  calculationType: string;
  description?: string;
  price: number;
  width?: number;
  height?: number;
  nominalWidth?: number;
  nominalHeight?: number;
  wasteFactor?: number;
  selectedLengthMm?: number;
  requiredLengthM?: number;
  jointWasteFactor?: number;
  mansardVolume?: number;
  internalWallsVolume?: number;
  quantityPieces?: number;

  // Новое поле для определения типа записи
  isLabor?: boolean; // true для записей со стоимостью работ
  laborPricePerUnit?: number; // цена работы за единицу
}

export const CalculatorPage = () => {
  const setHeaderConfig = useSetHeaderConfig();
  const { materials: allMaterials } = useMaterialStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
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
      roofHeight?: number;
      floorJoistSpacing?: number;
    };
    houseTypeCategory: string | null;
  } | null>(null);

  useEffect(() => {
    const config: HeaderConfig | null = headerConfigSchema.parse({
      title: 'Калькулятор стоимости',
      description: 'Расчет приблизительной стоимости материалов',
      showBackButton: true,
    });
    setHeaderConfig(config);
    return () => setHeaderConfig(null);
  }, [setHeaderConfig]);

  const calculateCost = async (data: CalculatorFormData) => {
    setLoading(true);
    try {
      const houseTypeCategory = data.categoryHouse;

      if (houseTypeCategory !== 'Брусовой') {
        message.warning('Расчёт поддерживается только для категории "Брусовой"');
        return;
      }

      const baseArea = data.length * data.width;
      const totalArea = baseArea * (data.floors === 1 ? 1 : 2);
      const perimeter = (data.length + data.width) * 2;
      const totalWallHeight =
        data.ceilingHeights.length === 1
          ? data.ceilingHeights[0]
          : data.ceilingHeights[0] + data.ceilingHeights[1];
      const roofType = data.roofType;
      const insulationType = data.insulationType;
      const wallLengthForLogs =
        data.logCalculationMethod === 'linear' ? data.linearWallLength || perimeter : perimeter;
      const linearBottomBindingLength = data.linearBottomBindingLength || wallLengthForLogs;

      const floorCoefficients: Record<number, number> = {
        1: 1.0,
        2: 1.05,
        3: 1.1,
        4: 1.15,
        5: 1.2,
      };
      const floorMultiplier = floorCoefficients[data.floors] || 1.25;

      const aspectRatio = Math.max(data.length, data.width) / Math.min(data.length, data.width);
      const shapeRatio =
        aspectRatio <= 1.2 ? 1.0 : aspectRatio <= 1.5 ? 1.05 : aspectRatio <= 2.0 ? 1.1 : 1.15;

      const materials: MaterialCost[] = [];
      let totalCost = 0;
      let totalCostWidthWasteFactor = 0;

      const shortSide = Math.min(data.length, data.width);
      const longSide = Math.max(data.length, data.width);

      const possibleRoles = [
        'walls_logs',
        'floors_beams',
        'floors_subfloor',
        'ceilings_beams',
        'roofs_trusses',
        'roofs_sheathing',
        'foundation_strip',
        'foundation_slab',
        'foundation_columns',
        'bottom_binding',
        'ground_floor_beams',
        'upper_floor_beams',

        // ✅ Новые поля утепления
        'roof_insulation', // Утепление крыши (зависит от insulationType)
        'ceiling_insulation', // Утепление потолка (только холодная кровля)
        'ceiling_lags', // Лаги для потолка (только холодная кровля)
        'floor1_insulation', // Утепление перекрытия 1 этажа
        'floor2_insulation', // Утепление перекрытия 2 этажа (только если 2 этажа)

        'roofing_material',
        'interventr_insulation',
        'roof_battens',
        'foundation_piles',
        'addit_foundation_piles',
      ];

      for (const role of possibleRoles) {
        const materialId = data[role];
        if (!materialId) continue;

        const material = allMaterials.find(m => m.id.toString() === materialId.toString());
        if (!material || !material.latestPrice) continue;

        const htm = {
          materialId: material.id.toString(),
          materialName: material.name,
          unit: material.unit,
          width: material.width,
          height: material.height,
          nominalWidth: material.nominalWidth,
          nominalHeight: material.nominalHeight,
          defaultWasteFactor: material.defaultWasteFactor,
          latestPrice: material.latestPrice,
          calculationType: role,
          description: material.description,
        };

        const unitPrice = htm.latestPrice;
        const wasteFactor = htm.defaultWasteFactor || 1;
        let quantityRequired = 0;
        let selectedLengthMm: number | undefined;
        let requiredLengthM: number | undefined;
        let jointWasteFactor = 1.0;
        let mansardVolume: number | undefined;
        let internalWallsVolume: number | undefined;
        let quantityPieces: number | undefined = undefined;

        // Получаем цену работы из формы (если есть)
        const laborPrice = data[`${role}_price`] as number | undefined;

        switch (role) {
          // 🏗️ Межвенцовый утеплитель
          case 'interventr_insulation': {
            const logLength = 6.0;

            //Высота одного ряда
            const wallLogsNominalHeight =
              (allMaterials.find(m => m.id.toString() === 'walls_logs'.toString())?.nominalHeight ||
                145) / 1000;

            let totalLogsForGables = 0;

            if (roofType === 'gable') {
              const shortSide = Math.min(data.length, data.width); // ширина дома

              // Высота фронтона
              const gableHeight = data.roofHeight;

              // Площадь фронтона
              const gableArea = (shortSide * gableHeight) / 2;

              // Представляем площадь как прямоугольник: shortSide × ?
              const virtualHeight = gableArea / shortSide;

              // Количество рядов в фронтоне
              const gableRows = Math.ceil(virtualHeight / wallLogsNominalHeight);

              // Общее количество брусьев для 2 фронтонов
              totalLogsForGables = gableRows * logLength * 2;
            }

            // === Коньковые прогоны ===
            let totalLogsForRidges = 0;

            if (roofType === 'gable') {
              const longSide = Math.max(data.length, data.width); // длина дома

              // Центральные прогоны
              const centralRidgeLogs = [
                longSide + 1.4, // 2 выступа по 0.7 м
                longSide + 0.8, // 2 выступа по 0.4 м
                longSide, // без выступов
              ];
              const totalCentralLogs = centralRidgeLogs.reduce(
                (sum, len) => sum + Math.ceil(len),
                0,
              );

              // Боковые прогоны (2 штуки)
              const sideRidgeLogs = [
                longSide + 1.4, // 2 выступа по 0.7 м
                longSide + 0.8, // 2 выступа по 0.4 м
              ];
              const totalSideLogs = sideRidgeLogs.reduce((sum, len) => sum + Math.ceil(len), 0) * 2; // ×2 фронтона

              // Общее количество брусьев для коньков
              totalLogsForRidges = totalCentralLogs + totalSideLogs;
            }

            //Количество рядов
            const totalRows = Math.ceil(totalWallHeight / wallLogsNominalHeight);
            const totalLogs =
              totalRows * wallLengthForLogs + totalLogsForGables + totalLogsForRidges;
            //площадь

            quantityRequired = totalLogs;
            break;
          }
          case 'walls_logs': {
            // Длина бруса (всегда 6 м)
            const logLength = 6.0;

            // Размеры до профилировки (для объёма)
            const rawWidth = (htm.width || 150) / 1000;
            const rawHeight = (htm.height || 150) / 1000;

            // Размеры после профилировки (для количества рядов)
            const profiledHeight = (htm.nominalHeight || 140) / 1000;

            // Объём одного бруса (из таблицы)
            const logVolume = (() => {
              const table: Record<string, number> = {
                '100x100': 0.06,
                '100x150': 0.09,
                '150x150': 0.135,
                '100x180': 0.108,
                '150x180': 0.162,
                '180x180': 0.194,
                '100x200': 0.12,
                '150x200': 0.18,
                '180x200': 0.216,
                '200x200': 0.24,
                '250x200': 0.3,
                '250x250': 0.375,
                '250x300': 0.45,
                '300x300': 0.54,
              };
              const key = `${Math.round(rawHeight * 1000)}x${Math.round(rawWidth * 1000)}`;
              return table[key] || 0.135;
            })();

            // === Стены ===
            const wallLength = wallLengthForLogs;
            const logsPerRow = Math.ceil(wallLength / logLength);
            const totalRows = Math.ceil(totalWallHeight / profiledHeight);
            const totalLogsForWalls = logsPerRow * totalRows;

            // === Фронтоны ===
            let totalLogsForGables = 0;
            if (roofType === 'gable') {
              const shortSide = Math.min(data.length, data.width);
              const gableHeight = data.roofHeight;
              const gableArea = (shortSide * gableHeight) / 2;
              const virtualHeight = gableArea / shortSide;
              const gableRows = Math.ceil(virtualHeight / profiledHeight);
              const gableLogsPerRow = Math.ceil(shortSide / logLength);
              totalLogsForGables = gableLogsPerRow * gableRows * 2;
            }

            // === Коньковые прогоны ===
            let totalLogsForRidges = 0;
            if (roofType === 'gable') {
              const longSide = Math.max(data.length, data.width);
              const centralRidgeLogs = [
                (longSide + 1.4) / logLength,
                (longSide + 0.8) / logLength,
                longSide / logLength,
              ];
              const totalCentralLogs = centralRidgeLogs.reduce(
                (sum, len) => sum + Math.ceil(len),
                0,
              );
              const sideRidgeLogs = [(longSide + 1.4) / logLength, (longSide + 0.8) / logLength];
              const totalSideLogs = sideRidgeLogs.reduce((sum, len) => sum + Math.ceil(len), 0) * 2;
              totalLogsForRidges = totalCentralLogs + totalSideLogs;
            }

            // === Итоговое количество бруса ===
            const totalLogs = totalLogsForWalls + totalLogsForGables + totalLogsForRidges;
            quantityPieces = totalLogs;
            quantityRequired = totalLogs * logVolume * jointWasteFactor;

            // ✅ === ДОПОЛНИТЕЛЬНЫЕ УСЛУГИ ДЛЯ БРУСА ===

            // 🔥 Камерная сушка
            const kilnDryingEnabled = data.walls_logs_kiln_drying === true;
            const kilnDryingPrice = data.walls_logs_kiln_drying_price as number | undefined;

            if (kilnDryingEnabled && kilnDryingPrice && kilnDryingPrice > 0) {
              // Стоимость считается за объём бруса (м³)
              const kilnDryingCost = quantityRequired * kilnDryingPrice;
              const kilnDryingCostWithWaste = quantityRequired * wasteFactor * kilnDryingPrice;

              materials.push({
                materialId: `${material.id}_kiln_drying`,
                materialName: 'Камерная сушка бруса',
                quantityRequired: quantityRequired,
                quantityRequiredWidthWasteFactor: quantityRequired * wasteFactor,
                unit: 'м³',
                unitPrice: kilnDryingPrice,
                totalCost: kilnDryingCost,
                totalCostWidthWasteFactor: kilnDryingCostWithWaste,
                calculationType: 'walls_logs_kiln_drying',
                description: 'Сушка бруса в камере до влажности 12-18%',
                price: kilnDryingPrice,
              });

              totalCost += kilnDryingCost;
              totalCostWidthWasteFactor += kilnDryingCostWithWaste;
            }

            // ✂️ Нарезка чаш
            const cupCuttingEnabled = data.walls_logs_cup_cutting === true;
            const cupCuttingPrice = data.walls_logs_cup_cutting_price as number | undefined;

            if (cupCuttingEnabled && cupCuttingPrice && cupCuttingPrice > 0) {
              // Расчёт количества чаш: 4 угла × количество рядов бруса
              // Для фронтонов и коньков чашы обычно не режутся, считаем только основные стены
              const wallRows = Math.ceil(totalWallHeight / profiledHeight);
              const corners = 4; // стандартный прямоугольный дом
              let cupsCount = corners * wallRows;

              // Если есть фронтоны из бруса — добавляем чашы для них (опционально)
              if (roofType === 'gable' && totalLogsForGables > 0) {
                cupsCount += 2 * Math.ceil(totalLogsForGables / 2); // 2 фронтона
              }

              const cupCuttingCost = cupsCount * cupCuttingPrice;

              materials.push({
                materialId: `${material.id}_cup_cutting`,
                materialName: 'Нарезка чаш',
                quantityRequired: cupsCount,
                quantityRequiredWidthWasteFactor: cupsCount, // для чаш отходы не применяются
                unit: 'шт',
                unitPrice: cupCuttingPrice,
                totalCost: cupCuttingCost,
                totalCostWidthWasteFactor: cupCuttingCost,
                calculationType: 'walls_logs_cup_cutting',
                description: 'Зарезка чаш для угловых соединений бруса',
                price: cupCuttingPrice,
                quantityPieces: cupsCount,
              });

              totalCost += cupCuttingCost;
              totalCostWidthWasteFactor += cupCuttingCost;
            }

            break;
          }

          // 🏠 ЛАГИ (по твоему алгоритму)
          case 'floors_beams': {
            const span = shortSide; // пролёт (короткая сторона)
            const wallLength = longSide; // длина стены (длинная сторона)
            const spacing = 0.6; // шаг между лагами (м)
            const logLength = 6.0; // длина бруса (м)

            const count = Math.floor((wallLength - spacing) / spacing) + 1; // количество лаг

            // Количество брусьев на одну лагу
            const logsPerBeam = Math.ceil(span / logLength); // сколько брусьев на 1 лагу

            // Общее количество брусьев для лаг
            const totalLogs = count * logsPerBeam;

            // Объём одного бруса (из таблицы)
            const logVolume = (() => {
              const table: Record<string, number> = {
                '100x100': 0.06,
                '100x150': 0.09,
                '150x150': 0.135,
                '100x180': 0.108,
                '150x180': 0.162,
                '180x180': 0.194,
                '100x200': 0.12,
                '150x200': 0.18,
                '180x200': 0.216,
                '200x200': 0.24,
                '250x200': 0.3,
                '250x250': 0.375,
                '250x300': 0.45,
                '300x300': 0.54,
              };
              const key = `${htm.height || 150}x${htm.width || 150}`;
              return table[key] || 0.135; // по умолчанию 150x150
            })();

            // Общий объём лаг
            const volume = totalLogs * logVolume;
            quantityPieces = totalLogs;

            // Применяем коэффициенты
            quantityRequired = volume;
            break;
          }
          // 🏠 УТЕПЛЕНИЕ КРЫШИ (зависит от типа кровли)
          case 'roof_insulation': {
            const shortSide = Math.min(data.length, data.width);
            const longSide = Math.max(data.length, data.width);
            const roofHeight = data.roofHeight;

            // Длина ската с выступами
            const horizontalOverhang = 0.527;
            const totalHalfBase = shortSide / 2 + horizontalOverhang;
            const rafterLength = Math.sqrt(Math.pow(roofHeight, 2) + Math.pow(totalHalfBase, 2));

            // Площадь крыши (2 ската с выступами)
            const roofArea = (longSide + 1.4) * rafterLength * 2;

            console.log(roofArea);

            if (insulationType === false) {
              // ❄️ Холодная кровля: только пароизоляция в 1 слой
              quantityRequired = roofArea;
            } else {
              // 🔥 Тёплая кровля: полный пирог (считаем как площадь × 2 слоя пароизоляции + утеплитель)
              // Для упрощения считаем общую площадь материалов
              quantityRequired = roofArea; // +20% на нахлёст и второй слой
            }
            break;
          }

          // 🏠 УТЕПЛЕНИЕ ПОТОЛКА (только холодная кровля)
          case 'ceiling_insulation': {
            if (insulationType === true) {
              // Для тёплой кровли это поле не используется
              continue;
            }

            // Площадь потолка = площадь основания дома
            const ceilingArea = data.length * data.width;

            // Добавляем 10% на подрезку и нахлёст
            quantityRequired = ceilingArea;
            break;
          }

          // 🪵 ЛАГИ ДЛЯ ПОТОЛКА (только холодная кровля)
          case 'ceiling_lags': {
            if (insulationType === true) {
              // Для тёплой кровли это поле не используется
              continue;
            }

            const span = shortSide; // пролёт (короткая сторона)
            const wallLength = longSide; // длина стены (длинная сторона)
            const spacing = 0.6; // шаг между лагами (м)
            const logLength = 6.0; // длина бруса (м)

            // Количество лаг
            const count = Math.floor((wallLength - spacing) / spacing) + 1;

            // Количество брусьев на одну лагу
            const logsPerBeam = Math.ceil(span / logLength);

            // Общее количество брусьев
            const totalLogs = count * logsPerBeam;

            // Объём одного бруса (из таблицы)
            const logVolume = (() => {
              const table: Record<string, number> = {
                '100x100': 0.06,
                '100x150': 0.09,
                '150x150': 0.135,
                '100x180': 0.108,
                '150x180': 0.162,
                '180x180': 0.194,
                '100x200': 0.12,
                '150x200': 0.18,
                '180x200': 0.216,
                '200x200': 0.24,
                '250x200': 0.3,
                '250x250': 0.375,
                '250x300': 0.45,
                '300x300': 0.54,
              };
              const key = `${htm.height || 150}x${htm.width || 150}`;
              return table[key] || 0.135;
            })();

            const volume = totalLogs * logVolume;
            quantityPieces = totalLogs;
            quantityRequired = volume;
            break;
          }

          // 🏠 УТЕПЛЕНИЕ ПЕРЕКРЫТИЯ 1 ЭТАЖА
          case 'floor1_insulation': {
            // Площадь перекрытия = площадь основания
            const floorArea = data.length * data.width;

            // Добавляем 10% на подрезку
            quantityRequired = floorArea;
            break;
          }

          // 🏠 УТЕПЛЕНИЕ ПЕРЕКРЫТИЯ 2 ЭТАЖА (только если 2 этажа)
          case 'floor2_insulation': {
            if (data.floors < 2) {
              // Если нет 2 этажа, пропускаем
              continue;
            }

            // Площадь перекрытия = площадь основания
            const floorArea = data.length * data.width;

            // Добавляем 10% на подрезку
            quantityRequired = floorArea;
            break;
          }
          // 🪵 ЧЕРНОВОЙ ПОЛ
          case 'floors_subfloor': {
            const boardLength = shortSide;
            const roomLength = longSide;
            const boardWidth = (htm.width || 150) / 1000;
            const boardThickness = (htm.height || 40) / 1000;
            const boardCount = Math.floor(roomLength / boardWidth) + 1;
            const boardLengthWithOverhang = boardLength + 0.04;
            const crossSection = boardWidth * boardThickness;
            const volume = boardCount * boardLengthWithOverhang * crossSection;

            requiredLengthM = boardLengthWithOverhang;

            if (selectedLengthMm && selectedLengthMm < boardLengthWithOverhang * 1000) {
              jointWasteFactor = 1.05;
              quantityRequired = volume * jointWasteFactor;
            } else {
              quantityRequired = volume;
            }
            break;
          }

          // ⬆️ БАЛКИ ПЕРЕКРЫТИЯ
          case 'ceilings_beams': {
            const span = shortSide;
            const wallLength = longSide;
            const spacing = 0.6;
            const count = Math.floor(wallLength / spacing) + 1;
            const lengthPerBeam = span + 0.4;
            const crossSection = ((htm.width || 100) / 1000) * ((htm.height || 200) / 1000);
            const volume = count * lengthPerBeam * crossSection;

            requiredLengthM = lengthPerBeam;

            if (selectedLengthMm && selectedLengthMm < lengthPerBeam * 1000) {
              jointWasteFactor = 1.05;
              quantityRequired = volume * jointWasteFactor;
            } else {
              quantityRequired = volume;
            }
            break;
          }

          // 🌇 СТРОПИЛА (с учётом выступов)
          case 'roofs_trusses': {
            const logLength = 6.0; // длина бруса (м)
            const spacing = 0.6; // шаг стропил (м)
            const horizontalOverhang = 0.527; // (м)

            // Тонкая сторона материала
            const thinSide = Math.min(htm.width || 100, htm.height || 200) / 1000; // (м)

            // Длина конькового прогона (с выступами)
            const ridgeLength = longSide + 1.4; // длина дома + 0.7×2 (м)

            // Количество стропил (на концах + внутри с шагом)
            const count = Math.floor(ridgeLength / spacing) + 1; // (шт)

            // Длина одного стропила: L = √(H² + (W/2)²) + выступ (по наклону)
            const gableHeight = data.roofHeight; // высота конька (м)
            const rafterLength = Math.sqrt(
              Math.pow(gableHeight, 2) + Math.pow(shortSide / 2 + horizontalOverhang, 2),
            ); // (м)

            // Если стропило < 6 м → считаем как 6 м, иначе — реальная длина
            const effectiveLength = rafterLength < logLength ? logLength : rafterLength; // (м)

            // Общая длина стропил
            const totalLength = count * effectiveLength * 2; // (м)

            // Количество брусьев
            const totalLogs = Math.ceil(totalLength / logLength); // (шт)

            // Объём одного бруса (из таблицы)
            const logVolume = (() => {
              const table: Record<string, number> = {
                '100x100': 0.06,
                '100x150': 0.09,
                '150x150': 0.135,
                '100x180': 0.108,
                '150x180': 0.162,
                '180x180': 0.194,
                '100x200': 0.12,
                '150x200': 0.18,
                '50x200': 0.06,
                '180x200': 0.216,
                '200x200': 0.24,
                '250x200': 0.3,
                '250x250': 0.375,
                '250x300': 0.45,
                '300x300': 0.54,
              };
              const key = `${Math.round(thinSide * 1000)}x${Math.max(htm.width || 100, htm.height || 200)}`;
              return table[key] || 0.135; // по умолчанию 150x150
            })();

            // Общий объём стропил
            const volume = totalLogs * logVolume;

            // Применяем коэффициенты
            quantityRequired = volume;
            quantityPieces = totalLogs;
            break;
          }

          // 🌇 Контробрешётка ( бруски для крыши с учётом выступов)
          case 'roof_battens': {
            const logLength = 6.0; // длина бруса (м)
            const spacing = 0.6; // шаг стропил (м)
            const horizontalOverhang = 0.527; // (м)

            // Тонкая сторона материала
            const thinSide = Math.min(htm.width || 100, htm.height || 200) / 1000; // (м)

            // Длина конькового прогона (с выступами)
            const ridgeLength = longSide + 1.4; // длина дома + 0.7×2 (м)

            // Количество стропил (на концах + внутри с шагом)
            const count = Math.floor(ridgeLength / spacing) + 1; // (шт)

            // Длина одного стропила: L = √(H² + (W/2)²) + выступ (по наклону)
            const gableHeight = data.roofHeight; // высота конька (м)
            const rafterLength = Math.sqrt(
              Math.pow(gableHeight, 2) + Math.pow(shortSide / 2 + horizontalOverhang, 2),
            ); // (м)

            // Если стропило < 6 м → считаем как 6 м, иначе — реальная длина
            const effectiveLength = rafterLength < logLength ? logLength : rafterLength; // (м)

            // Общая длина стропил
            const totalLength = count * effectiveLength * 2; // (м)

            // Количество брусьев
            const totalLogs = Math.ceil(totalLength / logLength); // (шт)

            // Объём одного бруса (из таблицы)
            const logVolume = (() => {
              const table: Record<string, number> = {
                '100x100': 0.06,
                '100x150': 0.09,
                '150x150': 0.135,
                '100x180': 0.108,
                '150x180': 0.162,
                '180x180': 0.194,
                '100x200': 0.12,
                '150x200': 0.18,
                '50x200': 0.06,
                '180x200': 0.216,
                '200x200': 0.24,
                '250x200': 0.3,
                '250x250': 0.375,
                '250x300': 0.45,
                '300x300': 0.54,
                '50x50': 0.015,
              };
              const key = `${Math.round(thinSide * 1000)}x${Math.max(htm.width || 100, htm.height || 200)}`;
              return table[key] || 0.015; // по умолчанию 50x50
            })();

            // Общий объём стропил
            const volume = totalLogs * logVolume;

            // Применяем коэффициенты
            quantityRequired = volume;
            quantityPieces = totalLogs;
            break;
          }

          case 'roofs_sheathing': {
            // 🪵 ОБРЕШЁТКА (по рядам)
            const logLength = 6.0; // длина доски (м)

            const horizontalOverhang = 0.6; // выступ (м)
            const halfBase = shortSide / 2; // половина основания (м)
            const totalHalfBase = halfBase + horizontalOverhang; // половина основания + выступ (м)

            // Длина ската: L = √(H² + (W/2)²)
            const roofHeight = data.roofHeight; // высота крыши (м)
            const rafterBaseLength = Math.sqrt(Math.pow(roofHeight, 2) + Math.pow(halfBase, 2));

            const rafterLength = Math.sqrt(Math.pow(roofHeight, 2) + Math.pow(totalHalfBase, 2));

            const sheathingSpacing = 0.1; // шаг обрешётки (м)

            // Количество рядов (внутренних и наружных)
            const internalRowCount = Math.floor(rafterBaseLength / sheathingSpacing) + 1; // внутренние ряды
            const externalRowCount = Math.floor(rafterLength / sheathingSpacing) + 1; // наружные ряды
            // Длина досок (на 2 ската)
            const internalBoardLength = longSide; // внутренние доски
            const externalBoardLength = longSide + 1.4; // наружные доски (с выступами)

            // Количество досок (по 6 м)
            const internalLogs = Math.ceil(internalBoardLength / logLength) * internalRowCount * 2; // ×2 ската
            const externalLogs = Math.ceil(externalBoardLength / logLength) * externalRowCount * 2; // ×2 ската

            // Общее количество досок
            const totalLogs = internalLogs + externalLogs; // (шт)

            // Тонкая сторона доски
            const thinSide = Math.min(htm.width || 100, htm.height || 25) / 1000; // (м)

            // Объём одной доски (из таблицы)
            const logVolume = (() => {
              const table: Record<string, number> = {
                '100x100': 0.06,
                '100x150': 0.09,
                '150x150': 0.135,
                '100x180': 0.108,
                '150x180': 0.162,
                '180x180': 0.194,
                '100x200': 0.12,
                '150x200': 0.18,
                '180x200': 0.216,
                '25x100': 0.015,
                '200x200': 0.24,
                '250x200': 0.3,
                '250x250': 0.375,
                '250x300': 0.45,
                '300x300': 0.54,
              };
              const key = `${Math.round(thinSide * 1000)}x${Math.max(htm.width || 100, htm.height || 25)}`;
              return table[key] || 0.06; // по умолчанию 100x100
            })();

            // Общий объём обрешётки
            const volume = totalLogs * logVolume;

            // Применяем коэффициенты
            quantityRequired = volume;
            quantityPieces = totalLogs;
            break;
          }

          // 🏗️ ФУНДАМЕНТ — ЛЕНТОЧНЫЙ
          case 'foundation_strip': {
            const width = 0.4;
            const depth = 1.2;
            quantityRequired = perimeter * width * depth;
            break;
          }

          // 🏗️ ФУНДАМЕНТ — СВАЙНЫЙ
          case 'foundation_piles': {
            const area = data.length * data.width;

            const floorValue = data.floors == 2 ? 2 : 1;
            quantityRequired = Math.floor((area + 85 * floorValue) / 8);

            break;
          }

          case 'addit_foundation_piles': {
            const area = data.length * data.width;
            const floorValue = data.floors == 2 ? 2 : 1;

            quantityRequired = Math.floor((area + 85 * floorValue) / 8);

            break;
          }

          // 🏗️ ФУНДАМЕНТ — ПЛИТНЫЙ
          case 'foundation_slab': {
            const thickness = 0.25;
            quantityRequired = baseArea * thickness;
            break;
          }

          // 🏗️ ФУНДАМЕНТ — СТОЛБЧАТЫЙ
          case 'foundation_columns': {
            const columnCount = Math.floor(perimeter / 2.0);
            quantityRequired = columnCount * 0.3 * 0.3 * 1.5;
            break;
          }

          // 🏗️ НИЖНЯЯ ОБВЯЗКА (по твоему алгоритму)
          case 'bottom_binding': {
            const logLength = 6.0; // длина бруса (м)

            // Размеры до профилировки
            const rawWidth = (htm.width || 150) / 1000; // ширина до профилировки (м)
            const rawHeight = (htm.height || 150) / 1000; // высота до профилировки (м)

            // Длина обвязки
            const bindingLength = linearBottomBindingLength; // по периметру (м)
            // Количество брусьев для обвязки
            const totalLogs = Math.ceil(bindingLength / logLength);
            // Объём одного бруса (из таблицы)
            const logVolume = (() => {
              const table: Record<string, number> = {
                '100x100': 0.06,
                '100x150': 0.09,
                '150x150': 0.135,
                '100x180': 0.108,
                '150x180': 0.162,
                '180x180': 0.194,
                '100x200': 0.12,
                '150x200': 0.18,
                '180x200': 0.216,
                '200x200': 0.24,
                '250x200': 0.3,
                '250x250': 0.375,
                '250x300': 0.45,
                '300x300': 0.54,
              };
              const key = `${Math.round(rawHeight * 1000)}x${Math.round(rawWidth * 1000)}`;
              return table[key] || 0.135; // по умолчанию 150x150
            })();

            // Общий объём обвязки
            const volume = totalLogs * logVolume;

            quantityPieces = totalLogs;
            // Применяем коэффициенты
            quantityRequired = volume;
            break;
          }

          // Лаги для 2 этажа (только если 2 или 1.5 этажа)
          case 'upper_floor_beams': {
            const span = shortSide; // пролёт (короткая сторона)
            const wallLength = longSide; // длина стены (длинная сторона)
            const spacing = 0.6; // шаг между лагами (м)
            const logLength = 6.0; // длина бруса (м)

            const count = Math.floor((wallLength - spacing) / spacing) + 1; // количество лаг

            // Длина одной лаги (с учётом ширины лаги)

            // Количество брусьев на одну лагу
            const logsPerBeam = Math.ceil(span / logLength); // сколько брусьев на 1 лагу

            // Общее количество брусьев для лаг
            const totalLogs = count * logsPerBeam;

            // Объём одного бруса (из таблицы)
            const logVolume = (() => {
              const table: Record<string, number> = {
                '100x100': 0.06,
                '100x150': 0.09,
                '150x150': 0.135,
                '100x180': 0.108,
                '150x180': 0.162,
                '180x180': 0.194,
                '100x200': 0.12,
                '150x200': 0.18,
                '180x200': 0.216,
                '200x200': 0.24,
                '250x200': 0.3,
                '250x250': 0.375,
                '250x300': 0.45,
                '300x300': 0.54,
              };
              const key = `${htm.height || 150}x${htm.width || 150}`;
              return table[key] || 0.135; // по умолчанию 150x150
            })();

            // Общий объём лаг
            const volume = totalLogs * logVolume;
            quantityPieces = totalLogs;

            // Применяем коэффициенты
            quantityRequired = volume;
            break;
          }

          // 🏁 КРОВЕЛЬНЫЕ МАТЕРИАЛЫ (новая логика)
          case 'roofing_material': {
            const horizontalOverhang = 0.527; // выступ (м)
            const halfBase = shortSide / 2; // половина основания (м)
            const totalHalfBase = halfBase + horizontalOverhang; // половина основания + выступ (м)

            // Длина ската: L = √(H² + (W/2)²)
            const roofHeight = data.roofHeight; // высота крыши (м)
            const rafterLength = Math.sqrt(Math.pow(roofHeight, 2) + Math.pow(totalHalfBase, 2)); // длина ската (м)

            // Площадь крыши (с выступами)
            const roofArea = (longSide + 1.4) * rafterLength * 2; // 2 ската (м²)

            // Количество (м²)
            quantityRequired = roofArea; // (м²)

            break;
          }

          default:
            continue;
        }

        const exactQuantity =
          quantityRequired === 0 && quantityPieces ? quantityPieces : quantityRequired;
        const exactQuantityWidthWasteFactor =
          quantityRequired === 0 && quantityPieces
            ? quantityPieces * wasteFactor
            : quantityRequired * wasteFactor;
        const materialTotal = exactQuantity * unitPrice;
        const materialTotalWidthWasteFactor = exactQuantityWidthWasteFactor * unitPrice;

        // Добавляем запись для материала
        materials.push({
          materialId: htm.materialId,
          materialName: htm.materialName || `Материал ${htm.materialId}`,
          quantityRequired,
          unit: htm.unit || 'м³',
          unitPrice,
          totalCost: materialTotal,
          calculationType: htm.calculationType,
          description: htm.description,
          width: htm.width,
          height: htm.height,
          wasteFactor,
          selectedLengthMm,
          requiredLengthM,
          price: htm.latestPrice,
          jointWasteFactor: jointWasteFactor > 1.0 ? jointWasteFactor : undefined,
          internalWallsVolume,
          mansardVolume,
          quantityPieces,
          quantityRequiredWidthWasteFactor: exactQuantityWidthWasteFactor,
          totalCostWidthWasteFactor: materialTotalWidthWasteFactor,
        });

        totalCost += materialTotal;
        totalCostWidthWasteFactor += materialTotalWidthWasteFactor;

        // Если указана цена работы, добавляем отдельную запись для работ
        if (laborPrice && laborPrice > 0) {
          const laborTotal = exactQuantity * laborPrice;
          const laborTotalWithWaste = exactQuantityWidthWasteFactor * laborPrice;

          materials.push({
            materialId: `labor_${htm.materialId}`,
            materialName: `Работы: ${htm.materialName}`,
            quantityRequired: exactQuantity,
            quantityRequiredWidthWasteFactor: exactQuantityWidthWasteFactor,
            unit: htm.unit || 'м³',
            unitPrice: laborPrice,
            totalCost: laborTotal,
            totalCostWidthWasteFactor: laborTotalWithWaste,
            calculationType: `${htm.calculationType}_labor`,
            description: `Стоимость работ по ${htm.materialName.toLowerCase()}`,
            price: laborPrice,
            quantityPieces: quantityPieces,
            isLabor: true,
            laborPricePerUnit: laborPrice,
          });

          totalCost += laborTotal;
          totalCostWidthWasteFactor += laborTotalWithWaste;
        }
      }

      setResult({
        totalCost,
        totalCostWidthWasteFactor,
        materials,
        area: totalArea,
        baseArea,
        dimensions: {
          length: data.length,
          width: data.width,
          floors: data.floors,
        },
        coefficients: {
          floorMultiplier,
          shapeRatio,
          ceilingHeight: data.ceilingHeights,
          roofHeight: data.roofHeight,
          floorJoistSpacing: 0.6,
        },
        houseTypeCategory,
      });
    } catch (error) {
      console.error('Ошибка расчёта:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <CalculatorForm onSubmit={calculateCost} loading={loading} />
      {result && (
        <>
          <CalculationFormula
            totalCost={result.totalCost}
            materials={result.materials}
            area={result.area}
            totalCostWidthWasteFactor={result.totalCostWidthWasteFactor}
            baseArea={result.baseArea}
            dimensions={result.dimensions}
            coefficients={result.coefficients}
          />
          <CalculatorResult
            totalCost={result.totalCost}
            totalCostWidthWasteFactor={result.totalCostWidthWasteFactor}
            materials={result.materials}
            area={result.area}
            baseArea={result.baseArea}
            dimensions={result.dimensions}
            coefficients={result.coefficients}
          />
        </>
      )}
    </div>
  );
};

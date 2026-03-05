import { useSetHeaderConfig } from '@/app/hooks/use-header';
import { headerConfigSchema, type HeaderConfig } from '@/shared/lib/header-schema';
import {
  SimpleCalculatorForm,
  type CalculatorFormData,
  type MaterialWithQuantity,
} from '@/widgets/simple-calculator/calc-form';
import { useMaterialStore } from '@/entities/material/model/material-store';
import { message } from 'antd';
import { useEffect, useState } from 'react';
import { CalculationResultTable } from '@/widgets/simple-calculator/calc-result';

export interface MaterialCost {
  materialId: string;
  materialName: string;
  quantityRequired: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  calculationType: string;
  description?: string;
  price?: number;
  isLabor?: boolean;
  laborPricePerUnit?: number;
  quantityPieces?: number;
}

export const SimpleCalculatorPage = () => {
  const setHeaderConfig = useSetHeaderConfig();
  const { materials: allMaterials } = useMaterialStore();
  const [resultsData, setResultsData] = useState<{
    materialsData: Record<string, MaterialWithQuantity>;
    formData: CalculatorFormData;
    calculatedMaterials: MaterialCost[];
    totalCost: number;
  } | null>(null);

  useEffect(() => {
    const config: HeaderConfig | null = headerConfigSchema.parse({
      title: 'Расчет по проекту',
      description: 'Расчёт стоимости материалов по готовому проекту',
      showBackButton: true,
    });
    setHeaderConfig(config);
    return () => setHeaderConfig(null);
  }, [setHeaderConfig]);

  const handleSubmit = (formData: CalculatorFormData) => {
    const materialsData = formData.materials as Record<string, MaterialWithQuantity> | undefined;

    if (!materialsData) {
      message.error('Не выбраны материалы для расчета');
      return;
    }

    // === Логика расчёта с добавлением работ (адаптировано из CalculatorPage) ===
    const calculatedMaterials: MaterialCost[] = [];
    let totalCost = 0;

    Object.entries(materialsData).forEach(([role, data]) => {
      const material = allMaterials.find(m => m.id.toString() === data.materialId);
      if (!material || !material.latestPrice) return;

      const quantity = data.quantity;
      const materialPrice = material.latestPrice;
      const laborPrice = data.laborPrice;

      // 📦 Запись для материала
      const materialTotal = quantity * materialPrice;
      calculatedMaterials.push({
        materialId: material.id.toString(),
        materialName: material.name,
        quantityRequired: quantity,
        unit: material.unit || 'шт',
        unitPrice: materialPrice,
        totalCost: materialTotal,
        calculationType: role,
        description: material.description,
        price: materialPrice,
        quantityPieces: quantity,
      });
      totalCost += materialTotal;

      // 🔧 Запись для работ (если указана цена) — адаптация логики из CalculatorPage
      if (laborPrice && laborPrice > 0) {
        const laborTotal = quantity * laborPrice;

        calculatedMaterials.push({
          materialId: `labor_${material.id}`,
          materialName: `Работы: ${material.name}`,
          quantityRequired: quantity,
          unit: material.unit || 'шт',
          unitPrice: laborPrice,
          totalCost: laborTotal,
          calculationType: `${role}_labor`,
          description: `Стоимость работ по ${material.name.toLowerCase()}`,
          price: laborPrice,
          isLabor: true,
          laborPricePerUnit: laborPrice,
          quantityPieces: quantity,
        });
        totalCost += laborTotal;
      }
    });
    // === Конец логики расчёта ===

    setResultsData({ materialsData, formData, calculatedMaterials, totalCost });
    message.success('Расчет завершен!');
  };

  return (
    <>
      <SimpleCalculatorForm onSubmit={handleSubmit} loading={false} />

      {resultsData && (
        <CalculationResultTable
          materialsData={resultsData.materialsData}
          allMaterials={allMaterials}
          calculatedMaterials={resultsData.calculatedMaterials}
          totalCost={resultsData.totalCost}
        />
      )}
    </>
  );
};

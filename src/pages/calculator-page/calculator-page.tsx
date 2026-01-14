import { useState, useEffect } from 'react';
import { CalculatorForm } from '@/widgets/calculator/calculator-form';
import { CalculatorResult } from '@/widgets/calculator/calculator-result';
import { useHouseTypeStore } from '@/entities/house-type/model/house-type-store';
import { usePriceStore } from '@/entities/price/model/price-store';
import { headerConfigSchema, type HeaderConfig } from '@/shared/lib/header-schema';
import { useSetHeaderConfig } from '@/app/hooks/use-header';

interface CalculatorFormData {
  houseTypeId: string;
  length: number;
  width: number;
  floors: number;
}

interface MaterialCost {
  materialId: string;
  materialName: string;
  quantityPerSqm: number;
  quantityRequired: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
}

export const CalculatorPage = () => {
  const setHeaderConfig = useSetHeaderConfig();
  const { fetchHouseTypeMaterials } = useHouseTypeStore();
  const { prices } = usePriceStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    totalCost: number;
    materials: MaterialCost[];
    area: number;
    dimensions: {
      length: number;
      width: number;
      floors: number;
    };
  } | null>(null);

  useEffect(() => {
    const config: HeaderConfig | null = headerConfigSchema.parse({
      title: 'Калькулятор стоимости',
      description: 'Расчёт стоимости строительства дома',
      showBackButton: true,
    });

    setHeaderConfig(config);

    return () => setHeaderConfig(null);
  }, [setHeaderConfig]);

  const calculateCost = async (data: CalculatorFormData) => {
    setLoading(true);
    try {
      const houseTypeMaterials = await fetchHouseTypeMaterials(data.houseTypeId);

      const area = data.length * data.width * data.floors;

      const materials: MaterialCost[] = [];
      let totalCost = 0;

      for (const htm of houseTypeMaterials) {
        const latestPrice = prices
          .filter(p => p.materialId === htm.materialId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        if (latestPrice) {
          const quantityPerSqm = htm.quantityPerSqm;
          const quantityRequired = quantityPerSqm * area;
          const unitPrice = latestPrice.price;
          const materialTotal = quantityRequired * unitPrice;

          materials.push({
            materialId: htm.materialId,
            materialName: htm.materialName || `Материал ${htm.materialId}`,
            quantityPerSqm,
            quantityRequired,
            unit: 'шт',
            unitPrice,
            totalCost: materialTotal,
          });

          totalCost += materialTotal;
        }
      }

      setResult({
        totalCost,
        materials,
        area,
        dimensions: {
          length: data.length,
          width: data.width,
          floors: data.floors,
        },
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
        <CalculatorResult
          totalCost={result.totalCost}
          materials={result.materials}
          area={result.area}
          dimensions={result.dimensions}
        />
      )}
    </div>
  );
};

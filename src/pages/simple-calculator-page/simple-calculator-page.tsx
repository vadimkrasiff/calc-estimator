import { useSetHeaderConfig } from '@/app/hooks/use-header';
import { headerConfigSchema, type HeaderConfig } from '@/shared/lib/header-schema';
import {
  SimpleCalculatorForm,
  type CalculatorFormData,
  type MaterialWithQuantity,
} from '@/widgets/simple-calculator/calc-form';
import { useMaterialStore } from '@/entities/material/model/material-store';
import { message, Card } from 'antd';
import { useEffect, useState } from 'react';
import { CalculationResultTable } from '@/widgets/simple-calculator/calc-result';

export const SimpleCalculatorPage = () => {
  const setHeaderConfig = useSetHeaderConfig();
  const { materials: allMaterials } = useMaterialStore();
  const [showResults, setShowResults] = useState(false);
  const [resultsData, setResultsData] = useState<{
    materialsData: Record<string, MaterialWithQuantity>;
    formData: CalculatorFormData;
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
    // Получаем только материалы из данных формы
    const materialsData = formData.materials as Record<string, MaterialWithQuantity> | undefined;

    if (!materialsData) {
      message.error('Не выбраны материалы для расчета');
      return;
    }

    setResultsData({ materialsData, formData });
    setShowResults(true);
    message.success('Расчет завершен!');
  };

  return (
    <>
      <SimpleCalculatorForm onSubmit={handleSubmit} loading={false} />

      {showResults && resultsData && (
        <Card
          title="Результаты расчета"
          style={{ marginTop: 24 }}
          extra={
            <button
              onClick={() => setShowResults(false)}
              style={{ border: 'none', background: 'none', cursor: 'pointer' }}
            >
              Скрыть
            </button>
          }
        >
          <CalculationResultTable
            materialsData={resultsData.materialsData}
            allMaterials={allMaterials}
          />
        </Card>
      )}
    </>
  );
};

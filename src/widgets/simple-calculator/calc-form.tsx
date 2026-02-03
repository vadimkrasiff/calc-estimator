import { useMaterialStore } from '@/entities/material/model/material-store';
import type { AnyType } from '@/entities/material/model/types';
import { Form, Select, InputNumber, Button, Card, Divider, Flex, Spin, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';

export interface MaterialWithQuantity {
  materialId: string;
  quantity: number;
}

export interface CalculatorFormData {
  houseTypeId: string;
  length: number; // всегда есть
  width: number; // всегда есть
  floors: number;
  roofType: 'gable' | 'hip' | 'shed' | 'flat';
  ceilingHeights: number[];
  foundationType: 'pile' | 'strip' | 'slab' | 'column';
  categoryHouse: string;
  roofHeight: number;

  // 🔥 Метод расчёта бруса (только для брусового)
  logCalculationMethod?: 'perimeter' | 'linear';

  // 🔥 Дополнительно: длина стен по пог.м (если выбран linear)
  linearWallLength?: number;

  // Объект с материалами в виде { roleName: { materialId, quantity } }
  [key: string]: AnyType;
}

interface CalculatorFormProps {
  onSubmit: (data: CalculatorFormData) => void;
  loading: boolean;
}

const HOUSE_TYPE_CATEGORY_OPTIONS = [
  { label: 'Брусовой', value: 'Брусовой' },
  { label: 'Каркасный', value: 'Каркасный' },
  { label: 'Газобетон', value: 'Газобетон' },
];

const MATERIAL_ROLES_BY_CATEGORY: Record<
  string,
  { key: string; label: string; category?: number }[]
> = {
  Брусовой: [
    { key: 'walls_logs', label: 'Брус для сруба', category: 7 },
    { key: 'floors_beams', label: 'Лаги', category: 7 },
    { key: 'roofs_trusses', label: 'Стропила', category: 7 },
    { key: 'roofs_sheathing', label: 'Обрешётка', category: 7 },
    { key: 'bottom_binding', label: 'Нижняя обвязка', category: 7 },
    { key: 'insulation', label: 'Утеплитель', category: 2 },
    { key: 'vapor_barrier', label: 'Пароизоляционная плёнка', category: 2 },
    { key: 'roofing_material', label: 'Кровельные материалы', category: 3 },
    { key: 'interventr_insulation', label: 'Межвенцовый утеплитель', category: 2 },
    { key: 'roof_battens', label: 'Контробрешётка', category: 7 },
  ],
  Каркасный: [
    { key: 'walls_frame_structure', label: 'Каркас (стойки, балки)' },
    { key: 'walls_cladding_ext', label: 'Внешняя обшивка' },
    { key: 'walls_cladding_int', label: 'Внутренняя обшивка' },
    { key: 'floors_beams', label: 'Лаги' },
    { key: 'floors_subfloor', label: 'Черновой пол' },
    { key: 'ceilings_beams', label: 'Балки перекрытия' },
    { key: 'roofs_trusses', label: 'Стропила' },
    { key: 'roofs_sheathing', label: 'Обрешётка' },
  ],
  Газобетон: [
    { key: 'walls_blocks', label: 'Газобетонные блоки' },
    { key: 'floors_beams', label: 'Лаги' },
    { key: 'floors_subfloor', label: 'Черновой пол' },
    { key: 'ceilings_beams', label: 'Балки перекрытия' },
    { key: 'roofs_trusses', label: 'Стропила' },
    { key: 'roofs_sheathing', label: 'Обрешётка' },
  ],
};

const FOUNDATION_ROLE_MAP: Record<string, { key: string; label: string; category: number }> = {
  pile: { key: 'foundation_piles', label: 'Железобетонные сваи', category: 4 },
  strip: { key: 'foundation_strip', label: 'Ленточный фундамент', category: 4 },
  slab: { key: 'foundation_slab', label: 'Плитный фундамент', category: 4 },
  column: { key: 'foundation_columns', label: 'Столбчатый фундамент', category: 4 },
};

const ADDIT_FOUNDATION_ROLE_MAP: Record<string, { key: string; label: string; category: number }> =
  {
    pile: { key: 'addit_foundation_piles', label: 'Оголовок усиленный', category: 4 },
  };

const FOUNDATION_TYPE_OPTIONS = [
  { label: 'Свайный (ЖБ)', value: 'pile' },
  { label: 'Ленточный монолитный', value: 'strip' },
  { label: 'Плитный', value: 'slab' },
  { label: 'Столбчатый', value: 'column' },
];

export const SimpleCalculatorForm = ({ onSubmit, loading }: CalculatorFormProps) => {
  const [form] = Form.useForm<CalculatorFormData>();
  const [loadingCategories, setLoadingCategories] = useState(false);
  const { materials, fetchMaterials } = useMaterialStore();

  const getMaterials = useCallback(async () => {
    setLoadingCategories(true);
    try {
      await fetchMaterials();
    } finally {
      setLoadingCategories(false);
    }
  }, [fetchMaterials]);

  useEffect(() => {
    getMaterials();
  }, [getMaterials]);

  const onFinish = (values: CalculatorFormData) => {
    const categoryToId: Record<string, string> = {
      Брусовой: '5',
      Каркасный: '6',
      Газобетон: '7',
    };

    // Подготовим объект с материалами в нужном формате
    const materialRoles =
      MATERIAL_ROLES_BY_CATEGORY[values.categoryHouse as keyof typeof MATERIAL_ROLES_BY_CATEGORY] ||
      [];

    // Для брусового дома добавим "Лаги для 2 этажа" если нужно
    let allRoles = [...materialRoles];
    if (values.categoryHouse === 'Брусовой' && (values.floors === 1.5 || values.floors === 2)) {
      allRoles = [
        ...allRoles.slice(0, 3),
        { key: 'upper_floor_beams', label: 'Лаги для 2 этажа' },
        ...allRoles.slice(3),
      ];
    }

    const materialsData: Record<string, MaterialWithQuantity> = {};

    allRoles.forEach(role => {
      const materialId = values[role.key];
      const quantity = values[`${role.key}_quantity`];

      if (materialId && quantity !== undefined && quantity !== null) {
        materialsData[role.key] = {
          materialId,
          quantity,
        };
      }
    });

    // Формируем финальные данные для отправки
    const finalValues: Omit<CalculatorFormData, string> & {
      materials: Record<string, MaterialWithQuantity>;
      houseTypeId: string;
    } = {
      ...values,
      houseTypeId: categoryToId[values.categoryHouse] || '5',
      materials: materialsData,
    };

    // Удалим временные поля из финального объекта
    Object.keys(finalValues).forEach(key => {
      if (
        key.endsWith('_quantity') ||
        MATERIAL_ROLES_BY_CATEGORY[
          values.categoryHouse as keyof typeof MATERIAL_ROLES_BY_CATEGORY
        ]?.some(r => r.key === key)
      ) {
        delete (finalValues as AnyType)[key];
      }
    });

    onSubmit(finalValues as AnyType);
  };

  return (
    <Card title="Параметры дома">
      <Spin spinning={loadingCategories}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            roofType: 'gable',
            roofPitch: 0.5,
            floors: 1,
            ceilingHeights: [2.8],
            logCalculationMethod: 'perimeter',
            foundationType: 'pile',
          }}
        >
          <Form.Item
            name="categoryHouse"
            label="Тип дома"
            rules={[{ required: true, message: 'Выберите тип дома' }]}
          >
            <Select placeholder="Выберите тип дома" options={HOUSE_TYPE_CATEGORY_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="foundationType"
            label="Тип фундамента"
            rules={[{ required: true, message: 'Выберите тип фундамента' }]}
          >
            <Select options={FOUNDATION_TYPE_OPTIONS} />
          </Form.Item>
          {/* 🔥 Материалы */}
          <Form.Item
            shouldUpdate={(prev, curr) =>
              prev.categoryHouse !== curr.categoryHouse ||
              prev.foundationType !== curr.foundationType ||
              prev.floors !== curr.floors
            }
            noStyle
          >
            {({ getFieldValue }) => {
              const categoryHouse = getFieldValue('categoryHouse');
              const foundationType = getFieldValue('foundationType');
              const floors = getFieldValue('floors');

              if (!categoryHouse || !foundationType) return null;

              let baseRoles = MATERIAL_ROLES_BY_CATEGORY[categoryHouse] || [];

              // 🔥 Добавляем "Лаги для 2 этажа" только при 1.5 или 2 этажах
              if (categoryHouse === 'Брусовой' && (floors === 1.5 || floors === 2)) {
                baseRoles = [
                  ...baseRoles.slice(0, 3),
                  { key: 'upper_floor_beams', label: 'Лаги для 2 этажа' },
                  ...baseRoles.slice(3),
                ];
              }

              const foundationRole = FOUNDATION_ROLE_MAP[foundationType];
              const additFoundationRole = ADDIT_FOUNDATION_ROLE_MAP[foundationType];
              let allRoles = foundationRole ? [...baseRoles, foundationRole] : baseRoles;
              allRoles = additFoundationRole ? [...allRoles, additFoundationRole] : allRoles;

              return (
                <>
                  <Divider size="small" />
                  <Form.Item>
                    <Typography.Title level={5}>Материалы</Typography.Title>
                  </Form.Item>
                  {allRoles.map(role => (
                    <Flex key={role.key} gap={12}>
                      <Form.Item
                        name={role.key}
                        label={role.label}
                        className="flex-2"
                        rules={[{ required: true, message: 'Обязательное поле' }]}
                      >
                        <Select
                          placeholder={`Выберите материал для "${role.label}"`}
                          showSearch={{
                            optionFilterProp: 'children',
                            filterOption: (input, option) =>
                              `${option?.label || ''}`.toLowerCase().includes(input.toLowerCase()),
                          }}
                        >
                          {materials
                            .filter(material => material.categoryId === role?.category)
                            .map(material => (
                              <Select.Option
                                key={material.id}
                                value={material.id.toString()}
                                label={`${material.name}  ${material.unit === 'м³' && `(${material.width}×${material.height} мм)`}`}
                              >
                                {material.name}{' '}
                                {material.unit === 'м³' &&
                                  `(${material.width}×${material.height} мм)`}
                              </Select.Option>
                            ))}
                        </Select>
                      </Form.Item>

                      {/* Поле для ввода количества - отображается только при выборе материала */}
                      <Form.Item
                        noStyle
                        shouldUpdate={(prev, curr) => prev[role.key] !== curr[role.key]}
                      >
                        {() => {
                          const selectedMaterialId = getFieldValue([role.key]);
                          // if (!selectedMaterialId) return null;

                          // Найти информацию о выбранном материале
                          const selectedMaterial = materials.find(
                            m => m.id.toString() === selectedMaterialId,
                          );

                          return (
                            <Form.Item
                              name={`${role.key}_quantity`}
                              label="Количество"
                              className="flex-1"
                              rules={[
                                {
                                  required: true,
                                  message: 'Введите количество',
                                },
                                {
                                  type: 'number',
                                  min: 0,
                                  message: 'Количество должно быть положительным числом',
                                },
                              ]}
                            >
                              <InputNumber
                                placeholder="Введите количество"
                                style={{ width: '100%' }}
                                min={0}
                                precision={2}
                                addonAfter={selectedMaterial?.unit || ''}
                              />
                            </Form.Item>
                          );
                        }}
                      </Form.Item>
                    </Flex>
                  ))}
                </>
              );
            }}
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Рассчитать стоимость
            </Button>
          </Form.Item>
        </Form>
      </Spin>
    </Card>
  );
};

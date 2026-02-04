import { useMaterialStore } from '@/entities/material/model/material-store';
import { Form, Select, InputNumber, Button, Card, Divider, Flex, Spin, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';

interface CalculatorFormData {
  houseTypeId: string;
  length: number; // всегда есть
  width: number; // всегда есть
  floors: number;
  insulationType: boolean;
  roofType: 'gable' | 'hip' | 'shed' | 'flat';
  ceilingHeights: number[];
  foundationType: 'pile' | 'strip' | 'slab' | 'column';
  categoryHouse: string;
  roofHeight: number;

  // 🔥 Метод расчёта бруса (только для брусового)
  logCalculationMethod?: 'perimeter' | 'linear';

  // 🔥 Дополнительно: длина стен по пог.м (если выбран linear)
  linearWallLength?: number;
}

interface CalculatorFormProps {
  onSubmit: (data: CalculatorFormData) => void;
  loading: boolean;
}

const FLOORS_OPTIONS = [
  { label: '1 этаж', value: 1 },
  { label: '1.5 этажа (мансарда)', value: 1.5 },
  { label: '2 этажа', value: 2 },
];

const ROOF_TYPE_OPTIONS = [
  { label: 'Двускатная', value: 'gable' },
  { label: 'Вальмовая', value: 'hip' },
  { label: 'Односкатная', value: 'shed' },
  { label: 'Плоская', value: 'flat' },
];

const ROOF_INSULATION_OPTIONS = [
  { label: 'Есть', value: true },
  { label: 'Отсутствует', value: false },
];

const HOUSE_TYPE_CATEGORY_OPTIONS = [
  { label: 'Брусовой', value: 'Брусовой' },
  { label: 'Каркасный', value: 'Каркасный' },
  { label: 'Газобетон', value: 'Газобетон' },
];

const FOUNDATION_TYPE_OPTIONS = [
  { label: 'Свайный (ЖБ)', value: 'pile' },
  { label: 'Ленточный монолитный', value: 'strip' },
  { label: 'Плитный', value: 'slab' },
  { label: 'Столбчатый', value: 'column' },
];

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

const LOG_CALCULATION_METHODS = [
  { label: 'По периметру дома', value: 'perimeter' },
  { label: 'По погонным метрам', value: 'linear' },
];

const MATERIAL_ROLES_BY_CATEGORY: Record<
  string,
  { key: string; label: string; category?: number }[]
> = {
  Брусовой: [
    { key: 'walls_logs', label: 'Брус для сруба', category: 7 },
    { key: 'bottom_binding', label: 'Нижняя обвязка', category: 7 },
    { key: 'floors_beams', label: 'Лаги', category: 7 },
    { key: 'roofs_trusses', label: 'Стропила', category: 7 },
    { key: 'roofs_sheathing', label: 'Обрешётка', category: 7 },
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

export const CalculatorForm = ({ onSubmit, loading }: CalculatorFormProps) => {
  const [form] = Form.useForm();
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

  const handleFloorsChange = (value: number) => {
    let heights: number[] = [];
    if (value === 1) {
      heights = [2.8];
    } else if (value === 1.5) {
      heights = [2.8, 1.8];
    } else if (value === 2) {
      heights = [2.8, 2.8];
    }
    form.setFieldsValue({ ceilingHeights: heights });
  };

  const onFinish = (values: CalculatorFormData) => {
    const categoryToId: Record<string, string> = {
      Брусовой: '5',
      Каркасный: '6',
      Газобетон: '7',
    };
    const finalValues = {
      ...values,
      houseTypeId: categoryToId[values.categoryHouse] || '5',
    };

    console.log(finalValues);
    onSubmit(finalValues);
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

          {/* 🔥 Тип фундамента */}
          <Form.Item
            name="foundationType"
            label="Тип фундамента"
            rules={[{ required: true, message: 'Выберите тип фундамента' }]}
          >
            <Select options={FOUNDATION_TYPE_OPTIONS} />
          </Form.Item>

          {/* 🔥 Метод расчёта бруса (только для брусового) */}
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.categoryHouse !== curr.categoryHouse}
          >
            {({ getFieldValue }) => {
              const category = getFieldValue('categoryHouse');
              if (category === 'Брусовой') {
                return (
                  <Form.Item
                    name="logCalculationMethod"
                    label="Метод расчёта бруса"
                    rules={[{ required: true, message: 'Выберите метод расчёта' }]}
                  >
                    <Select options={LOG_CALCULATION_METHODS} />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>

          {/* 🔥 Дополнительное поле: длина стен по пог.м (только для брусового + linear) */}
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) =>
              prev.categoryHouse !== curr.categoryHouse ||
              (curr.categoryHouse === 'Брусовой' &&
                prev.logCalculationMethod !== curr.logCalculationMethod)
            }
          >
            {({ getFieldValue }) => {
              const category = getFieldValue('categoryHouse');
              const method = getFieldValue('logCalculationMethod');
              if (category === 'Брусовой' && method === 'linear') {
                return (
                  <Form.Item
                    name="linearWallLength"
                    label="Общая длина стен (пог. м)"
                    rules={[{ required: true, message: 'Введите длину стен' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="Например, 30"
                      min={1}
                      step={0.1}
                      precision={1}
                    />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.categoryHouse !== curr.categoryHouse}
          >
            {({ getFieldValue }) => {
              const category = getFieldValue('categoryHouse');
              if (category === 'Брусовой') {
                return (
                  <Form.Item
                    name="linearBottomBindingLength"
                    label="Общая длина нижней обввязки (пог. м)"
                    rules={[{ required: true, message: 'Введите длину стен' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="Например, 30"
                      min={1}
                      step={0.1}
                      precision={1}
                    />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>

          <Divider size="small" />

          {/* 🔥 Длина и ширина — всегда обязательны */}
          <Flex gap={8} style={{ width: '100%' }}>
            <Form.Item
              name="length"
              label="Длина (м)"
              rules={[{ required: true, message: 'Введите длину' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Длина"
                min={1}
                step={0.1}
                precision={1}
              />
            </Form.Item>

            <Form.Item
              name="width"
              label="Ширина (м)"
              rules={[{ required: true, message: 'Введите ширину' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Ширина"
                min={1}
                step={0.1}
                precision={1}
              />
            </Form.Item>
          </Flex>

          <Flex gap={8} style={{ width: '100%' }}>
            <Form.Item
              name="floors"
              label="Количество этажей"
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Выберите количество этажей' }]}
            >
              <Select
                options={FLOORS_OPTIONS}
                placeholder="Выберите этажность"
                onChange={handleFloorsChange}
              />
            </Form.Item>
          </Flex>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.floors !== curr.floors}>
            {({ getFieldValue }) => {
              const floors = getFieldValue('floors') || 1;
              const heightLabels =
                floors === 1.5
                  ? ['1 этаж (м)', 'Мансарда (м)']
                  : floors === 2
                    ? ['1 этаж (м)', '2 этаж (м)']
                    : ['1 этаж (м)'];

              return (
                <>
                  <Typography.Title level={5}>Высота этажей</Typography.Title>
                  <Form.List name="ceilingHeights">
                    {fields => (
                      <>
                        {fields.map((field, index) => (
                          <Form.Item
                            {...field}
                            key={index}
                            label={heightLabels[index] || `${index + 1} этаж (м)`}
                            validateTrigger={['onChange', 'onBlur']}
                            rules={[{ required: true, message: 'Введите высоту' }]}
                            required
                          >
                            <InputNumber
                              style={{ width: '100%' }}
                              min={1}
                              max={4.0}
                              step={0.1}
                              precision={2}
                              placeholder="Например, 2.8"
                            />
                          </Form.Item>
                        ))}
                      </>
                    )}
                  </Form.List>
                </>
              );
            }}
          </Form.Item>

          <Divider size="small" />

          <Typography.Title level={5}>Крыша</Typography.Title>

          <Flex gap={8} style={{ width: '100%' }}>
            <Form.Item
              name="roofType"
              label="Тип крыши"
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Выберите тип крыши' }]}
            >
              <Select options={ROOF_TYPE_OPTIONS} />
            </Form.Item>
            <Form.Item
              name="roofHeight"
              label="Высота крыши (м)"
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Введите высоту крыши' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Например, 0.5"
                min={0}
                step={0.1}
                precision={2}
              />
            </Form.Item>
          </Flex>
          <Flex gap={8} style={{ width: '100%' }}>
            <Form.Item
              name="insulationType"
              label="Утеплитель крыши"
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Выберите утеплитель крыши' }]}
            >
              <Select options={ROOF_INSULATION_OPTIONS} placeholder="Холодная или теплая кровля" />
            </Form.Item>
          </Flex>

          {/* 🔥 Материалы */}
          <Form.Item
            shouldUpdate={
              (prev, curr) =>
                prev.categoryHouse !== curr.categoryHouse ||
                prev.foundationType !== curr.foundationType ||
                prev.floors !== curr.floors // ← добавили floors
            }
            noStyle
          >
            {({ getFieldValue }) => {
              const categoryHouse = getFieldValue('categoryHouse');
              const foundationType = getFieldValue('foundationType');
              const floors = getFieldValue('floors'); // ← получаем этажи

              if (!categoryHouse || !foundationType) return null;

              let baseRoles = MATERIAL_ROLES_BY_CATEGORY[categoryHouse] || [];

              // 🔥 Добавляем "Лаги для 2 этажа" только при 1.5 или 2 этажах
              if (categoryHouse === 'Брусовой' && (floors === 1.5 || floors === 2)) {
                baseRoles = [
                  ...baseRoles.slice(0, 3), // до 'ground_floor_beams'
                  { key: 'upper_floor_beams', label: 'Лаги для 2 этажа', category: 7 },
                  ...baseRoles.slice(3), // остальные
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
                    <Form.Item
                      key={role.key}
                      name={role.key}
                      label={role.label}
                      style={{ marginBottom: 16 }}
                      rules={[{ required: true, message: 'Обязательное поле' }]}
                    >
                      <Select
                        placeholder={`Выберите материал для "${role.label}"`}
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                          `${option?.label || ''}`.toLowerCase().includes(input.toLowerCase())
                        }
                      >
                        {materials
                          .filter(material =>
                            role?.category ? material.categoryId === role?.category : true,
                          )
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

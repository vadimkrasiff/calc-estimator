import { useMaterialStore } from '@/entities/material/model/material-store';
import { useSimpleCalculationStore } from '@/entities/simple-calculation/model/simple-calculation-store';
import type { AnyType } from '@/entities/material/model/types';
import type {
  CreateSimpleCalculationDto,
  SimpleHouseData,
  SimpleMaterial,
} from '@/entities/simple-calculation/model/types';
import {
  Form,
  Select,
  InputNumber,
  Button,
  Card,
  Divider,
  Flex,
  Spin,
  Typography,
  message,
  Modal,
  List,
  Space,
  Input,
  Tooltip,
} from 'antd';
import {
  SaveOutlined,
  ShareAltOutlined,
  DeleteOutlined,
  CopyOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';

export interface MaterialWithQuantity {
  materialId: string;
  quantity: number;
  laborPrice?: number; // Цена работы за единицу
}

export interface CalculatorFormData {
  houseTypeId: string;
  length: number;
  width: number;
  floors: number;
  roofType: 'gable' | 'hip' | 'shed' | 'flat';
  ceilingHeights: number[];
  foundationType: 'pile' | 'strip' | 'slab' | 'column';
  categoryHouse: string;
  roofHeight: number;
  logCalculationMethod?: 'perimeter' | 'linear';
  linearWallLength?: number;
  linearBottomBindingLength?: number;

  // Объект с материалами в виде { roleName: { materialId, quantity, laborPrice } }
  materials: Record<string, MaterialWithQuantity>;

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
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loadingCalculationId, setLoadingCalculationId] = useState<number | null>(null);

  const { materials, fetchMaterials } = useMaterialStore();

  const {
    calculations,
    loading: calculationsLoading,
    fetchCalculations,
    fetchCalculationById,
    createCalculation,
    deleteCalculation,
    shareCalculation,
    unshareCalculation,
    openShareModal,
    closeShareModal,
    shareModalVisible,
    currentShareUrl,
  } = useSimpleCalculationStore();

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
    fetchCalculations();
  }, [getMaterials, fetchCalculations]);

  const onFinish = (values: CalculatorFormData) => {
    const categoryToId: Record<string, string> = {
      Брусовой: '5',
      Каркасный: '6',
      Газобетон: '7',
    };

    // === Собираем материалы в формат { roleName: { materialId, quantity, laborPrice } } ===
    const materialRoles =
      MATERIAL_ROLES_BY_CATEGORY[values.categoryHouse as keyof typeof MATERIAL_ROLES_BY_CATEGORY] ||
      [];

    // Для брусового дома добавляем "Лаги для 2 этажа" если нужно
    let allRoles = [...materialRoles];
    if (values.categoryHouse === 'Брусовой' && (values.floors === 1.5 || values.floors === 2)) {
      allRoles = [
        ...allRoles.slice(0, 3),
        { key: 'upper_floor_beams', label: 'Лаги для 2 этажа', category: 7 },
        ...allRoles.slice(3),
      ];
    }

    // Добавляем роли фундамента
    const foundationRole = FOUNDATION_ROLE_MAP[values.foundationType];
    const additFoundationRole = ADDIT_FOUNDATION_ROLE_MAP[values.foundationType];
    if (foundationRole) allRoles.push(foundationRole);
    if (additFoundationRole) allRoles.push(additFoundationRole);

    // Формируем объект materials
    const materialsData: Record<string, MaterialWithQuantity> = {};
    allRoles.forEach(role => {
      const materialId = values[role.key];
      const quantity = values[`${role.key}_quantity`];
      const laborPrice = values[`${role.key}_labor_price`];

      if (materialId && quantity !== undefined && quantity !== null) {
        materialsData[role.key] = {
          materialId,
          quantity,
          laborPrice: laborPrice || undefined,
        };
      }
    });
    // === Конец сборки материалов ===

    // Формируем финальные данные для отправки
    const finalValues: CalculatorFormData = {
      ...values,
      houseTypeId: categoryToId[values.categoryHouse] || '5',
      materials: materialsData,
    };

    // Очищаем временные поля (_quantity, _labor_price и ключи ролей) из корневого объекта
    Object.keys(finalValues).forEach(key => {
      if (key.endsWith('_quantity') || key.endsWith('_labor_price')) {
        delete (finalValues as AnyType)[key];
      }
      if (allRoles.some(r => r.key === key)) {
        delete (finalValues as AnyType)[key];
      }
    });

    console.log('Отправка данных:', finalValues);
    onSubmit(finalValues);
  };

  // === Адаптированные функции для работы с расчетами ===

  const handleSaveCalculation = async () => {
    try {
      // Валидируем форму перед сохранением
      const values = await form.validateFields();

      let calculationName = '';
      let calculationDescription = '';

      Modal.confirm({
        title: 'Сохранить расчет',
        content: (
          <div>
            <Input
              placeholder="Название расчета"
              style={{ width: '100%', marginBottom: 16 }}
              onChange={e => {
                calculationName = e.target.value;
              }}
            />
            <Input.TextArea
              placeholder="Описание (необязательно)"
              rows={3}
              onChange={e => {
                calculationDescription = e.target.value;
              }}
            />
          </div>
        ),
        onOk: async () => {
          if (!calculationName || calculationName.trim() === '') {
            message.error('Введите название расчета');
            return;
          }

          // Подготовим houseData
          const houseData: SimpleHouseData = {
            categoryHouse: values.categoryHouse,
            floors: values.floors,
            roofType: values.roofType,
            ceilingHeights: values.ceilingHeights,
            foundationType: values.foundationType,
            roofHeight: values.roofHeight,
            length: values.length,
            width: values.width,
            // Добавьте остальные поля при необходимости
          };

          // Собираем материалы в формате SimpleMaterial[]
          const materialRoles =
            MATERIAL_ROLES_BY_CATEGORY[
              values.categoryHouse as keyof typeof MATERIAL_ROLES_BY_CATEGORY
            ] || [];

          let allRoles = [...materialRoles];
          if (
            values.categoryHouse === 'Брусовой' &&
            (values.floors === 1.5 || values.floors === 2)
          ) {
            allRoles = [
              ...allRoles.slice(0, 3),
              { key: 'upper_floor_beams', label: 'Лаги для 2 этажа', category: 7 },
              ...allRoles.slice(3),
            ];
          }

          const foundationRole = FOUNDATION_ROLE_MAP[values.foundationType];
          const additFoundationRole = ADDIT_FOUNDATION_ROLE_MAP[values.foundationType];
          if (foundationRole) allRoles.push(foundationRole);
          if (additFoundationRole) allRoles.push(additFoundationRole);

          const materialsList: SimpleMaterial[] = [];
          allRoles.forEach(role => {
            const materialId = values[role.key];
            const quantity = values[`${role.key}_quantity`];

            if (materialId && quantity !== undefined && quantity !== null) {
              const material = materials.find(m => m.id.toString() === materialId);
              if (material) {
                materialsList.push({
                  role: role.key,
                  materialId,
                  materialName: material.name,
                  quantity,
                  unit: material.unit || 'шт',
                  price: material.latestPrice || 0,
                  total: (material.latestPrice || 0) * quantity,
                });
              }
            }
          });

          // Собираем стоимость работ
          const laborCosts = allRoles
            .map(role => {
              const laborPrice = values[`${role.key}_labor_price`];
              const quantity = values[`${role.key}_quantity`];
              if (laborPrice && quantity) {
                return {
                  role: role.key,
                  pricePerUnit: laborPrice,
                  quantity,
                  total: laborPrice * quantity,
                };
              }
              return null;
            })
            .filter((l): l is NonNullable<typeof l> => l !== null);

          const totalCost = materialsList.reduce((sum, m) => sum + m.total, 0);

          const calculationData: CreateSimpleCalculationDto = {
            name: calculationName.trim(),
            description: calculationDescription.trim() || undefined,
            houseData,
            materials: materialsList,
            laborCosts: laborCosts.length > 0 ? laborCosts : undefined,
            totalCost,
            totalCostWithWaste: totalCost, // В простой форме нет коэффициента отходов
          };

          const result = await createCalculation(calculationData);
          if (result) {
            message.success('Расчет успешно сохранен');
          }
        },
      });
    } catch (error) {
      console.error('Ошибка валидации формы:', error);
      message.error('Пожалуйста, заполните все обязательные поля перед сохранением');
    }
  };

  const handleLoadCalculation = async (id: number) => {
    try {
      setLoadingCalculationId(id);

      // Загружаем полные данные расчета
      const fullCalculation = await fetchCalculationById(id);
      if (!fullCalculation || !fullCalculation.house_data) {
        message.error('Ошибка: данные расчета не найдены');
        return;
      }

      // Восстанавливаем основные значения формы
      const formValues: AnyType = {
        ...fullCalculation.house_data,
      };

      // Восстанавливаем материалы и их количества
      fullCalculation.materials?.forEach((material: SimpleMaterial) => {
        formValues[material.role] = material.materialId;
        formValues[`${material.role}_quantity`] = material.quantity;
      });

      // Восстанавливаем цены работ
      fullCalculation.labor_costs?.forEach((labor: AnyType) => {
        formValues[`${labor.role}_labor_price`] = labor.pricePerUnit;
      });

      form.setFieldsValue(formValues);

      // Принудительно обновляем поля высот этажей при необходимости
      if (fullCalculation.house_data.floors) {
        const heights = fullCalculation.house_data.ceilingHeights || [];
        form.setFieldsValue({ floors: fullCalculation.house_data.floors });
        setTimeout(() => {
          form.setFieldsValue({ ceilingHeights: heights });
        }, 0);
      }

      setIsModalVisible(false);
      message.success(`Загружен расчет: ${fullCalculation.name}`);
    } catch (error) {
      console.error('Ошибка при загрузке расчета:', error);
      message.error('Ошибка при загрузке расчета');
    } finally {
      setLoadingCalculationId(null);
    }
  };

  const handleShareCalculation = async (calculationId: number) => {
    const shareData = await shareCalculation(calculationId);
    if (shareData) {
      openShareModal(shareData.shareUrl, calculationId);
    }
  };

  // === Улучшенные функции копирования с фоллбэком ===

  const fallbackCopy = useCallback((text: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);

    textarea.select();
    textarea.setSelectionRange(0, 99999);

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        message.success('Ссылка скопирована');
      } else {
        showCopyFallback(text);
      }
    } catch {
      showCopyFallback(text);
    }
    document.body.removeChild(textarea);
  }, []);

  const copyShareLink = useCallback(() => {
    if (!currentShareUrl) {
      message.error('Ссылка не найдена');
      return;
    }

    // Современный API (только HTTPS)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(currentShareUrl)
        .then(() => message.success('Ссылка скопирована'))
        .catch(() => fallbackCopy(currentShareUrl));
      return;
    }

    // Старый метод (HTTP)
    fallbackCopy(currentShareUrl);
  }, [currentShareUrl, fallbackCopy]);

  const showCopyFallback = (text: string) => {
    Modal.info({
      title: 'Скопируйте вручную',
      content: (
        <div>
          <p>Автоматическое копирование не поддерживается в этом браузере.</p>
          <Input.TextArea value={text} autoSize={{ minRows: 2, maxRows: 4 }} readOnly />
        </div>
      ),
      onOk: () => {},
    });
  };

  return (
    <Card
      title="Параметры дома"
      extra={
        <Space>
          <Button
            icon={<SaveOutlined />}
            onClick={handleSaveCalculation}
            loading={calculationsLoading}
          >
            Сохранить
          </Button>
          <Button
            onClick={() => {
              fetchCalculations();
              setIsModalVisible(true);
            }}
          >
            Загрузить {calculations.length > 0 && `(${calculations.length})`}
          </Button>
        </Space>
      }
    >
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

              // Добавляем "Лаги для 2 этажа" только при 1.5 или 2 этажах
              if (categoryHouse === 'Брусовой' && (floors === 1.5 || floors === 2)) {
                baseRoles = [
                  ...baseRoles.slice(0, 3),
                  { key: 'upper_floor_beams', label: 'Лаги для 2 этажа', category: 7 },
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
                    <Flex key={role.key} gap={12} align="flex-start" style={{ marginBottom: 16 }}>
                      <Form.Item
                        name={role.key}
                        label={role.label}
                        style={{ flex: 2, marginBottom: 0 }}
                        rules={[{ required: true, message: 'Выберите материал' }]}
                      >
                        <Select
                          placeholder="Выберите материал"
                          showSearch
                          optionFilterProp="children"
                          filterOption={(input, option) =>
                            `${option?.label || ''}`.toLowerCase().includes(input.toLowerCase())
                          }
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

                      <Form.Item
                        name={`${role.key}_labor_price`}
                        label={
                          <span>
                            Цена работы
                            <Tooltip title="Стоимость работ за единицу материала">
                              <QuestionCircleOutlined style={{ marginLeft: 4, color: '#999' }} />
                            </Tooltip>
                          </span>
                        }
                        style={{ flex: 1, marginBottom: 0 }}
                      >
                        <InputNumber
                          placeholder="Цена работы"
                          style={{ width: '100%' }}
                          min={0}
                          step={10}
                          precision={2}
                          addonAfter="руб."
                        />
                      </Form.Item>
                    </Flex>
                  ))}
                </>
              );
            }}
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              Рассчитать стоимость
            </Button>
          </Form.Item>
        </Form>
      </Spin>

      {/* Модальное окно с сохраненными расчетами */}
      <Modal
        title="Сохраненные расчеты"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={700}
      >
        <Spin spinning={calculationsLoading}>
          {calculations.length === 0 ? (
            <Typography.Text type="secondary">Нет сохраненных расчетов</Typography.Text>
          ) : (
            <List
              dataSource={calculations}
              renderItem={(calculation: AnyType) => (
                <List.Item
                  actions={[
                    <Button
                      key="load"
                      type="primary"
                      size="small"
                      loading={loadingCalculationId === calculation.id}
                      onClick={() => handleLoadCalculation(calculation.id)}
                    >
                      Загрузить
                    </Button>,
                    <Space>
                      {calculation.is_public ? (
                        <>
                          <Button
                            key="share"
                            size="small"
                            icon={<ShareAltOutlined />}
                            onClick={() => handleShareCalculation(calculation.id)}
                          />
                          <Button
                            key="unshare"
                            size="small"
                            danger
                            onClick={() => unshareCalculation(calculation.id)}
                          >
                            Отменить публикацию
                          </Button>
                        </>
                      ) : (
                        <Button
                          key="share"
                          size="small"
                          icon={<ShareAltOutlined />}
                          onClick={() => handleShareCalculation(calculation.id)}
                        >
                          Поделиться
                        </Button>
                      )}
                    </Space>,
                    <Button
                      key="delete"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => deleteCalculation(calculation.id)}
                    />,
                  ]}
                >
                  <List.Item.Meta
                    title={calculation.name}
                    description={
                      <>
                        {calculation.description && <div>{calculation.description}</div>}
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(calculation.updated_at).toLocaleString()}
                          {calculation.is_public && ' • Опубликовано'}
                        </Typography.Text>
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Spin>
      </Modal>

      {/* Модальное окно для шаринга */}
      <Modal
        title="Поделиться расчетом"
        open={shareModalVisible}
        onCancel={closeShareModal}
        footer={[
          <Button key="copy" type="primary" onClick={copyShareLink}>
            Копировать ссылку
          </Button>,
        ]}
      >
        <Typography.Paragraph>
          Любой, у кого есть эта ссылка, может просмотреть расчет:
        </Typography.Paragraph>
        <Input
          value={currentShareUrl}
          readOnly
          addonAfter={<CopyOutlined onClick={copyShareLink} />}
        />
      </Modal>
    </Card>
  );
};

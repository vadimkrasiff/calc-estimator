import { useMaterialStore } from '@/entities/material/model/material-store';
import { useCalculationStore } from '@/entities/calculation/model/calculation-store';
import type { CreateConfigDto, CalculationConfig } from '@/entities/calculation/model/types';
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
} from 'antd';
import { SaveOutlined, ShareAltOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import type { AnyType } from '@/entities/material/model/types';

interface CalculatorFormData {
  houseTypeId: string;
  length: number;
  width: number;
  floors: number;
  insulationType: boolean;
  roofType: 'gable' | 'hip' | 'shed' | 'flat';
  ceilingHeights: number[];
  foundationType: 'pile' | 'strip' | 'slab' | 'column';
  categoryHouse: string;
  roofHeight: number;
  logCalculationMethod?: 'perimeter' | 'linear';
  linearWallLength?: number;
  linearBottomBindingLength?: number;
  [key: string]: AnyType;
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
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loadingConfigId, setLoadingConfigId] = useState<number | null>(null);

  const { materials, fetchMaterials } = useMaterialStore();

  const {
    configs,
    loading: configsLoading,
    fetchConfigs,
    fetchConfigById,
    createConfig,
    deleteConfig,
    shareConfig,
    unshareConfig,
    openShareModal,
    closeShareModal,
    shareModalVisible,
    currentShareUrl,
  } = useCalculationStore();

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
    fetchConfigs();
  }, [getMaterials, fetchConfigs]);

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

  const handleLoadConfig = async (config: CalculationConfig) => {
    try {
      setLoadingConfigId(config.id);

      // Загружаем полные данные конфигурации
      const fullConfig = await fetchConfigById(config.id);

      if (!fullConfig || !fullConfig.data) {
        message.error('Ошибка: данные конфигурации не найдены');
        return;
      }

      // Сохраняем данные конфигурации
      const configData = fullConfig.data;

      // Устанавливаем все значения формы
      form.setFieldsValue(configData);

      // Принудительно обновляем поля высот этажей
      // Для этого нужно пересоздать поля Form.List
      // Используем небольшой хак - временно меняем floors, чтобы вызвать перерисовку
      if (configData.floors) {
        // Запоминаем текущие высоты
        const heights = configData.ceilingHeights || [];

        // Устанавливаем floors
        form.setFieldsValue({ floors: configData.floors });

        // Обновляем высоты с небольшой задержкой
        setTimeout(() => {
          form.setFieldsValue({ ceilingHeights: heights });
        }, 0);
      }

      setIsModalVisible(false);
      message.success(`Загружена конфигурация: ${fullConfig.name}`);
    } catch (error) {
      console.error('Ошибка при загрузке конфигурации:', error);
      message.error('Ошибка при загрузке конфигурации');
    } finally {
      setLoadingConfigId(null);
    }
  };

  const handleSaveConfig = async () => {
    try {
      // Валидируем форму перед сохранением
      const values = await form.validateFields();

      let configName = '';
      let configDescription = '';

      Modal.confirm({
        title: 'Сохранить конфигурацию',
        content: (
          <div>
            <Input
              placeholder="Название конфигурации"
              style={{ width: '100%', marginBottom: 16 }}
              onChange={e => {
                configName = e.target.value;
              }}
            />
            <Input.TextArea
              placeholder="Описание (необязательно)"
              rows={3}
              onChange={e => {
                configDescription = e.target.value;
              }}
            />
          </div>
        ),
        onOk: async () => {
          if (!configName || configName.trim() === '') {
            message.error('Введите название конфигурации');
            return;
          }

          const configData: CreateConfigDto = {
            name: configName.trim(),
            description: configDescription.trim() || undefined,
            data: values,
          };

          const result = await createConfig(configData);
          if (result) {
            message.success('Конфигурация успешно сохранена');
          }
        },
      });
    } catch (error) {
      console.error('Ошибка валидации формы:', error);
      message.error('Пожалуйста, заполните все обязательные поля перед сохранением');
    }
  };

  const handleShareConfig = async (configId: number) => {
    const shareData = await shareConfig(configId);
    if (shareData) {
      openShareModal(shareData.shareUrl, configId);
    }
  };
  const fallbackCopy = useCallback((text: string) => {
    // Создаём временное поле
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.setAttribute('readonly', ''); // для безопасности
    document.body.appendChild(textarea);

    // Выделяем текст
    textarea.select();
    textarea.setSelectionRange(0, 99999); // для мобильных

    // Пробуем скопировать
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        message.success('Ссылка скопирована');
      } else {
        // 3. Если execCommand не сработал — показываем ссылку
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

    // 1. Современный API (только HTTPS)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(currentShareUrl)
        .then(() => message.success('Ссылка скопирована'))
        .catch(() => fallbackCopy(currentShareUrl));
      return;
    }

    // 2. Старый метод (HTTP)
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

    console.log('Отправка данных:', finalValues);
    onSubmit(finalValues);
  };

  return (
    <Card
      title="Параметры дома"
      extra={
        <Space>
          <Button icon={<SaveOutlined />} onClick={handleSaveConfig} loading={configsLoading}>
            Сохранить
          </Button>
          <Button
            onClick={() => {
              fetchConfigs();
              setIsModalVisible(true);
            }}
          >
            Загрузить {configs.length > 0 && `(${configs.length})`}
          </Button>
        </Space>
      }
    >
      <Spin spinning={loadingCategories || loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            roofType: 'gable',
            roofHeight: 0.5,
            floors: 1,
            ceilingHeights: [2.8],
            logCalculationMethod: 'perimeter',
            foundationType: 'pile',
            insulationType: true,
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
                    label="Общая длина нижней обвязки (пог. м)"
                    rules={[{ required: true, message: 'Введите длину обвязки' }]}
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
                    <Flex key={role.key} gap={8} style={{ marginBottom: 16 }}>
                      <Form.Item
                        name={role.key}
                        label={role.label}
                        style={{ flex: 2, marginBottom: 0 }}
                        rules={[{ required: true, message: 'Обязательное поле' }]}
                      >
                        <Select
                          placeholder={`Выберите материал`}
                          showSearch
                          optionFilterProp="children"
                          filterOption={(input, option) =>
                            `${option?.label || ''}`.toLowerCase().includes(input.toLowerCase())
                          }
                          onChange={() => {
                            // Сбрасываем цену при смене материала
                            form.setFieldValue([`${role.key}_price`], undefined);
                          }}
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

                      <Form.Item
                        label={'Цена за работы'}
                        name={`${role.key}_price`}
                        style={{ flex: 1, marginBottom: 0 }}
                        tooltip="Цена за единицу материала"
                      >
                        <InputNumber
                          placeholder="Цена"
                          min={0}
                          step={10}
                          precision={2}
                          style={{ width: '100%' }}
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

      {/* Модальное окно с сохраненными конфигурациями */}
      <Modal
        title="Сохраненные конфигурации"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={700}
      >
        <Spin spinning={configsLoading}>
          {configs.length === 0 ? (
            <Typography.Text type="secondary">Нет сохраненных конфигураций</Typography.Text>
          ) : (
            <List
              dataSource={configs}
              renderItem={config => (
                <List.Item
                  actions={[
                    <Button
                      key="load"
                      type="primary"
                      size="small"
                      loading={loadingConfigId === config.id}
                      onClick={() => handleLoadConfig(config)}
                    >
                      Загрузить
                    </Button>,
                    <Space>
                      {config.is_public ? (
                        <>
                          <Button
                            key="share"
                            size="small"
                            icon={<ShareAltOutlined />}
                            onClick={() => handleShareConfig(config.id)}
                          />
                          <Button
                            key="unshare"
                            size="small"
                            danger
                            onClick={() => unshareConfig(config.id)}
                          >
                            Отменить публикацию
                          </Button>
                        </>
                      ) : (
                        <Button
                          key="share"
                          size="small"
                          icon={<ShareAltOutlined />}
                          onClick={() => handleShareConfig(config.id)}
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
                      onClick={() => deleteConfig(config.id)}
                    />,
                  ]}
                >
                  <List.Item.Meta
                    title={config.name}
                    description={
                      <>
                        {config.description && <div>{config.description}</div>}
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(config.updated_at).toLocaleString()}
                          {config.is_public && ' • Опубликовано'}
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
        title="Поделиться конфигурацией"
        open={shareModalVisible}
        onCancel={closeShareModal}
        footer={[
          <Button key="copy" type="primary" onClick={copyShareLink}>
            Копировать ссылку
          </Button>,
        ]}
      >
        <Typography.Paragraph>
          Любой, у кого есть эта ссылка, может просмотреть конфигурацию:
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

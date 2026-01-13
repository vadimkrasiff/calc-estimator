import { useHouseTypeStore } from '@/entities/house-type/model/house-type-store';
import type { HouseType } from '@/entities/house-type/model/types';
import { getErrorMessage } from '@/shared/api/errorUtils';
import { Button, Form, Input, Modal, message } from 'antd';
import { useEffect } from 'react';

export const HouseTypeModal = ({
  open,
  onCloseModal,
  selectedHouseType,
}: {
  open: boolean;
  onCloseModal: () => void;
  selectedHouseType: HouseType | null;
}) => {
  const [form] = Form.useForm();
  const { createHouseType, updateHouseType } = useHouseTypeStore();

  // Обновляем форму при изменении selectedHouseType
  useEffect(() => {
    if (selectedHouseType) {
      form.setFieldsValue({
        name: selectedHouseType.name,
        description: selectedHouseType.description,
      });
    } else {
      form.resetFields();
    }
  }, [selectedHouseType, form]);

  const title = selectedHouseType ? `Тип дома "${selectedHouseType.name}"` : 'Добавление типа дома';
  const onSaveButtonText = selectedHouseType ? 'Сохранить' : 'Добавить';

  const onFinish = async (values: Omit<HouseType, 'id'>) => {
    try {
      // Удаляем description, если он пустой
      const processedValues = {
        ...values,
        ...(values.description === '' ? { description: undefined } : {}),
      };

      if (selectedHouseType) {
        await updateHouseType(selectedHouseType.id, processedValues);
        message.success('Тип дома обновлён');
      } else {
        await createHouseType(processedValues);
        message.success('Тип дома добавлен');
      }
      onCloseModal();
    } catch (error) {
      message.error(getErrorMessage(error) || 'Ошибка сохранения');
    }
  };

  return (
    <Modal open={open} onCancel={onCloseModal} cancelText={'Закрыть'} footer={[]} title={title}>
      <Form
        layout={'vertical'}
        onFinish={onFinish}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        form={form}
      >
        <Form.Item
          name="name"
          label="Название"
          rules={[{ required: true, message: 'Введите название' }]}
        >
          <Input placeholder="Введите название типа дома" />
        </Form.Item>

        <Form.Item name="description" label="Описание">
          <Input.TextArea
            rows={3}
            autoSize={{ maxRows: 6, minRows: 3 }}
            placeholder="Укажите описание"
          />
        </Form.Item>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <Button htmlType="reset" onClick={onCloseModal}>
            Закрыть
          </Button>
          <Button type="primary" htmlType="submit">
            {onSaveButtonText}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

import { Table, Button, Space, DatePicker, Select, Switch, Flex, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Price } from '@/entities/price/model/types';
import { useEffect, useState } from 'react';
import { DeleteOutlined, EditOutlined, ExportOutlined } from '@ant-design/icons';
import { usePriceStore } from '@/entities/price/model/price-store';
import { useMaterialStore } from '@/entities/material/model/material-store';
import { PriceModal } from './price-modal';
import dayjs from 'dayjs';
import type { TablePaginationConfig } from 'antd/lib';
import { getErrorMessage } from '@/shared/api/errorUtils';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const MaterialPrices = () => {
  const {
    prices,
    loading,
    pagination,
    filters,
    fetchPrices,
    setPagination,
    setFilters,
    fetchPricesForExport,
  } = usePriceStore();
  const { materials, fetchMaterials } = useMaterialStore();
  const [open, setOpen] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState<Price | null>(null);
  const [dateFilter, setDateFilter] = useState<dayjs.Dayjs | null>(null);
  const [exportLoading, setExportLoading] = useState(false); // ← Состояние для кнопки экспорта

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleDelete = async (id: string) => {
    try {
      await usePriceStore.getState().deletePrice(id);
      message.success('Прайс удален');
    } catch (error) {
      message.error(getErrorMessage(error) || 'Ошибка удаления');
    }
  };

  const onHandlePrice = (price?: Price) => {
    setOpen(true);
    if (price) setSelectedPrice(price);
  };

  const onCloseModal = () => {
    setOpen(false);
    setSelectedPrice(null);
  };

  const handleMaterialChange = (value: string) => {
    setFilters({ materialId: value || '' });
  };

  const handleDateChange = (date: dayjs.Dayjs | null) => {
    setDateFilter(date);
    setFilters({ date: date ? date.format('YYYY-MM-DD') : null });
  };

  const handleLatestOnlyChange = (checked: boolean) => {
    setFilters({ latestOnly: checked });
  };

  const clearFilters = () => {
    setFilters({ materialId: '', date: null, latestOnly: false });
    setDateFilter(null);
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setPagination({
      current: pagination.current || 1,
      pageSize: pagination.pageSize || 10,
    });
  };

  // --- Функция экспорта в Excel ---
  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      // 1. Снимок фильтров на момент клика
      const filterSnapshot = {
        materialId: filters.materialId,
        date: filters.date,
        latestOnly: filters.latestOnly,
      };

      // 2. Получаем все цены с фильтрами через функцию из стора
      const exportData = await fetchPricesForExport(filterSnapshot);

      if (!exportData || exportData.length === 0) {
        message.warning('Нет данных для выгрузки по заданным фильтрам');
        return;
      }

      // 3. Инициализация Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Цены на материалы');

      // 4. Стили
      const headerStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F4F4F' } },
        border: {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } },
        },
        alignment: { vertical: 'middle', horizontal: 'center' },
      };

      const cellStyle: Partial<ExcelJS.Style> = {
        border: {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        },
        alignment: { vertical: 'middle' },
      };

      const filterStyle: Partial<ExcelJS.Style> = {
        font: { italic: true, color: { argb: 'FF333333' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } },
      };

      // 5. Информация о фильтрах — имя материала берём из уже загруженного списка materials
      let filterText = 'Примененные фильтры: ';
      const activeFilters: string[] = [];

      if (filterSnapshot.materialId) {
        // Ищем имя материала в списке materials, который уже есть в компоненте
        const materialName =
          materials.find(m => m.id === filterSnapshot.materialId)?.name ||
          filterSnapshot.materialId; // fallback на ID, если не найден
        activeFilters.push(`Материал: ${materialName}`);
      }
      if (filterSnapshot.date) {
        activeFilters.push(`Дата: ${filterSnapshot.date}`);
      }
      if (filterSnapshot.latestOnly) {
        activeFilters.push('Только актуальные');
      }

      filterText += activeFilters.length > 0 ? activeFilters.join(', ') : 'Нет';

      const filterRow = worksheet.getRow(1);
      filterRow.getCell(1).value = filterText;
      worksheet.mergeCells('A1:E1');
      filterRow.eachCell(cell => {
        cell.style = filterStyle;
      });
      filterRow.height = 30;

      // 6. Заголовки
      const headers = ['Материал', 'Цена (руб.)', 'Поставщик', 'Дата обновления'];
      const headerRow = worksheet.getRow(2);
      headers.forEach((h, i) => {
        headerRow.getCell(i + 1).value = h;
        headerRow.getCell(i + 1).style = headerStyle;
      });
      headerRow.height = 25;

      // 7. Данные
      exportData.forEach((price, index) => {
        const row = worksheet.getRow(index + 3);
        row.getCell(1).value = `${price.materialName || 'Нет названия'} (${price.materialId})`;
        row.getCell(2).value = price.price;
        row.getCell(2).numFmt = '#,##0.00';
        row.getCell(3).value = price.supplier || '-';
        row.getCell(4).value = dayjs(price.date).format('DD.MM.YYYY HH:mm');
        row.eachCell(cell => {
          cell.style = cellStyle;
        });
      });

      // 8. Ширина колонок
      worksheet.columns = [
        { key: 'material', width: 35 },
        { key: 'price', width: 18 },
        { key: 'supplier', width: 25 },
        { key: 'date', width: 22 },
      ];

      // 9. Скачивание
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const fileName = `prices_export_${dayjs().format('YYYY-MM-DD_HH-mm')}.xlsx`;

      saveAs(blob, fileName);
      message.success(`Выгружено ${exportData.length} записей`);
    } catch (error) {
      console.error('Export error:', error);
      message.error(getErrorMessage(error) || 'Ошибка при выгрузке файла');
    } finally {
      setExportLoading(false);
    }
  };

  const columns: ColumnsType<Price> = [
    {
      fixed: 'start',
      title: 'Материал',
      dataIndex: 'materialName',
      key: 'materialName',
      render: (name, record) => `${name || 'Нет названия'} (${record.materialId})`,
    },
    {
      title: 'Цена',
      dataIndex: 'price',
      key: 'price',
      render: value =>
        `${value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} руб.`,
    },
    {
      title: 'Поставщик',
      dataIndex: 'supplier',
      key: 'supplier',
    },
    {
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      render: value => dayjs(value).format('DD.MM.YYYY HH:mm'),
    },
    {
      fixed: 'end',
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => onHandlePrice(record)} />
          <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Flex gap={8} wrap align="center" justify="space-between">
        <Flex gap={8} align="center" wrap>
          <Select
            placeholder="Выберите материал"
            value={filters.materialId || undefined}
            onChange={handleMaterialChange}
            style={{ minWidth: 200 }}
            allowClear
            options={materials.map(m => ({
              label: m.name,
              value: m.id,
            }))}
          />

          <DatePicker
            placeholder="Выберите дату"
            value={dateFilter}
            onChange={handleDateChange}
            allowClear
          />

          <Switch
            checked={filters.latestOnly}
            onChange={handleLatestOnlyChange}
            checkedChildren="Актуальные"
            unCheckedChildren="Все"
          />
          <Button onClick={clearFilters}>Очистить фильтры</Button>
        </Flex>
        <Flex gap={8}>
          {/* Кнопка экспорта */}
          <Button icon={<ExportOutlined />} onClick={handleExportExcel} loading={exportLoading}>
            Выгрузить в Excel
          </Button>
          <Button type="primary" onClick={() => onHandlePrice()}>
            Добавить
          </Button>
        </Flex>
      </Flex>

      <Table
        scroll={{ x: 'max-content' }}
        dataSource={prices}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} записей`,
        }}
        onChange={handleTableChange}
      />

      <PriceModal open={open} onCloseModal={onCloseModal} selectedPrice={selectedPrice} />
    </div>
  );
};

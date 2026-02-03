import { create } from 'zustand';
import { apiClient } from '@/shared/api/interceptor';
import type { Price, PaginatedResponse } from './types';
import { getErrorMessage } from '@/shared/api/errorUtils';
import { withApiCall } from '@/shared/api/withApiCall';

interface PriceState {
  prices: Price[];
  loading: boolean;
  error: string | null;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  filters: {
    materialId: string;
    date: string | null;
    latestOnly: boolean;
  };
  fetchPrices: (page?: number, pageSize?: number) => Promise<void>;
  setPagination: (pagination: { current: number; pageSize: number }) => void;
  setFilters: (filters: {
    materialId?: string;
    date?: string | null;
    latestOnly?: boolean;
  }) => void;
  createPrice: (price: Omit<Price, 'id'>) => Promise<void>;
  updatePrice: (id: string, price: Partial<Omit<Price, 'id'>>) => Promise<void>;
  deletePrice: (id: string) => Promise<void>;
}

export const usePriceStore = create<PriceState>((set, get) => ({
  prices: [],
  loading: false,
  error: null,
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0,
  },
  filters: {
    materialId: '',
    date: null,
    latestOnly: false,
  },

  fetchPrices: async (page = 1, pageSize) => {
    set({ loading: true, error: null });
    try {
      const { filters, pagination } = get();
      const currentPageSize = pageSize || pagination.pageSize;

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: currentPageSize.toString(),
        latestOnly: filters.latestOnly.toString(), // ← добавляем параметр
      });

      if (filters.materialId) params.append('materialId', filters.materialId);
      if (filters.date) params.append('date', filters.date);

      const response = await apiClient.get(`/prices?${params}`);
      const data: PaginatedResponse<Price> = response.data;

      set({
        prices: data.data,
        pagination: {
          current: data.page,
          pageSize: data.pageSize,
          total: data.total,
        },
        loading: false,
      });
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка загрузки прайсов', loading: false });
    }
  },

  setPagination: pagination => {
    set(s => ({ pagination: { ...s.pagination, ...pagination } }));
    get().fetchPrices(pagination.current, pagination.pageSize);
  },

  setFilters: filters => {
    set(state => ({
      filters: {
        ...state.filters,
        ...filters,
      },
      pagination: {
        ...state.pagination,
        current: 1,
      },
    }));
    get().fetchPrices(1);
  },

  createPrice: async price => {
    set({ loading: true, error: null });
    try {
      await apiClient.post('/prices', price);
      // Обновляем текущую страницу
      const { pagination } = get();
      get().fetchPrices(pagination.current, pagination.pageSize);
    } catch (error) {
      set({
        error: getErrorMessage(error),
        loading: false,
      });
    }
  },

  updatePrice: async (id, price) => {
    set({ loading: true, error: null });
    try {
      await withApiCall(apiClient.put(`/prices/${id}`, price), {
        successMessage: 'Прайс успешно обновлён',
        errorMessage: 'Не удалось обновить прайс',
      });

      // Обновляем текущую страницу
      const { pagination } = get();
      get().fetchPrices(pagination.current, pagination.pageSize);
    } catch (error) {
      set({
        error: getErrorMessage(error),
        loading: false,
      });
    }
  },

  deletePrice: async id => {
    set({ loading: true, error: null });
    try {
      await withApiCall(apiClient.delete(`/prices/${id}`), {
        successMessage: 'Прайс успешно удалён',
        errorMessage: 'Не удалось удалить прайс',
      });
      const { pagination } = get();
      get().fetchPrices(pagination.current, pagination.pageSize);
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка удаления прайса', loading: false });
    }
  },
}));

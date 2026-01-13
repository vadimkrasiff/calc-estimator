import { create } from 'zustand';
import { apiClient } from '@/shared/api/interceptor';
import type { Price } from './types';
import { getErrorMessage } from '@/shared/api/errorUtils';
import { withApiCall } from '@/shared/api/withApiCall';

interface PriceState {
  prices: Price[];
  loading: boolean;
  error: string | null;
  fetchPrices: () => Promise<void>;
  createPrice: (price: Omit<Price, 'id'>) => Promise<void>;
  updatePrice: (id: string, price: Partial<Omit<Price, 'id'>>) => Promise<void>;
  deletePrice: (id: string) => Promise<void>;
}

export const usePriceStore = create<PriceState>(set => ({
  prices: [],
  loading: false,
  error: null,

  fetchPrices: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get('/prices');
      set({ prices: response.data, loading: false });
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка загрузки прайсов', loading: false });
    }
  },

  createPrice: async price => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post('/prices', price);
      set(state => ({ prices: [response.data, ...state.prices], loading: false }));
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
      const response = await withApiCall(apiClient.put(`/prices/${id}`, price), {
        successMessage: 'Прайс успешно обновлён',
        errorMessage: 'Не удалось обновить прайс',
      });

      set(state => ({
        prices: state.prices.map(p => (p.id === id ? response.data : p)),
        loading: false,
      }));
    } catch (error) {
      // Опционально: локальная обработка (например, сохранение ошибки в store)
      set({
        error: getErrorMessage(error),
        loading: false,
      });
    }
  },

  deletePrice: async id => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/prices/${id}`);
      set(state => ({
        prices: state.prices.filter(p => p.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка удаления прайса', loading: false });
    }
  },
}));

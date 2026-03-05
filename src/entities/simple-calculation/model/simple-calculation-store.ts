import { create } from 'zustand';
import { apiClient } from '@/shared/api/interceptor';
import type { SimpleCalculation, CreateSimpleCalculationDto, ShareResponse } from './types';
import { message } from 'antd';
import type { AnyType } from '@/entities/material/model/types';

const getErrorMessage = (error: AnyType): string => {
  return error.response?.data?.error || error.message || 'Произошла ошибка';
};

interface SimpleCalculationState {
  calculations: SimpleCalculation[];
  currentCalculation: SimpleCalculation | null;
  loading: boolean;
  loadingDetail: boolean;
  error: string | null;
  shareModalVisible: boolean;
  currentShareUrl: string;
  selectedCalculationId: number | null;

  fetchCalculations: () => Promise<void>;
  fetchCalculationById: (id: number) => Promise<SimpleCalculation | null>;
  createCalculation: (data: CreateSimpleCalculationDto) => Promise<SimpleCalculation | null>;
  deleteCalculation: (id: number) => Promise<boolean>;

  shareCalculation: (id: number) => Promise<ShareResponse | null>;
  unshareCalculation: (id: number) => Promise<boolean>;
  getPublicCalculation: (shareId: string) => Promise<SimpleCalculation | null>;

  openShareModal: (url: string, calculationId: number) => void;
  closeShareModal: () => void;
  clearError: () => void;
}

export const useSimpleCalculationStore = create<SimpleCalculationState>(set => ({
  calculations: [],
  currentCalculation: null,
  loading: false,
  loadingDetail: false,
  error: null,
  shareModalVisible: false,
  currentShareUrl: '',
  selectedCalculationId: null,

  fetchCalculations: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get('/simple-calculations');
      set({ calculations: response.data, loading: false });
    } catch (error: AnyType) {
      const errorMessage = getErrorMessage(error) || 'Ошибка загрузки расчетов';
      set({ error: errorMessage, loading: false });
      message.error(errorMessage);
    }
  },

  fetchCalculationById: async (id: number) => {
    set({ loadingDetail: true, error: null });
    try {
      const response = await apiClient.get(`/simple-calculations/${id}`);
      const calculation = response.data;
      set({ currentCalculation: calculation, loadingDetail: false });
      return calculation;
    } catch (error: AnyType) {
      const errorMessage = getErrorMessage(error) || 'Ошибка загрузки расчета';
      set({ error: errorMessage, loadingDetail: false });
      message.error(errorMessage);
      return null;
    }
  },

  createCalculation: async (data: CreateSimpleCalculationDto) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post('/simple-calculations', data);
      const newCalculation = response.data;

      set(state => ({
        calculations: [newCalculation, ...state.calculations],
        loading: false,
      }));

      message.success('Расчет сохранен');
      return newCalculation;
    } catch (error: AnyType) {
      const errorMessage = getErrorMessage(error) || 'Ошибка сохранения расчета';
      set({ error: errorMessage, loading: false });
      message.error(errorMessage);
      return null;
    }
  },

  deleteCalculation: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/simple-calculations/${id}`);

      set(state => ({
        calculations: state.calculations.filter(c => c.id !== id),
        currentCalculation: state.currentCalculation?.id === id ? null : state.currentCalculation,
        loading: false,
      }));

      message.success('Расчет удален');
      return true;
    } catch (error: AnyType) {
      const errorMessage = getErrorMessage(error) || 'Ошибка удаления расчета';
      set({ error: errorMessage, loading: false });
      message.error(errorMessage);
      return false;
    }
  },

  shareCalculation: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post(`/simple-calculations/${id}/share`);
      const shareData = response.data;

      set(state => ({
        calculations: state.calculations.map(c =>
          c.id === id ? { ...c, is_public: true, share_id: shareData.shareId } : c,
        ),
        loading: false,
      }));

      message.success('Расчет опубликован');
      return shareData;
    } catch (error: AnyType) {
      const errorMessage = getErrorMessage(error) || 'Ошибка публикации расчета';
      set({ error: errorMessage, loading: false });
      message.error(errorMessage);
      return null;
    }
  },

  unshareCalculation: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/simple-calculations/${id}/share`);

      set(state => ({
        calculations: state.calculations.map(c =>
          c.id === id ? { ...c, is_public: false, share_id: undefined } : c,
        ),
        loading: false,
      }));

      message.success('Публикация отменена');
      return true;
    } catch (error: AnyType) {
      const errorMessage = getErrorMessage(error) || 'Ошибка отмены публикации';
      set({ error: errorMessage, loading: false });
      message.error(errorMessage);
      return false;
    }
  },

  getPublicCalculation: async (shareId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get(`/public/simple-calculations/${shareId}`);
      set({ loading: false });
      return response.data;
    } catch (error: AnyType) {
      const errorMessage = getErrorMessage(error) || 'Ошибка загрузки публичного расчета';
      set({ error: errorMessage, loading: false });
      message.error(errorMessage);
      return null;
    }
  },

  openShareModal: (url: string, calculationId: number) => {
    set({
      shareModalVisible: true,
      currentShareUrl: url,
      selectedCalculationId: calculationId,
    });
  },

  closeShareModal: () => {
    set({
      shareModalVisible: false,
      currentShareUrl: '',
      selectedCalculationId: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));

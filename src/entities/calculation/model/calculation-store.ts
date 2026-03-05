import { create } from 'zustand';
import { apiClient } from '@/shared/api/interceptor';
import type { CalculationConfig, CreateConfigDto, UpdateConfigDto, ShareResponse } from './types';
import { message } from 'antd';
import type { AnyType } from '@/entities/material/model/types';

const getErrorMessage = (error: AnyType): string => {
  return error.response?.data?.error || error.message || 'Произошла ошибка';
};

interface CalculationState {
  configs: CalculationConfig[];
  currentConfig: CalculationConfig | null;
  loading: boolean;
  loadingDetail: boolean;
  error: string | null;
  shareModalVisible: boolean;
  currentShareUrl: string;
  selectedConfigId: number | null;

  fetchConfigs: () => Promise<void>;
  fetchConfigById: (id: number) => Promise<CalculationConfig | null>;
  createConfig: (data: CreateConfigDto) => Promise<CalculationConfig | null>;
  updateConfig: (id: number, data: UpdateConfigDto) => Promise<CalculationConfig | null>;
  deleteConfig: (id: number) => Promise<boolean>;

  shareConfig: (id: number) => Promise<ShareResponse | null>;
  unshareConfig: (id: number) => Promise<boolean>;
  getSharedConfig: (shareId: string) => Promise<CalculationConfig | null>;

  setCurrentConfig: (config: CalculationConfig | null) => void;
  openShareModal: (url: string, configId: number) => void;
  closeShareModal: () => void;
  clearError: () => void;

  saveToLocalStorage: (configs: CalculationConfig[]) => void;
  loadFromLocalStorage: () => CalculationConfig[];
}

export const useCalculationStore = create<CalculationState>((set, get) => ({
  configs: [],
  currentConfig: null,
  loading: false,
  loadingDetail: false,
  error: null,
  shareModalVisible: false,
  currentShareUrl: '',
  selectedConfigId: null,

  fetchConfigs: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get('/calculations');
      set({ configs: response.data, loading: false });
      get().saveToLocalStorage(response.data);
    } catch (error: AnyType) {
      const errorMessage = getErrorMessage(error) || 'Ошибка загрузки конфигураций';
      set({ error: errorMessage, loading: false });
      message.error(errorMessage);
      const localConfigs = get().loadFromLocalStorage();
      set({ configs: localConfigs });
    }
  },

  fetchConfigById: async (id: number) => {
    set({ loadingDetail: true, error: null });
    try {
      const response = await apiClient.get(`/calculations/${id}`);
      const config = response.data;
      set({ currentConfig: config, loadingDetail: false });
      return config;
    } catch (error: AnyType) {
      const errorMessage = getErrorMessage(error) || 'Ошибка загрузки конфигурации';
      set({ error: errorMessage, loadingDetail: false });
      message.error(errorMessage);
      return null;
    }
  },

  createConfig: async (data: CreateConfigDto) => {
    set({ loading: true, error: null });
    try {
      console.log('Sending config data:', data); // Для отладки

      const response = await apiClient.post('/calculations', data);
      const newConfig = response.data;

      set(state => ({
        configs: [newConfig, ...state.configs],
        loading: false,
      }));

      message.success('Конфигурация сохранена');
      return newConfig;
    } catch (error: AnyType) {
      const errorMessage = getErrorMessage(error) || 'Ошибка сохранения конфигурации';
      set({ error: errorMessage, loading: false });
      message.error(errorMessage);
      return null;
    }
  },

  updateConfig: async (id: number, data: UpdateConfigDto) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.put(`/calculations/${id}`, data);
      const updatedConfig = response.data;

      set(state => ({
        configs: state.configs.map(c => (c.id === id ? updatedConfig : c)),
        currentConfig: state.currentConfig?.id === id ? updatedConfig : state.currentConfig,
        loading: false,
      }));

      message.success('Конфигурация обновлена');
      return updatedConfig;
    } catch (error: AnyType) {
      const errorMessage = getErrorMessage(error) || 'Ошибка обновления конфигурации';
      set({ error: errorMessage, loading: false });
      message.error(errorMessage);
      return null;
    }
  },

  deleteConfig: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/calculations/${id}`);

      set(state => ({
        configs: state.configs.filter(c => c.id !== id),
        currentConfig: state.currentConfig?.id === id ? null : state.currentConfig,
        loading: false,
      }));

      message.success('Конфигурация удалена');
      return true;
    } catch (error: AnyType) {
      const errorMessage = getErrorMessage(error) || 'Ошибка удаления конфигурации';
      set({ error: errorMessage, loading: false });
      message.error(errorMessage);
      return false;
    }
  },

  shareConfig: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post(`/calculations/${id}/share`);
      const shareData = response.data;

      set(state => ({
        configs: state.configs.map(c =>
          c.id === id ? { ...c, is_public: true, share_id: shareData.shareId } : c,
        ),
        loading: false,
      }));

      message.success('Конфигурация опубликована');
      return shareData;
    } catch (error: AnyType) {
      const errorMessage = getErrorMessage(error) || 'Ошибка публикации конфигурации';
      set({ error: errorMessage, loading: false });
      message.error(errorMessage);
      return null;
    }
  },

  unshareConfig: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/calculations/${id}/share`);

      set(state => ({
        configs: state.configs.map(c =>
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

  getSharedConfig: async (shareId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get(`/public/calculations/${shareId}`);
      set({ loading: false });
      return response.data;
    } catch (error: AnyType) {
      const errorMessage = getErrorMessage(error) || 'Ошибка загрузки публичной конфигурации';
      set({ error: errorMessage, loading: false });
      message.error(errorMessage);
      return null;
    }
  },

  setCurrentConfig: (config: CalculationConfig | null) => {
    set({ currentConfig: config });
  },

  openShareModal: (url: string, configId: number) => {
    set({
      shareModalVisible: true,
      currentShareUrl: url,
      selectedConfigId: configId,
    });
  },

  closeShareModal: () => {
    set({
      shareModalVisible: false,
      currentShareUrl: '',
      selectedConfigId: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },

  saveToLocalStorage: (configs: CalculationConfig[]) => {
    try {
      localStorage.setItem('calculation_configs', JSON.stringify(configs));
    } catch (error) {
      console.error('Ошибка сохранения в localStorage:', error);
    }
  },

  loadFromLocalStorage: () => {
    try {
      const saved = localStorage.getItem('calculation_configs');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Ошибка загрузки из localStorage:', error);
      return [];
    }
  },
}));

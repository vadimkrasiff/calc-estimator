import { create } from 'zustand';
import { apiClient } from '@/shared/api/interceptor';
import type { HouseType, HouseTypeMaterial } from './types';
import { getErrorMessage } from '@/shared/api/errorUtils';

interface HouseTypeState {
  houseTypes: HouseType[];
  loading: boolean;
  error: string | null;
  fetchHouseTypes: () => Promise<void>;
  createHouseType: (houseType: Omit<HouseType, 'id'>) => Promise<void>;
  updateHouseType: (id: string, houseType: Partial<Omit<HouseType, 'id'>>) => Promise<void>;
  deleteHouseType: (id: string) => Promise<void>;
  fetchHouseTypeMaterials: (houseTypeId: string) => Promise<HouseTypeMaterial[]>;
  addHouseTypeMaterials: (
    houseTypeId: string,
    materials: Array<{ materialId: string; quantityPerSqm: number }>,
  ) => Promise<void>;
  updateHouseTypeMaterial: (id: string, quantityPerSqm: number) => Promise<void>;
  deleteHouseTypeMaterial: (id: string) => Promise<void>;
}

export const useHouseTypeStore = create<HouseTypeState>(set => ({
  houseTypes: [],
  loading: false,
  error: null,

  fetchHouseTypes: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get('/house-types');
      set({ houseTypes: response.data, loading: false });
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка загрузки типов домов', loading: false });
    }
  },

  createHouseType: async houseType => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post('/house-types', houseType);
      set(state => ({ houseTypes: [...state.houseTypes, response.data], loading: false }));
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка создания типа дома', loading: false });
    }
  },

  updateHouseType: async (id, houseType) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.put(`/house-types/${id}`, houseType);
      set(state => ({
        houseTypes: state.houseTypes.map(h => (h.id === id ? response.data : h)),
        loading: false,
      }));
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка обновления типа дома', loading: false });
    }
  },

  deleteHouseType: async id => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/house-types/${id}`);
      set(state => ({
        houseTypes: state.houseTypes.filter(h => h.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка удаления типа дома', loading: false });
    }
  },
  fetchHouseTypeMaterials: async (houseTypeId: string) => {
    try {
      const response = await apiClient.get(`/house-type-materials/${houseTypeId}`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error) || 'Ошибка загрузки материалов');
    }
  },

  addHouseTypeMaterials: async (
    houseTypeId: string,
    materials: { materialId: string; quantityPerSqm: number }[],
  ) => {
    try {
      await apiClient.post(`/house-type-materials/${houseTypeId}`, { materials });
    } catch (error) {
      throw new Error(getErrorMessage(error) || 'Ошибка добавления материалов');
    }
  },

  updateHouseTypeMaterial: async (id: string, quantityPerSqm: number) => {
    try {
      await apiClient.put(`/house-type-materials/${id}`, { quantityPerSqm });
    } catch (error) {
      throw new Error(getErrorMessage(error) || 'Ошибка обновления материала');
    }
  },

  deleteHouseTypeMaterial: async (id: string) => {
    try {
      await apiClient.delete(`/house-type-materials/${id}`);
    } catch (error) {
      throw new Error(getErrorMessage(error) || 'Ошибка удаления материала');
    }
  },
}));

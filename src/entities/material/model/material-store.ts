import { create } from 'zustand';
import { apiClient } from '@/shared/api/interceptor';
import type { Material } from './types';
import { getErrorMessage } from '@/shared/api/errorUtils';

interface MaterialState {
  materials: Material[];
  loading: boolean;
  error: string | null;
  fetchMaterials: () => Promise<void>;
  createMaterial: (material: Omit<Material, 'id'>) => Promise<void>;
  updateMaterial: (id: string, material: Partial<Omit<Material, 'id'>>) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
}

export const useMaterialStore = create<MaterialState>(set => ({
  materials: [],
  loading: false,
  error: null,

  fetchMaterials: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get('/materials');
      set({ materials: response.data, loading: false });
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка загрузки материалов', loading: false });
    }
  },

  createMaterial: async material => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post('/materials', material);
      set(state => ({ materials: [...state.materials, response.data], loading: false }));
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка создания материала', loading: false });
    }
  },

  updateMaterial: async (id, material) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.put(`/materials/${id}`, material);
      set(state => ({
        materials: state.materials.map(m => (m.id === id ? response.data : m)),
        loading: false,
      }));
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка обновления материала', loading: false });
    }
  },

  deleteMaterial: async id => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/materials/${id}`);
      set(state => ({
        materials: state.materials.filter(m => m.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка удаления материала', loading: false });
    }
  },
}));

import { create } from 'zustand';
import { apiClient } from '@/shared/api/interceptor';
import { getErrorMessage } from '@/shared/api/errorUtils';

export interface MaterialCategory {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
}

interface CategoryState {
  categories: MaterialCategory[];
  loading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
  createCategory: (category: Omit<MaterialCategory, 'id' | 'createdAt'>) => Promise<void>;
  updateCategory: (
    id: number,
    category: Partial<Omit<MaterialCategory, 'id' | 'createdAt'>>,
  ) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>(set => ({
  categories: [],
  loading: false,
  error: null,

  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get('/materials/categories');
      set({ categories: response.data, loading: false });
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка загрузки категорий', loading: false });
    }
  },

  createCategory: async category => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post('/materials/categories', category);
      set(state => ({ categories: [...state.categories, response.data], loading: false }));
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка создания категории', loading: false });
    }
  },

  updateCategory: async (id, category) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.put(`/materials/categories/${id}`, category);
      set(state => ({
        categories: state.categories.map(c => (c.id === id ? response.data : c)),
        loading: false,
      }));
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка обновления категории', loading: false });
    }
  },

  deleteCategory: async id => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/materials/categories/${id}`);
      set(state => ({
        categories: state.categories.filter(c => c.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({ error: getErrorMessage(error) || 'Ошибка удаления категории', loading: false });
    }
  },
}));

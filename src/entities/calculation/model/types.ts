import type { AnyType } from '@/entities/material/model/types';

export interface CalculatorFormData {
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

  // Поля для материалов
  [key: string]: AnyType;
}

export interface CalculationConfig {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  data: CalculatorFormData; // Содержит все поля, включая цены (walls_logs_price и т.д.)
  is_public: boolean;
  share_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateConfigDto {
  name: string;
  description?: string;
  data: CalculatorFormData; // Все данные формы включаются сюда
}

export interface UpdateConfigDto {
  name?: string;
  description?: string;
  data?: CalculatorFormData;
}

export interface ShareResponse {
  shareId: string;
  shareUrl: string;
}

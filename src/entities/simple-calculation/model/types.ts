export interface SimpleMaterial {
  role: string;
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
}

export interface SimpleLaborCost {
  role: string;
  pricePerUnit: number;
  quantity: number;
  total: number;
}

export interface SimpleHouseData {
  categoryHouse: string;
  floors: number;
  roofType: 'gable' | 'hip' | 'shed' | 'flat';
  ceilingHeights: number[];
  foundationType: 'pile' | 'strip' | 'slab' | 'column';
  roofHeight: number;
  length: number;
  width: number;
}

export interface SimpleCalculation {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  house_data: SimpleHouseData;
  materials: SimpleMaterial[];
  labor_costs?: SimpleLaborCost[];
  total_cost: number;
  total_cost_with_waste: number;
  is_public: boolean;
  share_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSimpleCalculationDto {
  name: string;
  description?: string;
  houseData: SimpleHouseData;
  materials: SimpleMaterial[];
  laborCosts?: SimpleLaborCost[];
  totalCost: number;
  totalCostWithWaste: number;
}

export interface ShareResponse {
  shareId: string;
  shareUrl: string;
}

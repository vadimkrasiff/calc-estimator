export interface HouseType {
  id: string;
  name: string;
  description?: string | null;
}

export interface HouseTypeMaterial {
  id: string;
  houseTypeId: string;
  materialId: string;
  materialName?: string;
  quantityPerSqm: number;
}

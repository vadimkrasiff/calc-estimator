export interface HouseType {
  id: string;
  name: string;
  description?: string;
}

export interface HouseTypeMaterial {
  id: string;
  houseTypeId: string;
  materialId: string;
  materialName?: string;
  quantityPerSqm: number;
}

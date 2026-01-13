export interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  description?: string;
}

export interface MaterialPrice {
  id: string;
  materialId: string;
  price: number;
  region: string;
  supplier: string;
  date: string; // ISO string
}

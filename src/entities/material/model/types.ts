export interface Material {
  id: string;
  name: string;
  description?: string;
  unit: string;
  categoryId?: number;
  categoryName?: string;
  createdAt: string;
  width?: number; // мм
  height?: number; // мм
  nominalWidth?: number; // мм
  nominalHeight?: number;
  defaultWasteFactor?: number;
  latestPrice?: number | null;
  latestSupplier?: string | null;
  latestPriceDate?: string | null;
}

export interface MaterialPrice {
  id: string;
  materialId: string;
  price: number;
  region: string;
  supplier: string;
  date: string; // ISO string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyType = any;

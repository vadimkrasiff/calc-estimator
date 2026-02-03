export interface Price {
  id: string;
  materialId: string;
  materialName?: string;
  price: number;
  supplier: string;
  date: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

import api from './client';
import { AHProduct } from '../types';

interface ProductSearchResult {
  products: AHProduct[];
  page: { totalElements: number; totalPages: number; number: number; size: number };
}

export const productsApi = {
  search: (query: string, page = 0, size = 20) =>
    api.get<ProductSearchResult>('/products/search', { params: { q: query, page, size } }).then((r) => r.data),
  getBonus: (page = 0, size = 50, query?: string) =>
    api.get<ProductSearchResult>('/products/bonus', { params: { page, size, ...(query ? { q: query } : {}) } }).then((r) => r.data),
  getById: (id: number) => api.get<AHProduct>(`/products/${id}`).then((r) => r.data),
};

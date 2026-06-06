import api from './client';
import { GroceryList, GroceryListItem } from '../types';

export const listsApi = {
  getAll: () => api.get<GroceryList[]>('/lists').then((r) => r.data),
  getById: (id: number) => api.get<GroceryList>(`/lists/${id}`).then((r) => r.data),
  create: (name: string) => api.post<GroceryList>('/lists', { name }).then((r) => r.data),
  update: (id: number, name: string) =>
    api.put<GroceryList>(`/lists/${id}`, { name }).then((r) => r.data),
  delete: (id: number) => api.delete(`/lists/${id}`),
  addItem: (
    listId: number,
    item: { name: string; quantity?: number; unit?: string; ah_product_id?: number }
  ) => api.post<GroceryListItem>(`/lists/${listId}/items`, item).then((r) => r.data),
  addItems: (
    listId: number,
    items: Array<{ name: string; quantity?: number; unit?: string; ah_product_id?: number }>
  ) => api.post<GroceryList>(`/lists/${listId}/items/bulk`, { items }).then((r) => r.data),
  updateItem: (
    listId: number,
    itemId: number,
    data: Partial<Pick<GroceryListItem, 'name' | 'quantity' | 'unit' | 'checked'>>
  ) => api.put<GroceryListItem>(`/lists/${listId}/items/${itemId}`, data).then((r) => r.data),
  deleteItem: (listId: number, itemId: number) =>
    api.delete(`/lists/${listId}/items/${itemId}`),
  syncToAH: (listId: number) =>
    api.post<{ success: boolean; ahListId: string }>(`/lists/${listId}/sync`).then((r) => r.data),
};

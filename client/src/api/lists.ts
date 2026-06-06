import api from './client';
import { GroceryList, GroceryListItem, TemplateItem } from '../types';

export const listsApi = {
  getAll: () => api.get<GroceryList[]>('/lists').then((r) => r.data),
  getById: (id: number) => api.get<GroceryList>(`/lists/${id}`).then((r) => r.data),

  create: (name: string, opts?: { fromTemplate?: boolean; copyFromId?: number }) =>
    api.post<GroceryList>('/lists', { name, ...opts }).then((r) => r.data),

  update: (id: number, name: string) =>
    api.put<GroceryList>(`/lists/${id}`, { name }).then((r) => r.data),

  delete: (id: number) => api.delete(`/lists/${id}`),

  copyFrom: (targetId: number, sourceId: number, itemIds?: number[]) =>
    api
      .post<{ success: boolean; itemsCopied: number; list: GroceryList }>(
        `/lists/${targetId}/copy-from/${sourceId}`,
        { itemIds }
      )
      .then((r) => r.data),

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

  deleteCheckedItems: (listId: number) =>
    api
      .delete<{ removed: number; list: GroceryList }>(`/lists/${listId}/items/checked`)
      .then((r) => r.data),

  syncToAH: (listId: number) =>
    api
      .post<{ success: boolean; ahListId: string }>(`/lists/${listId}/sync`)
      .then((r) => r.data),

  // Template
  getTemplate: () => api.get<TemplateItem[]>('/lists/template').then((r) => r.data),
  addTemplateItem: (item: { name: string; quantity: number; unit?: string }) =>
    api.post<TemplateItem>('/lists/template/items', item).then((r) => r.data),
  removeTemplateItem: (id: number) => api.delete(`/lists/template/items/${id}`),
  clearTemplate: () => api.delete('/lists/template/items'),
};

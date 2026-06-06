import api from './client';
import { AHRecipe } from '../types';

interface RecipeSearchResult {
  recipes: AHRecipe[];
  total: number;
}

export const recipesApi = {
  search: (query: string, size = 20) =>
    api.get<RecipeSearchResult>('/recipes/search', { params: { q: query, size } }).then((r) => r.data),
  getById: (id: string) => api.get<AHRecipe>(`/recipes/${id}`).then((r) => r.data),
};

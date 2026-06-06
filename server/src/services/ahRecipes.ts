import axios from 'axios';
import { getAnonymousToken } from './ahAuth.js';
import { AHRecipe } from '../types.js';

const BASE_URL = 'https://api.ah.nl';

interface RecipeSearchResponse {
  recipes: AHRecipe[];
  total: number;
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function searchRecipes(
  query: string,
  size = 20,
  userToken?: string
): Promise<RecipeSearchResponse> {
  const token = userToken || (await getAnonymousToken());

  const response = await axios.get(`${BASE_URL}/gatekeeper/recipe/v1/recipe-suggestions`, {
    params: { query, size },
    headers: authHeader(token),
  });

  const recipes: AHRecipe[] = (response.data.recipes ?? []).map((r: any) => ({
    id: String(r.id),
    title: r.title,
    description: r.description,
    cookTime: r.cookTime,
    servings: r.servings,
    images: r.images ?? [],
    ingredients: (r.ingredients ?? []).map((ing: any) => ({
      id: ing.product?.id,
      name: ing.name ?? ing.nameAsText,
      quantity: ing.quantity ? String(ing.quantity) : undefined,
      unit: ing.unit,
      product: ing.product,
    })),
    tags: r.tags ?? [],
  }));

  return { recipes, total: response.data.total ?? recipes.length };
}

export async function getRecipe(recipeId: string, userToken?: string): Promise<AHRecipe> {
  const token = userToken || (await getAnonymousToken());

  const response = await axios.get(`${BASE_URL}/gatekeeper/recipe/v1/recipes/${recipeId}`, {
    headers: authHeader(token),
  });

  const r = response.data;
  return {
    id: String(r.id),
    title: r.title,
    description: r.description,
    cookTime: r.cookTime,
    servings: r.servings,
    images: r.images ?? [],
    ingredients: (r.ingredients ?? []).map((ing: any) => ({
      id: ing.product?.id,
      name: ing.name ?? ing.nameAsText,
      quantity: ing.quantity ? String(ing.quantity) : undefined,
      unit: ing.unit,
      product: ing.product,
    })),
    tags: r.tags ?? [],
  };
}

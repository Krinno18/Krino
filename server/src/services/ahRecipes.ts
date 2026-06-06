import axios from 'axios';
import { getAnonymousToken } from './ahAuth.js';
import { AHRecipe } from '../types.js';

const BASE_URL = 'https://api.ah.nl';

interface RecipeSearchResponse {
  recipes: AHRecipe[];
  total: number;
}

function ahHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'Appie/8.22.3',
    'X-Application': 'AHWEBSHOP',
  };
}

function mapRecipe(r: any): AHRecipe {
  return {
    id: String(r.id ?? r.recipeId),
    title: r.title ?? r.name,
    description: r.description ?? r.subtitle,
    cookTime: r.cookTime ?? r.preparationTime,
    servings: r.servings ?? r.numberOfServings,
    images: r.images ?? (r.image ? [r.image] : []),
    ingredients: (r.ingredients ?? r.ingredientGroups?.flatMap((g: any) => g.ingredients) ?? []).map((ing: any) => ({
      id: ing.product?.id ?? ing.webshopId,
      name: ing.name ?? ing.nameAsText ?? ing.description,
      quantity: ing.quantity ? String(ing.quantity) : undefined,
      unit: ing.unit,
      product: ing.product,
    })),
    tags: r.tags ?? r.cuisines ?? [],
  };
}

const RECIPE_ENDPOINTS = [
  `${BASE_URL}/mobile-services/recipe/v1/recipe-suggestions`,
  `${BASE_URL}/gatekeeper/recipe/v1/recipe-suggestions`,
  `${BASE_URL}/mobile-services/recipe/v2/recipe-suggestions`,
  `${BASE_URL}/gatekeeper/recipe/v2/recipe-suggestions`,
];

async function tryRecipeSearch(query: string, size: number, headers: Record<string, string>): Promise<any> {
  for (const url of RECIPE_ENDPOINTS) {
    try {
      const r = await axios.get(url, { params: { query, size }, headers, timeout: 8000 });
      if (r.data && (r.data.recipes?.length > 0 || r.data.content?.length > 0 || r.data.items?.length > 0)) {
        return r.data;
      }
    } catch {
      // try next
    }
  }
  return null;
}

export async function searchRecipes(
  query: string,
  size = 20,
  userToken?: string
): Promise<RecipeSearchResponse> {
  const token = userToken || (await getAnonymousToken());
  const headers = ahHeaders(token);

  const data = await tryRecipeSearch(query, size, headers);
  if (!data) {
    return { recipes: [], total: 0 };
  }

  const raw: any[] = data.recipes ?? data.content ?? data.items ?? [];
  const recipes = raw.map(mapRecipe);
  return { recipes, total: data.total ?? data.totalElements ?? recipes.length };
}

export async function getRecipe(recipeId: string, userToken?: string): Promise<AHRecipe> {
  const token = userToken || (await getAnonymousToken());
  const headers = ahHeaders(token);

  for (const base of [
    `${BASE_URL}/mobile-services/recipe/v1/recipes`,
    `${BASE_URL}/gatekeeper/recipe/v1/recipes`,
  ]) {
    try {
      const response = await axios.get(`${base}/${recipeId}`, { headers, timeout: 8000 });
      const r = response.data.recipe ?? response.data;
      return mapRecipe(r);
    } catch {
      // try next
    }
  }

  throw new Error(`Recipe ${recipeId} not found`);
}

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

function mapAHRecipe(r: any): AHRecipe {
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

// MealDB fallback: free, no API key needed
async function searchMealDB(query: string, size: number): Promise<RecipeSearchResponse> {
  const r = await axios.get(`https://www.themealdb.com/api/json/v1/1/search.php`, {
    params: { s: query },
    timeout: 8000,
  });
  const meals: any[] = r.data?.meals ?? [];
  const recipes: AHRecipe[] = meals.slice(0, size).map((m) => ({
    id: `mealdb-${m.idMeal}`,
    title: m.strMeal,
    description: m.strInstructions?.substring(0, 200),
    cookTime: undefined,
    servings: 4,
    images: m.strMealThumb ? [{ url: m.strMealThumb }] : [],
    ingredients: buildMealDBIngredients(m),
    tags: m.strTags ? m.strTags.split(',').map((t: string) => t.trim()) : [],
  }));
  return { recipes, total: meals.length };
}

function buildMealDBIngredients(m: any): AHRecipe['ingredients'] {
  const result = [];
  for (let i = 1; i <= 20; i++) {
    const name = m[`strIngredient${i}`];
    const measure = m[`strMeasure${i}`];
    if (name?.trim()) {
      result.push({ name: name.trim(), quantity: measure?.trim() || undefined });
    }
  }
  return result;
}

async function getMealDBRecipe(mealId: string): Promise<AHRecipe> {
  const r = await axios.get(`https://www.themealdb.com/api/json/v1/1/lookup.php`, {
    params: { i: mealId },
    timeout: 8000,
  });
  const m = r.data?.meals?.[0];
  if (!m) throw new Error('Recept niet gevonden');
  return {
    id: `mealdb-${m.idMeal}`,
    title: m.strMeal,
    description: m.strInstructions,
    cookTime: undefined,
    servings: 4,
    images: m.strMealThumb ? [{ url: m.strMealThumb }] : [],
    ingredients: buildMealDBIngredients(m),
    tags: m.strTags ? m.strTags.split(',').map((t: string) => t.trim()) : [],
  };
}

const AH_RECIPE_ENDPOINTS = [
  `${BASE_URL}/mobile-services/recipe/v1/recipe-suggestions`,
  `${BASE_URL}/gatekeeper/recipe/v1/recipe-suggestions`,
  `${BASE_URL}/mobile-services/recipe/v2/recipe-suggestions`,
  `${BASE_URL}/gatekeeper/recipe/v2/recipe-suggestions`,
];

async function tryAHRecipeSearch(query: string, size: number, token: string): Promise<RecipeSearchResponse | null> {
  for (const url of AH_RECIPE_ENDPOINTS) {
    try {
      const r = await axios.get(url, { params: { query, size }, headers: ahHeaders(token), timeout: 6000 });
      const raw: any[] = r.data.recipes ?? r.data.content ?? r.data.items ?? [];
      if (raw.length > 0) {
        return { recipes: raw.map(mapAHRecipe), total: r.data.total ?? r.data.totalElements ?? raw.length };
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
  try {
    const token = userToken || (await getAnonymousToken());
    const ahResult = await tryAHRecipeSearch(query, size, token);
    if (ahResult && ahResult.recipes.length > 0) return ahResult;
  } catch {
    // fall through to MealDB
  }
  // Fallback to MealDB
  return searchMealDB(query, size);
}

export async function getRecipe(recipeId: string, userToken?: string): Promise<AHRecipe> {
  // MealDB recipe
  if (recipeId.startsWith('mealdb-')) {
    return getMealDBRecipe(recipeId.replace('mealdb-', ''));
  }

  const token = userToken || (await getAnonymousToken());
  const headers = ahHeaders(token);
  for (const base of [
    `${BASE_URL}/mobile-services/recipe/v1/recipes`,
    `${BASE_URL}/gatekeeper/recipe/v1/recipes`,
  ]) {
    try {
      const response = await axios.get(`${base}/${recipeId}`, { headers, timeout: 6000 });
      const r = response.data.recipe ?? response.data;
      return mapAHRecipe(r);
    } catch {
      // try next
    }
  }
  throw new Error(`Recept ${recipeId} niet gevonden`);
}

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

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'nl-NL,nl;q=0.9',
};

function mapAHApiRecipe(r: any): AHRecipe {
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

function mapAHWebRecipe(r: any): AHRecipe {
  const images =
    r.images ?? (r.image?.url ? [{ url: r.image.url }] : r.imageUrl ? [{ url: r.imageUrl }] : []);

  const rawIngredients =
    r.ingredients ??
    r.ingredientGroups?.flatMap((g: any) => g.ingredients) ??
    [];

  return {
    id: `ah-${r.id ?? r.webId ?? r.slug}`,
    title: r.title ?? r.name,
    description: r.description ?? r.subtitle,
    cookTime: r.cookTime ?? r.preparationTime ?? r.totalTime,
    servings: r.servings ?? r.numberOfServings ?? r.portions ?? 4,
    images,
    ingredients: rawIngredients.map((ing: any) => ({
      id: ing.product?.id,
      name: ing.name ?? ing.description ?? ing.nameAsText,
      quantity: ing.quantity != null ? String(ing.quantity) : ing.amount ?? undefined,
      unit: ing.unit ?? ing.unitOfMeasure,
      product: ing.product,
    })),
    tags: r.tags ?? r.categories?.map((c: any) => c.name ?? c) ?? [],
  };
}

// Scrape AH Allerhande website - recipe data is in Next.js __NEXT_DATA__ JSON
async function scrapeAHAllerhandeRecipes(query: string, size: number): Promise<RecipeSearchResponse> {
  const urls = [
    `https://www.ah.nl/allerhande/recepten/zoeken?query=${encodeURIComponent(query)}`,
    `https://www.ah.nl/allerhande/zoeken?query=${encodeURIComponent(query)}`,
  ];

  for (const url of urls) {
    try {
      const response = await axios.get(url, { headers: BROWSER_HEADERS, timeout: 12000 });
      const html = response.data as string;

      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
      if (!match) continue;

      const nextData = JSON.parse(match[1]);
      const pageProps = nextData?.props?.pageProps ?? {};

      // Try all known paths within pageProps
      const candidates = [
        pageProps?.recipes?.items,
        pageProps?.recipes,
        pageProps?.searchResults?.recipes,
        pageProps?.searchResults?.items,
        pageProps?.data?.recipes?.items,
        pageProps?.data?.recipes,
        pageProps?.initialState?.recipes?.items,
        pageProps?.dehydratedState?.queries?.[0]?.state?.data?.recipes?.items,
        pageProps?.dehydratedState?.queries?.[0]?.state?.data?.items,
      ];

      for (const candidate of candidates) {
        if (Array.isArray(candidate) && candidate.length > 0) {
          const recipes = candidate.slice(0, size).map(mapAHWebRecipe);
          const total =
            pageProps?.recipes?.total ??
            pageProps?.searchResults?.total ??
            pageProps?.total ??
            candidate.length;
          return { recipes, total };
        }
      }
    } catch {
      // try next url
    }
  }
  return { recipes: [], total: 0 };
}

// Export for debug endpoint
export async function debugAllerhandeNextData(query: string): Promise<any> {
  const url = `https://www.ah.nl/allerhande/recepten/zoeken?query=${encodeURIComponent(query)}`;
  const response = await axios.get(url, { headers: BROWSER_HEADERS, timeout: 12000 });
  const html = response.data as string;
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return { error: '__NEXT_DATA__ niet gevonden in HTML', htmlSnippet: html.substring(0, 500) };
  const nextData = JSON.parse(match[1]);
  const pageProps = nextData?.props?.pageProps ?? {};
  return {
    pagePropsKeys: Object.keys(pageProps),
    recipesKey: pageProps.recipes ? { type: typeof pageProps.recipes, isArray: Array.isArray(pageProps.recipes), keys: Array.isArray(pageProps.recipes) ? pageProps.recipes.length : Object.keys(pageProps.recipes ?? {}) } : 'not found',
    searchResultsKey: pageProps.searchResults ? Object.keys(pageProps.searchResults) : 'not found',
    dataKey: pageProps.data ? Object.keys(pageProps.data) : 'not found',
    dehydratedQueries: pageProps?.dehydratedState?.queries?.length ?? 0,
    firstQueryDataKeys: Object.keys(pageProps?.dehydratedState?.queries?.[0]?.state?.data ?? {}),
    sample: JSON.stringify(pageProps).substring(0, 800),
  };
}

// MealDB fallback
async function searchMealDB(query: string, size: number): Promise<RecipeSearchResponse> {
  const r = await axios.get(`https://www.themealdb.com/api/json/v1/1/search.php`, {
    params: { s: query },
    timeout: 8000,
  });
  const meals: any[] = r.data?.meals ?? [];
  const recipes: AHRecipe[] = meals.slice(0, size).map((m) => ({
    id: `mealdb-${m.idMeal}`,
    title: m.strMeal,
    description: m.strInstructions?.substring(0, 250),
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
    if (name?.trim()) result.push({ name: name.trim(), quantity: measure?.trim() || undefined });
  }
  return result;
}

const AH_API_ENDPOINTS = [
  `${BASE_URL}/mobile-services/recipe/v1/recipe-suggestions`,
  `${BASE_URL}/gatekeeper/recipe/v1/recipe-suggestions`,
];

async function tryAHApiSearch(query: string, size: number, token: string): Promise<RecipeSearchResponse | null> {
  for (const url of AH_API_ENDPOINTS) {
    try {
      const r = await axios.get(url, { params: { query, size }, headers: ahHeaders(token), timeout: 5000 });
      const raw: any[] = r.data.recipes ?? r.data.content ?? r.data.items ?? [];
      if (raw.length > 0) {
        return { recipes: raw.map(mapAHApiRecipe), total: r.data.total ?? raw.length };
      }
    } catch { /* try next */ }
  }
  return null;
}

export async function searchRecipes(query: string, size = 20, userToken?: string): Promise<RecipeSearchResponse> {
  // 1. Try AH mobile API (often 404, but try first for authenticated users)
  try {
    const token = userToken || (await getAnonymousToken());
    const apiResult = await tryAHApiSearch(query, size, token);
    if (apiResult && apiResult.recipes.length > 0) return apiResult;
  } catch { /* fall through */ }

  // 2. Scrape AH Allerhande website
  try {
    const webResult = await scrapeAHAllerhandeRecipes(query, size);
    if (webResult.recipes.length > 0) return webResult;
  } catch { /* fall through */ }

  // 3. MealDB fallback
  return searchMealDB(query, size);
}

export async function getRecipe(recipeId: string, userToken?: string): Promise<AHRecipe> {
  if (recipeId.startsWith('mealdb-')) {
    const r = await axios.get(`https://www.themealdb.com/api/json/v1/1/lookup.php`, {
      params: { i: recipeId.replace('mealdb-', '') },
      timeout: 8000,
    });
    const m = r.data?.meals?.[0];
    if (!m) throw new Error('Recept niet gevonden');
    return {
      id: recipeId,
      title: m.strMeal,
      description: m.strInstructions,
      cookTime: undefined,
      servings: 4,
      images: m.strMealThumb ? [{ url: m.strMealThumb }] : [],
      ingredients: buildMealDBIngredients(m),
      tags: m.strTags ? m.strTags.split(',').map((t: string) => t.trim()) : [],
    };
  }

  if (recipeId.startsWith('ah-')) {
    // Try to scrape the specific recipe page
    const slug = recipeId.replace('ah-', '');
    try {
      const response = await axios.get(`https://www.ah.nl/allerhande/recept/${slug}`, {
        headers: BROWSER_HEADERS,
        timeout: 12000,
      });
      const html = response.data as string;
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
      if (match) {
        const nextData = JSON.parse(match[1]);
        const r = nextData?.props?.pageProps?.recipe ?? nextData?.props?.pageProps?.data?.recipe;
        if (r) return mapAHWebRecipe(r);
      }
    } catch { /* fall through */ }
  }

  const token = userToken || (await getAnonymousToken());
  for (const base of [`${BASE_URL}/mobile-services/recipe/v1/recipes`, `${BASE_URL}/gatekeeper/recipe/v1/recipes`]) {
    try {
      const response = await axios.get(`${base}/${recipeId}`, { headers: ahHeaders(token), timeout: 6000 });
      const r = response.data.recipe ?? response.data;
      return mapAHApiRecipe(r);
    } catch { /* try next */ }
  }
  throw new Error(`Recept ${recipeId} niet gevonden`);
}

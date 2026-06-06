import { Router, Request, Response } from 'express';
import axios from 'axios';
import { searchRecipes, getRecipe } from '../services/ahRecipes.js';
import { AHRecipe, AHRecipeIngredient } from '../types.js';

const router = Router();

// --- Helpers for URL recipe import ---

function findRecipeInJsonLd(data: any): any {
  if (!data) return null;
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeInJsonLd(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof data === 'object') {
    const type = data['@type'];
    if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) return data;
    if (data['@graph']) return findRecipeInJsonLd(data['@graph']);
  }
  return null;
}

function parseDurationMinutes(iso?: string): number | undefined {
  if (!iso) return undefined;
  const match = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return undefined;
  const days = parseInt(match[1] || '0');
  const hours = parseInt(match[2] || '0');
  const mins = parseInt(match[3] || '0');
  const total = days * 24 * 60 + hours * 60 + mins;
  return total > 0 ? total : undefined;
}

function extractIngredientText(item: any): string {
  if (typeof item === 'string') return item.trim();
  if (typeof item === 'object') return (item.name ?? item.text ?? JSON.stringify(item)).trim();
  return String(item).trim();
}

function mapJsonLdRecipe(r: any, sourceUrl: string): AHRecipe {
  const rawIngredients: any[] = r.recipeIngredient ?? r.ingredients ?? [];
  const ingredients: AHRecipeIngredient[] = rawIngredients
    .map(extractIngredientText)
    .filter(Boolean)
    .map((text) => ({ name: text }));

  const cookTime =
    parseDurationMinutes(r.totalTime) ??
    parseDurationMinutes(r.cookTime) ??
    parseDurationMinutes(r.prepTime);

  const servings = parseInt(r.recipeYield ?? r.yield ?? '0') || undefined;

  const images: Array<{ url: string }> = [];
  if (typeof r.image === 'string') images.push({ url: r.image });
  else if (Array.isArray(r.image)) images.push(...r.image.map((i: any) => ({ url: typeof i === 'string' ? i : i.url ?? '' })).filter((i: any) => i.url));
  else if (r.image?.url) images.push({ url: r.image.url });

  return {
    id: `url-${encodeURIComponent(sourceUrl)}`,
    title: r.name ?? 'Geïmporteerd recept',
    description: typeof r.description === 'string' ? r.description.substring(0, 400) : undefined,
    cookTime,
    servings,
    images,
    ingredients,
    tags: [],
  };
}

// --- Routes ---

router.get('/search', async (req: Request, res: Response) => {
  const { q, size = '20' } = req.query;
  if (!q) { res.status(400).json({ error: 'Zoekterm vereist' }); return; }
  try {
    const result = await searchRecipes(q as string, Number(size), req.session.ahTokens?.access_token);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Recepten zoeken mislukt', detail: err.message });
  }
});

router.post('/from-url', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url?.trim()) { res.status(400).json({ error: 'URL vereist' }); return; }

  let targetUrl: string;
  try {
    const parsed = new URL(url.trim());
    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Alleen http/https links zijn toegestaan');
    targetUrl = parsed.toString();
  } catch {
    res.status(400).json({ error: 'Ongeldige URL' });
    return;
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
      },
      timeout: 12000,
      maxRedirects: 5,
    });

    const html: string = response.data;

    // Extract all JSON-LD blocks
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        const recipeData = findRecipeInJsonLd(parsed);
        if (recipeData) {
          const recipe = mapJsonLdRecipe(recipeData, targetUrl);
          if (recipe.ingredients.length > 0) {
            res.json(recipe);
            return;
          }
        }
      } catch { /* try next block */ }
    }

    // Fallback: check for AH Allerhande Next.js data
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const pageProps = nextData?.props?.pageProps ?? {};
        const r = pageProps?.recipe ?? pageProps?.data?.recipe;
        if (r?.ingredients?.length) {
          const recipe = mapJsonLdRecipe({
            name: r.title ?? r.name,
            description: r.description,
            totalTime: r.cookTime ? `PT${r.cookTime}M` : undefined,
            recipeYield: r.servings ?? r.numberOfServings,
            image: r.images?.[0]?.url,
            recipeIngredient: (r.ingredients ?? r.ingredientGroups?.flatMap((g: any) => g.ingredients) ?? []).map((ing: any) => ing.name ?? ing.nameAsText ?? ing.description),
          }, targetUrl);
          if (recipe.ingredients.length > 0) { res.json(recipe); return; }
        }
      } catch { /* ignore */ }
    }

    res.status(422).json({ error: 'Geen recept gevonden op deze pagina. Probeer een andere link.' });
  } catch (err: any) {
    if (err.response?.status === 403) {
      res.status(422).json({ error: 'Deze website blokkeert automatisch ophalen. Kopieer de ingrediënten handmatig.' });
    } else if (err.code === 'ECONNABORTED') {
      res.status(422).json({ error: 'Pagina laden duurde te lang. Probeer het opnieuw.' });
    } else {
      res.status(500).json({ error: 'Kon pagina niet ophalen', detail: err.message });
    }
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const recipe = await getRecipe(req.params.id, req.session.ahTokens?.access_token);
    res.json(recipe);
  } catch (err: any) {
    res.status(500).json({ error: 'Recept ophalen mislukt', detail: err.message });
  }
});

export default router;

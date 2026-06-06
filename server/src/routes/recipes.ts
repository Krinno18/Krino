import { Router, Request, Response } from 'express';
import { searchRecipes, getRecipe } from '../services/ahRecipes.js';

const router = Router();

router.get('/search', async (req: Request, res: Response) => {
  const { q, size = '20' } = req.query;

  if (!q) {
    res.status(400).json({ error: 'Zoekterm vereist' });
    return;
  }

  try {
    const userToken = req.session.ahTokens?.access_token;
    const result = await searchRecipes(q as string, Number(size), userToken);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Recepten zoeken mislukt', detail: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userToken = req.session.ahTokens?.access_token;
    const recipe = await getRecipe(req.params.id, userToken);
    res.json(recipe);
  } catch (err: any) {
    res.status(500).json({ error: 'Recept ophalen mislukt', detail: err.message });
  }
});

export default router;

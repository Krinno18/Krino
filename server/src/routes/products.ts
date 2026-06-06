import { Router, Request, Response } from 'express';
import { searchProducts, getBonusProducts, getProduct } from '../services/ahProducts.js';

const router = Router();

router.get('/search', async (req: Request, res: Response) => {
  const { q, page = '0', size = '20' } = req.query;

  if (!q) {
    res.status(400).json({ error: 'Zoekterm vereist' });
    return;
  }

  try {
    const userToken = req.session.ahTokens?.access_token;
    const result = await searchProducts(
      q as string,
      Number(page),
      Number(size),
      userToken
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Producten zoeken mislukt', detail: err.message });
  }
});

router.get('/bonus', async (req: Request, res: Response) => {
  const { page = '0', size = '20' } = req.query;
  try {
    const userToken = req.session.ahTokens?.access_token;
    const result = await getBonusProducts(Number(page), Number(size), userToken);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Bonus producten ophalen mislukt', detail: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userToken = req.session.ahTokens?.access_token;
    const product = await getProduct(Number(req.params.id), userToken);
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: 'Product ophalen mislukt', detail: err.message });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import db from '../db/database.js';
import { requireAHAuth } from '../middleware/auth.js';
import {
  getAHShoppingLists,
  createAHShoppingList,
  addItemToAHList,
  clearAHList,
} from '../services/ahLists.js';
import { GroceryList } from '../types.js';

const router = Router();

function listWithItems(listId: number): GroceryList | undefined {
  const list = db.getList(listId);
  if (!list) return undefined;
  return { ...list, items: db.getItems(listId) };
}

router.get('/', (_req: Request, res: Response) => {
  const lists = db.getAllLists().map((l) => ({ ...l, items: db.getItems(l.id) }));
  res.json(lists);
});

router.get('/:id', (req: Request, res: Response) => {
  const list = listWithItems(Number(req.params.id));
  if (!list) { res.status(404).json({ error: 'Lijst niet gevonden' }); return; }
  res.json(list);
});

router.post('/', (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: 'Naam vereist' }); return; }
  const list = db.createList(name.trim());
  res.status(201).json({ ...list, items: [] });
});

router.put('/:id', (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: 'Naam vereist' }); return; }
  const list = db.updateList(Number(req.params.id), name.trim());
  if (!list) { res.status(404).json({ error: 'Lijst niet gevonden' }); return; }
  res.json(listWithItems(list.id));
});

router.delete('/:id', (req: Request, res: Response) => {
  const ok = db.deleteList(Number(req.params.id));
  if (!ok) { res.status(404).json({ error: 'Lijst niet gevonden' }); return; }
  res.status(204).send();
});

router.post('/:id/items', (req: Request, res: Response) => {
  const { name, quantity = 1, unit, ah_product_id } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: 'Naam vereist' }); return; }
  if (!db.getList(Number(req.params.id))) { res.status(404).json({ error: 'Lijst niet gevonden' }); return; }
  const item = db.addItem(Number(req.params.id), name.trim(), quantity, unit, ah_product_id);
  res.status(201).json(item);
});

router.post('/:id/items/bulk', (req: Request, res: Response) => {
  const { items } = req.body as {
    items: Array<{ name: string; quantity?: number; unit?: string; ah_product_id?: number }>;
  };
  if (!Array.isArray(items) || items.length === 0) { res.status(400).json({ error: 'Items vereist' }); return; }
  if (!db.getList(Number(req.params.id))) { res.status(404).json({ error: 'Lijst niet gevonden' }); return; }

  for (const item of items) {
    if (item.name?.trim()) {
      db.addItem(Number(req.params.id), item.name.trim(), item.quantity ?? 1, item.unit, item.ah_product_id);
    }
  }
  res.status(201).json(listWithItems(Number(req.params.id)));
});

router.put('/:id/items/:itemId', (req: Request, res: Response) => {
  const { name, quantity, unit, checked } = req.body;
  const item = db.updateItem(Number(req.params.itemId), { name, quantity, unit, checked });
  if (!item) { res.status(404).json({ error: 'Item niet gevonden' }); return; }
  db.touchList(Number(req.params.id));
  res.json(item);
});

router.delete('/:id/items/:itemId', (req: Request, res: Response) => {
  const ok = db.deleteItem(Number(req.params.itemId), Number(req.params.id));
  if (!ok) { res.status(404).json({ error: 'Item niet gevonden' }); return; }
  res.status(204).send();
});

router.post('/:id/sync', requireAHAuth, async (req: Request, res: Response) => {
  const list = listWithItems(Number(req.params.id));
  if (!list) { res.status(404).json({ error: 'Lijst niet gevonden' }); return; }

  try {
    const tokens = req.session.ahTokens!;
    let ahListId = list.ah_list_id;

    if (!ahListId) {
      const ahList = await createAHShoppingList(tokens, list.name);
      ahListId = ahList.id;
      db.updateListAHId(list.id, ahListId);
    } else {
      await clearAHList(tokens, ahListId);
    }

    for (const item of list.items.filter((i) => !i.checked)) {
      await addItemToAHList(tokens, ahListId, {
        productId: item.ah_product_id,
        description: item.name,
        quantity: item.quantity,
        unit: item.unit,
      });
    }

    res.json({ success: true, ahListId });
  } catch (err: any) {
    res.status(500).json({ error: 'Synchroniseren mislukt', detail: err.message });
  }
});

export default router;

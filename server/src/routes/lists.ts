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

// --- Template routes (must be defined before /:id routes) ---

router.get('/template', (_req: Request, res: Response) => {
  res.json(db.getTemplateItems());
});

router.post('/template/items', (req: Request, res: Response) => {
  const { name, quantity = 1, unit } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: 'Naam vereist' }); return; }
  const item = db.addTemplateItem(name.trim(), Number(quantity) || 1, unit?.trim() || undefined);
  res.status(201).json(item);
});

router.delete('/template/items', (_req: Request, res: Response) => {
  db.clearTemplateItems();
  res.status(204).send();
});

router.delete('/template/items/:id', (req: Request, res: Response) => {
  const ok = db.removeTemplateItem(Number(req.params.id));
  if (!ok) { res.status(404).json({ error: 'Item niet gevonden' }); return; }
  res.status(204).send();
});

// --- List CRUD ---

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
  const { name, fromTemplate, copyFromId } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: 'Naam vereist' }); return; }

  let list;
  if (fromTemplate) {
    list = db.createListFromTemplate(name.trim());
  } else {
    list = db.createList(name.trim());
  }

  if (copyFromId && Number(copyFromId) !== list.id) {
    db.copyItemsToList(list.id, Number(copyFromId));
  }

  res.status(201).json(listWithItems(list.id));
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

// --- Items ---

router.post('/:id/items', (req: Request, res: Response) => {
  const listId = Number(req.params.id);
  const { name, quantity = 1, unit, ah_product_id } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: 'Naam vereist' }); return; }
  if (!db.getList(listId)) { res.status(404).json({ error: 'Lijst niet gevonden' }); return; }
  const item = db.addItem(listId, name.trim(), Number(quantity) || 1, unit?.trim() || undefined, ah_product_id);
  res.status(201).json(item);
});

router.post('/:id/items/bulk', (req: Request, res: Response) => {
  const listId = Number(req.params.id);
  const { items } = req.body as {
    items: Array<{ name: string; quantity?: number; unit?: string; ah_product_id?: number }>;
  };
  if (!Array.isArray(items) || items.length === 0) { res.status(400).json({ error: 'Items vereist' }); return; }
  if (!db.getList(listId)) { res.status(404).json({ error: 'Lijst niet gevonden' }); return; }
  for (const item of items) {
    if (item.name?.trim()) {
      db.addItem(listId, item.name.trim(), item.quantity ?? 1, item.unit?.trim() || undefined, item.ah_product_id);
    }
  }
  res.status(201).json(listWithItems(listId));
});

router.put('/:id/items/:itemId', (req: Request, res: Response) => {
  const { name, quantity, unit, checked } = req.body;
  const item = db.updateItem(Number(req.params.itemId), { name, quantity, unit, checked });
  if (!item) { res.status(404).json({ error: 'Item niet gevonden' }); return; }
  db.touchList(Number(req.params.id));
  res.json(item);
});

router.delete('/:id/items/checked', (req: Request, res: Response) => {
  const listId = Number(req.params.id);
  if (!db.getList(listId)) { res.status(404).json({ error: 'Lijst niet gevonden' }); return; }
  const removed = db.deleteCheckedItems(listId);
  res.json({ removed, list: listWithItems(listId) });
});

router.delete('/:id/items/:itemId', (req: Request, res: Response) => {
  const ok = db.deleteItem(Number(req.params.itemId), Number(req.params.id));
  if (!ok) { res.status(404).json({ error: 'Item niet gevonden' }); return; }
  res.status(204).send();
});

// --- Copy items from another list ---

router.post('/:id/copy-from/:sourceId', (req: Request, res: Response) => {
  const targetId = Number(req.params.id);
  const sourceId = Number(req.params.sourceId);
  if (!db.getList(targetId)) { res.status(404).json({ error: 'Doellijst niet gevonden' }); return; }
  if (!db.getList(sourceId)) { res.status(404).json({ error: 'Bronlijst niet gevonden' }); return; }
  const { itemIds } = req.body as { itemIds?: number[] };
  const count = db.copyItemsToList(targetId, sourceId, itemIds);
  res.json({ success: true, itemsCopied: count, list: listWithItems(targetId) });
});

// --- AH Sync ---

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

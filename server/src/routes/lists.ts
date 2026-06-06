import { Router, Request, Response } from 'express';
import db from '../db/database.js';
import { requireAHAuth } from '../middleware/auth.js';
import {
  getAHShoppingLists,
  createAHShoppingList,
  addItemToAHList,
  clearAHList,
} from '../services/ahLists.js';
import { GroceryList, GroceryListItem } from '../types.js';

const router = Router();

function getListWithItems(listId: number): GroceryList | undefined {
  const list = db
    .prepare('SELECT * FROM grocery_lists WHERE id = ?')
    .get(listId) as Omit<GroceryList, 'items'> | undefined;

  if (!list) return undefined;

  const items = db
    .prepare('SELECT * FROM grocery_list_items WHERE list_id = ? ORDER BY id')
    .all(listId) as GroceryListItem[];

  return { ...list, items };
}

// GET all lists
router.get('/', (req: Request, res: Response) => {
  const lists = db
    .prepare('SELECT * FROM grocery_lists ORDER BY updated_at DESC')
    .all() as Omit<GroceryList, 'items'>[];

  const listsWithItems = lists.map((list) => getListWithItems(list.id)!);
  res.json(listsWithItems);
});

// GET single list
router.get('/:id', (req: Request, res: Response) => {
  const list = getListWithItems(Number(req.params.id));
  if (!list) {
    res.status(404).json({ error: 'Lijst niet gevonden' });
    return;
  }
  res.json(list);
});

// POST create list
router.post('/', (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ error: 'Naam vereist' });
    return;
  }

  const result = db
    .prepare('INSERT INTO grocery_lists (name) VALUES (?)')
    .run(name.trim());

  res.status(201).json(getListWithItems(result.lastInsertRowid as number));
});

// PUT update list name
router.put('/:id', (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ error: 'Naam vereist' });
    return;
  }

  const result = db
    .prepare("UPDATE grocery_lists SET name = ?, updated_at = datetime('now') WHERE id = ?")
    .run(name.trim(), req.params.id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Lijst niet gevonden' });
    return;
  }
  res.json(getListWithItems(Number(req.params.id)));
});

// DELETE list
router.delete('/:id', (req: Request, res: Response) => {
  const result = db
    .prepare('DELETE FROM grocery_lists WHERE id = ?')
    .run(req.params.id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Lijst niet gevonden' });
    return;
  }
  res.status(204).send();
});

// POST add item
router.post('/:id/items', (req: Request, res: Response) => {
  const { name, quantity = 1, unit, ah_product_id } = req.body;

  if (!name?.trim()) {
    res.status(400).json({ error: 'Naam vereist' });
    return;
  }

  const list = db.prepare('SELECT id FROM grocery_lists WHERE id = ?').get(req.params.id);
  if (!list) {
    res.status(404).json({ error: 'Lijst niet gevonden' });
    return;
  }

  const result = db
    .prepare(
      'INSERT INTO grocery_list_items (list_id, name, quantity, unit, ah_product_id) VALUES (?, ?, ?, ?, ?)'
    )
    .run(req.params.id, name.trim(), quantity, unit ?? null, ah_product_id ?? null);

  db.prepare("UPDATE grocery_lists SET updated_at = datetime('now') WHERE id = ?").run(
    req.params.id
  );

  const item = db
    .prepare('SELECT * FROM grocery_list_items WHERE id = ?')
    .get(result.lastInsertRowid);

  res.status(201).json(item);
});

// POST add multiple items at once (e.g. from recipe)
router.post('/:id/items/bulk', (req: Request, res: Response) => {
  const { items } = req.body as {
    items: Array<{ name: string; quantity?: number; unit?: string; ah_product_id?: number }>;
  };

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Items vereist' });
    return;
  }

  const list = db.prepare('SELECT id FROM grocery_lists WHERE id = ?').get(req.params.id);
  if (!list) {
    res.status(404).json({ error: 'Lijst niet gevonden' });
    return;
  }

  const insert = db.prepare(
    'INSERT INTO grocery_list_items (list_id, name, quantity, unit, ah_product_id) VALUES (?, ?, ?, ?, ?)'
  );

  const insertMany = db.transaction(() => {
    for (const item of items) {
      if (item.name?.trim()) {
        insert.run(
          req.params.id,
          item.name.trim(),
          item.quantity ?? 1,
          item.unit ?? null,
          item.ah_product_id ?? null
        );
      }
    }
  });

  insertMany();
  db.prepare("UPDATE grocery_lists SET updated_at = datetime('now') WHERE id = ?").run(
    req.params.id
  );

  res.status(201).json(getListWithItems(Number(req.params.id)));
});

// PUT update item
router.put('/:id/items/:itemId', (req: Request, res: Response) => {
  const { name, quantity, unit, checked } = req.body;

  const fields: string[] = [];
  const values: any[] = [];

  if (name !== undefined) { fields.push('name = ?'); values.push(name.trim()); }
  if (quantity !== undefined) { fields.push('quantity = ?'); values.push(quantity); }
  if (unit !== undefined) { fields.push('unit = ?'); values.push(unit); }
  if (checked !== undefined) { fields.push('checked = ?'); values.push(checked ? 1 : 0); }

  if (fields.length === 0) {
    res.status(400).json({ error: 'Geen velden om bij te werken' });
    return;
  }

  values.push(req.params.itemId);
  const result = db
    .prepare(`UPDATE grocery_list_items SET ${fields.join(', ')} WHERE id = ?`)
    .run(...values);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Item niet gevonden' });
    return;
  }

  db.prepare("UPDATE grocery_lists SET updated_at = datetime('now') WHERE id = ?").run(
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM grocery_list_items WHERE id = ?').get(req.params.itemId));
});

// DELETE item
router.delete('/:id/items/:itemId', (req: Request, res: Response) => {
  const result = db
    .prepare('DELETE FROM grocery_list_items WHERE id = ? AND list_id = ?')
    .run(req.params.itemId, req.params.id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Item niet gevonden' });
    return;
  }

  db.prepare("UPDATE grocery_lists SET updated_at = datetime('now') WHERE id = ?").run(
    req.params.id
  );
  res.status(204).send();
});

// POST sync list to AH account
router.post('/:id/sync', requireAHAuth, async (req: Request, res: Response) => {
  const list = getListWithItems(Number(req.params.id));
  if (!list) {
    res.status(404).json({ error: 'Lijst niet gevonden' });
    return;
  }

  try {
    const tokens = req.session.ahTokens!;
    let ahListId = list.ah_list_id;

    if (!ahListId) {
      const ahList = await createAHShoppingList(tokens, list.name);
      ahListId = ahList.id;
      db.prepare('UPDATE grocery_lists SET ah_list_id = ? WHERE id = ?').run(ahListId, list.id);
    } else {
      await clearAHList(tokens, ahListId);
    }

    for (const item of list.items.filter((i) => !i.checked)) {
      await addItemToAHList(tokens, ahListId, {
        productId: item.ah_product_id ?? undefined,
        description: item.name,
        quantity: item.quantity,
        unit: item.unit ?? undefined,
      });
    }

    res.json({ success: true, ahListId });
  } catch (err: any) {
    res.status(500).json({ error: 'Synchroniseren mislukt', detail: err.message });
  }
});

export default router;

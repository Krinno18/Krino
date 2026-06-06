import { GroceryList, GroceryListItem } from '../types.js';

// In-memory database — werkt in alle omgevingen zonder native modules
interface StoredList extends Omit<GroceryList, 'items'> {}

const store = {
  lists: [] as StoredList[],
  items: [] as GroceryListItem[],
  listIdCounter: 1,
  itemIdCounter: 1,
};

function now() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

export const db = {
  getAllLists(): StoredList[] {
    return [...store.lists].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  },

  getList(id: number): StoredList | undefined {
    return store.lists.find((l) => l.id === id);
  },

  getItems(listId: number): GroceryListItem[] {
    return store.items.filter((i) => i.list_id === listId).sort((a, b) => a.id - b.id);
  },

  createList(name: string): StoredList {
    const list: StoredList = {
      id: store.listIdCounter++,
      name,
      created_at: now(),
      updated_at: now(),
    };
    store.lists.push(list);
    return list;
  },

  updateList(id: number, name: string): StoredList | undefined {
    const list = store.lists.find((l) => l.id === id);
    if (!list) return undefined;
    list.name = name;
    list.updated_at = now();
    return list;
  },

  updateListAHId(id: number, ahListId: string): void {
    const list = store.lists.find((l) => l.id === id);
    if (list) list.ah_list_id = ahListId;
  },

  deleteList(id: number): boolean {
    const idx = store.lists.findIndex((l) => l.id === id);
    if (idx === -1) return false;
    store.lists.splice(idx, 1);
    store.items = store.items.filter((i) => i.list_id !== id);
    return true;
  },

  addItem(
    listId: number,
    name: string,
    quantity: number,
    unit?: string,
    ahProductId?: number
  ): GroceryListItem {
    const item: GroceryListItem = {
      id: store.itemIdCounter++,
      list_id: listId,
      name,
      quantity,
      unit,
      ah_product_id: ahProductId,
      checked: false,
      created_at: now(),
    };
    store.items.push(item);
    this.touchList(listId);
    return item;
  },

  updateItem(id: number, data: Partial<Pick<GroceryListItem, 'name' | 'quantity' | 'unit' | 'checked'>>): GroceryListItem | undefined {
    const item = store.items.find((i) => i.id === id);
    if (!item) return undefined;
    if (data.name !== undefined) item.name = data.name;
    if (data.quantity !== undefined) item.quantity = data.quantity;
    if (data.unit !== undefined) item.unit = data.unit;
    if (data.checked !== undefined) item.checked = data.checked;
    return item;
  },

  deleteItem(id: number, listId: number): boolean {
    const idx = store.items.findIndex((i) => i.id === id && i.list_id === listId);
    if (idx === -1) return false;
    store.items.splice(idx, 1);
    this.touchList(listId);
    return true;
  },

  touchList(listId: number): void {
    const list = store.lists.find((l) => l.id === listId);
    if (list) list.updated_at = now();
  },
};

export default db;

import axios from 'axios';
import { AHTokens } from '../types.js';
import { refreshTokens } from './ahAuth.js';

const BASE_URL = 'https://api.ah.nl';

interface AHShoppingList {
  id: string;
  description: string;
  items: AHShoppingListItem[];
}

interface AHShoppingListItem {
  id: string;
  quantity: number;
  unit?: string;
  product?: { id: number; title: string };
  description?: string;
}

async function getValidToken(tokens: AHTokens): Promise<string> {
  // Attempt to use existing token; caller handles 401 and refreshes if needed
  return tokens.access_token;
}

export async function getAHShoppingLists(tokens: AHTokens): Promise<AHShoppingList[]> {
  const token = await getValidToken(tokens);
  const response = await axios.get(`${BASE_URL}/mobile-services/v1/shoppinglist`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data ?? [];
}

export async function createAHShoppingList(
  tokens: AHTokens,
  name: string
): Promise<AHShoppingList> {
  const token = await getValidToken(tokens);
  const response = await axios.post(
    `${BASE_URL}/mobile-services/v1/shoppinglist`,
    { description: name },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  return response.data;
}

export async function addItemToAHList(
  tokens: AHTokens,
  listId: string,
  item: { productId?: number; description: string; quantity: number; unit?: string }
): Promise<void> {
  const token = await getValidToken(tokens);
  await axios.post(
    `${BASE_URL}/mobile-services/v1/shoppinglist/${listId}/items`,
    {
      quantity: item.quantity,
      unit: item.unit,
      description: item.description,
      product: item.productId ? { id: item.productId } : undefined,
    },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
}

export async function clearAHList(tokens: AHTokens, listId: string): Promise<void> {
  const token = await getValidToken(tokens);
  await axios.delete(`${BASE_URL}/mobile-services/v1/shoppinglist/${listId}/items`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

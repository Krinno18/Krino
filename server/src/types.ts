export interface AHTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface AHProduct {
  id: number;
  title: string;
  price?: {
    now: number;
    was?: number;
    unitSize?: string;
  };
  images: Array<{ url: string }>;
  category?: string;
  brand?: string;
  isBonus?: boolean;
  discountLabel?: string;
}

export interface AHRecipe {
  id: string;
  title: string;
  description?: string;
  cookTime?: number;
  servings?: number;
  images: Array<{ url: string }>;
  ingredients: AHRecipeIngredient[];
  tags?: string[];
}

export interface AHRecipeIngredient {
  id?: number;
  name: string;
  quantity?: string;
  unit?: string;
  product?: AHProduct;
}

export interface GroceryList {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  ah_list_id?: string;
  items: GroceryListItem[];
}

export interface GroceryListItem {
  id: number;
  list_id: number;
  name: string;
  quantity: number;
  unit?: string;
  ah_product_id?: number;
  checked: boolean;
  created_at: string;
}

declare module 'express-session' {
  interface SessionData {
    ahTokens?: AHTokens;
    pkceVerifier?: string;
  }
}

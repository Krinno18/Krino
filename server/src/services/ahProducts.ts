import axios from 'axios';
import { getAnonymousToken } from './ahAuth.js';
import { AHProduct } from '../types.js';

const BASE_URL = 'https://api.ah.nl';

interface ProductSearchResponse {
  products: AHProduct[];
  page: {
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
  };
}

function ahHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'Appie/8.22.3',
    'X-Application': 'AHWEBSHOP',
  };
}

function mapProduct(p: any, forceBonus = false): AHProduct {
  // priceBeforeBonus is the original/regular price, currentPrice is the bonus price
  const priceBeforeBonus = p.priceBeforeBonus ?? null;
  const currentPrice = p.currentPrice ?? null;

  let priceNow: number;
  let priceWas: number | undefined;

  if (priceBeforeBonus !== null && currentPrice !== null && currentPrice < priceBeforeBonus) {
    // Classic bonus: lower current price + original price available
    priceNow = currentPrice;
    priceWas = priceBeforeBonus;
  } else if (forceBonus && priceBeforeBonus !== null && currentPrice === null) {
    // Bonus product but only original price known
    priceNow = priceBeforeBonus;
  } else {
    priceNow = currentPrice ?? priceBeforeBonus ?? 0;
  }

  // isBonus: trust the flag, force true for bonus endpoint, or detect via discount labels / price difference
  const isBonus =
    forceBonus ||
    (p.isBonus === true) ||
    (priceWas !== undefined) ||
    (Array.isArray(p.discountLabels) && p.discountLabels.length > 0) ||
    (p.bonus === true);

  return {
    id: p.webshopId ?? p.hqId,
    title: p.title,
    price: {
      now: priceNow,
      was: priceWas,
      unitSize: p.salesUnitSize,
    },
    images: (p.images ?? []).map((img: any) => ({ url: img.url ?? img })),
    brand: p.brand,
    category: p.mainCategory,
    isBonus,
    discountLabel:
      p.discountLabels?.[0]?.defaultDescription ??
      p.discountLabels?.[0]?.description ??
      p.bonusMechanism ??
      p.promotionText,
  };
}

async function fetchProducts(
  params: Record<string, any>,
  userToken?: string,
  forceBonus = false
): Promise<ProductSearchResponse> {
  const token = userToken || (await getAnonymousToken());
  const response = await axios.get(`${BASE_URL}/mobile-services/product/search/v2`, {
    params,
    headers: ahHeaders(token),
  });
  return {
    products: (response.data.products ?? []).map((p: any) => mapProduct(p, forceBonus)),
    page: response.data.page ?? {
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: params.size ?? 20,
    },
  };
}

export async function searchProducts(query: string, page = 0, size = 20, userToken?: string) {
  return fetchProducts({ query, page, size }, userToken, false);
}

export async function getBonusProducts(page = 0, size = 50, userToken?: string) {
  // taxonomyId: 'bonus' targets the weekly AH bonus folder
  // Fallback to bonus:true if taxonomy returns nothing
  try {
    const result = await fetchProducts(
      { taxonomyId: 'bonus', page, size },
      userToken,
      true
    );
    if (result.products.length > 0) return result;
  } catch { /* fall through */ }

  return fetchProducts({ bonus: true, page, size }, userToken, true);
}

export async function getProduct(productId: number, userToken?: string): Promise<AHProduct> {
  const token = userToken || (await getAnonymousToken());
  const response = await axios.get(
    `${BASE_URL}/mobile-services/product/detail/v4/fir/${productId}`,
    { headers: ahHeaders(token) }
  );
  return mapProduct(response.data.productCard ?? response.data);
}

// Returns raw AH data for a bonus product — used to validate field names
export async function debugRawBonusProduct(userToken?: string): Promise<any> {
  const token = userToken || (await getAnonymousToken());
  const response = await axios.get(`${BASE_URL}/mobile-services/product/search/v2`, {
    params: { bonus: true, page: 0, size: 2 },
    headers: ahHeaders(token),
  });
  const products = response.data.products ?? [];
  return {
    total: response.data.page?.totalElements,
    rawFirst: products[0],
    rawSecond: products[1],
  };
}

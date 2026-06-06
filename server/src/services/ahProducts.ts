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

function mapProduct(p: any): AHProduct {
  const originalPrice = p.priceBeforeBonus ?? p.currentPrice ?? 0;
  const bonusPrice = p.currentPrice != null && p.currentPrice < originalPrice
    ? p.currentPrice
    : undefined;

  return {
    id: p.webshopId ?? p.hqId,
    title: p.title,
    price: {
      now: bonusPrice ?? originalPrice,
      was: bonusPrice != null ? originalPrice : undefined,
      unitSize: p.salesUnitSize,
    },
    images: (p.images ?? []).map((img: any) => ({ url: img.url ?? img })),
    brand: p.brand,
    category: p.mainCategory,
    isBonus: p.isBonus ?? false,
    discountLabel: p.discountLabels?.[0]?.defaultDescription,
  };
}

async function fetchProducts(params: Record<string, any>, userToken?: string): Promise<ProductSearchResponse> {
  const token = userToken || (await getAnonymousToken());
  const response = await axios.get(`${BASE_URL}/mobile-services/product/search/v2`, {
    params,
    headers: ahHeaders(token),
  });
  return {
    products: (response.data.products ?? []).map(mapProduct),
    page: response.data.page ?? { totalElements: 0, totalPages: 0, number: 0, size: params.size ?? 20 },
  };
}

export async function searchProducts(query: string, page = 0, size = 20, userToken?: string) {
  return fetchProducts({ query, page, size }, userToken);
}

export async function getBonusProducts(page = 0, size = 40, userToken?: string) {
  return fetchProducts({ bonus: true, page, size }, userToken);
}

export async function getProduct(productId: number, userToken?: string): Promise<AHProduct> {
  const token = userToken || (await getAnonymousToken());
  const response = await axios.get(
    `${BASE_URL}/mobile-services/product/detail/v4/fir/${productId}`,
    { headers: ahHeaders(token) }
  );
  return mapProduct(response.data.productCard ?? response.data);
}

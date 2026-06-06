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
  return {
    id: p.webshopId ?? p.hqId,
    title: p.title,
    price: {
      now: p.currentPrice ?? p.priceBeforeBonus ?? 0,
      unitSize: p.salesUnitSize,
    },
    images: (p.images ?? []).map((img: any) => ({ url: img.url ?? img })),
    brand: p.brand,
    category: p.mainCategory,
    isBonus: p.isBonus,
    discountLabel: p.discountLabels?.[0]?.defaultDescription,
  };
}

export async function searchProducts(
  query: string,
  page = 0,
  size = 20,
  userToken?: string
): Promise<ProductSearchResponse> {
  const token = userToken || (await getAnonymousToken());

  const response = await axios.get(`${BASE_URL}/mobile-services/product/search/v2`, {
    params: { query, page, size },
    headers: ahHeaders(token),
  });

  return {
    products: (response.data.products ?? []).map(mapProduct),
    page: response.data.page ?? { totalElements: 0, totalPages: 0, number: 0, size },
  };
}

export async function getProduct(productId: number, userToken?: string): Promise<AHProduct> {
  const token = userToken || (await getAnonymousToken());

  const response = await axios.get(
    `${BASE_URL}/mobile-services/product/detail/v4/fir/${productId}`,
    { headers: ahHeaders(token) }
  );

  return mapProduct(response.data.productCard ?? response.data);
}

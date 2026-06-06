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

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
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
    headers: authHeader(token),
  });

  return {
    products: response.data.products ?? [],
    page: response.data.page ?? { totalElements: 0, totalPages: 0, number: 0, size },
  };
}

export async function getProduct(productId: number, userToken?: string): Promise<AHProduct> {
  const token = userToken || (await getAnonymousToken());

  const response = await axios.get(
    `${BASE_URL}/mobile-services/product/detail/v4/fir/${productId}`,
    { headers: authHeader(token) }
  );

  return response.data.productCard;
}

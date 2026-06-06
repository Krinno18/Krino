import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../api/products';
import { listsApi } from '../api/lists';
import ProductCard from '../components/Product/ProductCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { AHProduct } from '../types';

interface ProductSearchResult {
  products: AHProduct[];
  page: { totalElements: number; totalPages: number; number: number; size: number };
}

const PAGE_SIZE = 50;

export default function Bonus() {
  const qc = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const { data, isLoading, error } = useQuery<ProductSearchResult>({
    queryKey: ['products-bonus', page],
    queryFn: () => productsApi.getBonus(page, PAGE_SIZE),
    staleTime: 5 * 60_000,
  });

  const { data: lists = [] } = useQuery({
    queryKey: ['lists'],
    queryFn: listsApi.getAll,
  });

  const addMutation = useMutation({
    mutationFn: ({ listId, product }: { listId: number; product: AHProduct }) =>
      listsApi.addItem(listId, { name: product.title, quantity: 1, ah_product_id: product.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lists'] }),
  });

  const categories = useMemo(() => {
    if (!data?.products) return [];
    const cats = new Map<string, number>();
    for (const p of data.products) {
      if (p.category) cats.set(p.category, (cats.get(p.category) ?? 0) + 1);
    }
    return [...cats.entries()].sort((a, b) => b[1] - a[1]).map(([cat, count]) => ({ cat, count }));
  }, [data?.products]);

  const filtered = useMemo(() => {
    if (!data?.products) return [];
    if (!selectedCategory) return data.products;
    return data.products.filter((p: AHProduct) => p.category === selectedCategory);
  }, [data?.products, selectedCategory]);

  const totalPages = data ? Math.ceil(data.page.totalElements / PAGE_SIZE) : 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">🏷️</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonus aanbiedingen</h1>
          <p className="text-gray-500 text-sm">Huidige weekaanbiedingen van Albert Heijn</p>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Bonus aanbiedingen laden..." />
      ) : error ? (
        <div className="text-center py-16 text-red-400">
          <p className="text-4xl mb-3">⚠️</p>
          <p>Kon bonus aanbiedingen niet laden</p>
        </div>
      ) : !data?.products.length ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏷️</p>
          <p>Geen bonus aanbiedingen gevonden</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-3">
              {data.page.totalElements.toLocaleString('nl')} aanbiedingen deze week
              {selectedCategory && ` · ${filtered.length} in "${selectedCategory}"`}
              {' · '}pagina {page + 1} van {totalPages}
            </p>

            {/* Category filters */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    !selectedCategory
                      ? 'bg-ah-orange text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Alle categorieën ({data.products.length})
                </button>
                {categories.map(({ cat, count }) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedCategory === cat
                        ? 'bg-ah-orange text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat} <span className="opacity-70">({count})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Products grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {filtered.map((product: AHProduct) => (
              <ProductCard
                key={product.id}
                product={product}
                lists={lists}
                onAddToList={(listId, prod) => addMutation.mutate({ listId, product: prod })}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && !selectedCategory && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => { setPage((p) => p - 1); setSelectedCategory(null); window.scrollTo(0, 0); }}
                disabled={page === 0}
                className="btn-secondary disabled:opacity-40"
              >
                ← Vorige
              </button>
              <span className="text-sm text-gray-600">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => { setPage((p) => p + 1); setSelectedCategory(null); window.scrollTo(0, 0); }}
                disabled={page >= totalPages - 1}
                className="btn-secondary disabled:opacity-40"
              >
                Volgende →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

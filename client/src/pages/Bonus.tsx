import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../api/products';
import { listsApi } from '../api/lists';
import ProductCard from '../components/Product/ProductCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { AHProduct } from '../types';

export default function Bonus() {
  const qc = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['products-bonus'],
    queryFn: () => productsApi.getBonus(0, 80),
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

  // Extract categories from bonus products only
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
    return data.products.filter((p) => p.category === selectedCategory);
  }, [data?.products, selectedCategory]);

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
          {/* Stats & category filters */}
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-3">
              {data.page.totalElements} aanbiedingen deze week
              {selectedCategory && ` · ${filtered.length} in "${selectedCategory}"`}
            </p>

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
                  Alle categorieën
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                lists={lists}
                onAddToList={(listId, prod) => addMutation.mutate({ listId, product: prod })}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

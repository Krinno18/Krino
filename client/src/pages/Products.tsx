import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../api/products';
import { listsApi } from '../api/lists';
import ProductCard from '../components/Product/ProductCard';
import SearchBar from '../components/common/SearchBar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { AHProduct } from '../types';

const QUICK_SEARCHES = ['melk', 'brood', 'kaas', 'kip', 'pasta', 'groente', 'fruit', 'yoghurt'];

export default function Products() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const qc = useQueryClient();

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['products', query],
    queryFn: () => productsApi.search(query, 0, 40),
    enabled: !!query,
  });

  const { data: lists = [] } = useQuery({
    queryKey: ['lists'],
    queryFn: listsApi.getAll,
  });

  const addMutation = useMutation({
    mutationFn: ({ listId, product }: { listId: number; product: AHProduct }) =>
      listsApi.addItem(listId, { name: product.title, quantity: 1, ah_product_id: product.id }),
    onSuccess: (_, { listId }) => {
      qc.invalidateQueries({ queryKey: ['lists'] });
      const listName = lists.find((l) => l.id === listId)?.name ?? 'lijst';
      setToast(`Toegevoegd aan "${listName}"`);
      setTimeout(() => setToast(''), 2500);
    },
  });

  const categories = useMemo(() => {
    if (!searchData?.products) return [];
    const cats = new Map<string, number>();
    for (const p of searchData.products) {
      if (p.category) cats.set(p.category, (cats.get(p.category) ?? 0) + 1);
    }
    return [...cats.entries()].sort((a, b) => b[1] - a[1]).map(([cat, count]) => ({ cat, count }));
  }, [searchData?.products]);

  const filtered = useMemo(() => {
    if (!searchData?.products) return [];
    if (!selectedCategory) return searchData.products;
    return searchData.products.filter((p) => p.category === selectedCategory);
  }, [searchData?.products, selectedCategory]);

  const handleSearch = (q: string) => {
    setQuery(q);
    setSelectedCategory(null);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Producten zoeken</h1>

      <div className="mb-5">
        <SearchBar
          placeholder="Zoek product (bijv. melk, brood, pasta...)"
          onSearch={handleSearch}
          loading={searchLoading}
        />
        {!query && (
          <div className="flex flex-wrap gap-2 mt-3">
            {QUICK_SEARCHES.map((s) => (
              <button
                key={s}
                onClick={() => handleSearch(s)}
                className="text-xs px-3 py-1 rounded-full bg-gray-100 hover:bg-ah-blue hover:text-white transition-colors capitalize"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{toast}</div>
      )}

      {!query ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p>Zoek een product om te beginnen</p>
        </div>
      ) : searchLoading ? (
        <LoadingSpinner text="Producten zoeken..." />
      ) : !searchData?.products.length ? (
        <div className="text-center py-16 text-gray-400">Geen producten gevonden voor "{query}"</div>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-3">
              {searchData.page.totalElements} producten gevonden voor "{query}"
              {selectedCategory && ` · ${filtered.length} in "${selectedCategory}"`}
            </p>

            {categories.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    !selectedCategory
                      ? 'bg-ah-blue text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Alles ({searchData.products.length})
                </button>
                {categories.map(({ cat, count }) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedCategory === cat
                        ? 'bg-ah-blue text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat} <span className="opacity-70">({count})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

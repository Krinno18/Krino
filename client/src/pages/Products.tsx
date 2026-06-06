import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../api/products';
import { listsApi } from '../api/lists';
import ProductCard from '../components/Product/ProductCard';
import SearchBar from '../components/common/SearchBar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { AHProduct } from '../types';

type Tab = 'zoeken' | 'bonus';

export default function Products() {
  const [tab, setTab] = useState<Tab>('zoeken');
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const qc = useQueryClient();

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['products', query],
    queryFn: () => productsApi.search(query),
    enabled: !!query && tab === 'zoeken',
  });

  const { data: bonusData, isLoading: bonusLoading } = useQuery({
    queryKey: ['products-bonus'],
    queryFn: () => productsApi.getBonus(),
    enabled: tab === 'bonus',
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

  const products = tab === 'bonus' ? bonusData?.products : searchData?.products;
  const isLoading = tab === 'bonus' ? bonusLoading : searchLoading;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Producten</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('zoeken')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'zoeken' ? 'bg-ah-blue text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          🔍 Zoeken
        </button>
        <button
          onClick={() => setTab('bonus')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'bonus' ? 'bg-ah-orange text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          🏷️ Bonus aanbiedingen
        </button>
      </div>

      {tab === 'zoeken' && (
        <div className="mb-6">
          <SearchBar
            placeholder="Zoek product (bijv. melk, brood, pasta...)"
            onSearch={setQuery}
            loading={searchLoading}
          />
        </div>
      )}

      {toast && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{toast}</div>
      )}

      {tab === 'zoeken' && !query ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🛒</p>
          <p>Zoek een product, of bekijk de <button onClick={() => setTab('bonus')} className="text-ah-orange underline">bonus aanbiedingen</button></p>
        </div>
      ) : isLoading ? (
        <LoadingSpinner text={tab === 'bonus' ? 'Bonus aanbiedingen laden...' : 'Producten zoeken...'} />
      ) : !products?.length ? (
        <div className="text-center py-16 text-gray-400">Geen producten gevonden</div>
      ) : (
        <>
          {tab === 'bonus' && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🏷️</span>
              <div>
                <h2 className="font-semibold text-gray-900">Deze week in de bonus</h2>
                <p className="text-sm text-gray-500">{bonusData?.page.totalElements} aanbiedingen</p>
              </div>
            </div>
          )}
          {tab === 'zoeken' && (
            <p className="text-sm text-gray-500 mb-4">
              {searchData?.page.totalElements} producten gevonden voor "{query}"
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
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

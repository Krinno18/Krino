import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../api/products';
import { listsApi } from '../api/lists';
import ProductCard from '../components/Product/ProductCard';
import SearchBar from '../components/common/SearchBar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { AHProduct } from '../types';

export default function Products() {
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['products', query],
    queryFn: () => productsApi.search(query),
    enabled: !!query,
  });

  const { data: lists = [] } = useQuery({
    queryKey: ['lists'],
    queryFn: listsApi.getAll,
  });

  const addMutation = useMutation({
    mutationFn: ({ listId, product }: { listId: number; product: AHProduct }) =>
      listsApi.addItem(listId, {
        name: product.title,
        quantity: 1,
        ah_product_id: product.id,
      }),
    onSuccess: (_, { listId }) => {
      qc.invalidateQueries({ queryKey: ['lists'] });
      const listName = lists.find((l) => l.id === listId)?.name ?? 'lijst';
      setToast(`Toegevoegd aan "${listName}"`);
      setTimeout(() => setToast(''), 2500);
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Producten zoeken</h1>
      <p className="text-gray-500 text-sm mb-6">
        Zoek Albert Heijn producten en voeg ze direct toe aan een boodschappenlijst.
      </p>

      <div className="mb-6">
        <SearchBar
          placeholder="Zoek product (bijv. melk, brood, pasta...)"
          onSearch={setQuery}
          loading={isLoading}
        />
      </div>

      {toast && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{toast}</div>
      )}

      {!query ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🛒</p>
          <p>Zoek een product om te beginnen</p>
        </div>
      ) : isLoading ? (
        <LoadingSpinner text="Producten zoeken..." />
      ) : data?.products.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Geen producten gevonden</div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {data?.page.totalElements} producten gevonden
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.products.map((product) => (
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

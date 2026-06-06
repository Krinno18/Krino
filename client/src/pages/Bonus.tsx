import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../api/products';
import { listsApi } from '../api/lists';
import ProductCard from '../components/Product/ProductCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { AHProduct } from '../types';

export default function Bonus() {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['products-bonus'],
    queryFn: () => productsApi.getBonus(0, 40),
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

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
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
          <p className="text-sm text-gray-500 mb-4">
            {data.page.totalElements} aanbiedingen deze week
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.products.map((product) => (
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

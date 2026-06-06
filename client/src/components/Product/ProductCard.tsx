import { AHProduct } from '../../types';
import { GroceryList } from '../../types';

interface Props {
  product: AHProduct;
  lists: GroceryList[];
  onAddToList: (listId: number, product: AHProduct) => void;
}

export default function ProductCard({ product, lists, onAddToList }: Props) {
  const image = product.images?.[0]?.url;

  return (
    <div className="card p-3 flex flex-col gap-2">
      <div className="flex gap-3">
        {image && (
          <img src={image} alt={product.title} className="w-16 h-16 object-contain flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 leading-tight">{product.title}</p>
          {product.brand && <p className="text-xs text-gray-500">{product.brand}</p>}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {product.price && product.price.now > 0 && (
              <p className="text-ah-blue font-semibold text-sm">
                € {product.price.now.toFixed(2)}
                {product.price.unitSize && (
                  <span className="text-gray-400 font-normal text-xs ml-1">
                    {product.price.unitSize}
                  </span>
                )}
              </p>
            )}
            {product.isBonus && product.discountLabel && (
              <span className="text-xs bg-ah-orange/10 text-ah-orange px-1.5 py-0.5 rounded font-medium">
                {product.discountLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {lists.length > 0 && (
        <div className="pt-1">
          <select
            className="input text-xs py-1"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                onAddToList(Number(e.target.value), product);
                e.target.value = '';
              }
            }}
          >
            <option value="" disabled>
              + Toevoegen aan lijst
            </option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

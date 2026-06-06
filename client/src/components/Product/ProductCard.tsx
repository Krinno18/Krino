import { AHProduct, GroceryList } from '../../types';

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
          <div className="relative flex-shrink-0">
            <img src={image} alt={product.title} className="w-16 h-16 object-contain" />
            {product.isBonus && (
              <span className="absolute -top-1 -right-1 bg-ah-orange text-white text-[9px] font-bold px-1 py-0.5 rounded">
                BONUS
              </span>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 leading-tight">{product.title}</p>
          {product.brand && <p className="text-xs text-gray-400">{product.brand}</p>}

          <div className="mt-1 flex items-baseline gap-2 flex-wrap">
            {product.price && product.price.now > 0 && (
              <span className="text-ah-blue font-bold text-sm">
                € {product.price.now.toFixed(2)}
              </span>
            )}
            {product.price?.was && (
              <span className="text-gray-400 text-xs line-through">
                € {product.price.was.toFixed(2)}
              </span>
            )}
            {product.price?.unitSize && (
              <span className="text-gray-400 text-xs">{product.price.unitSize}</span>
            )}
          </div>

          {product.discountLabel && (
            <span className="inline-block mt-1 text-[10px] bg-ah-orange/10 text-ah-orange px-1.5 py-0.5 rounded font-medium">
              {product.discountLabel}
            </span>
          )}
        </div>
      </div>

      {lists.length > 0 && (
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
          <option value="" disabled>+ Toevoegen aan lijst</option>
          {lists.map((list) => (
            <option key={list.id} value={list.id}>{list.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}

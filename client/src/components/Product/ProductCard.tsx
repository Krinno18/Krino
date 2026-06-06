import { AHProduct, GroceryList } from '../../types';

interface Props {
  product: AHProduct;
  lists: GroceryList[];
  onAddToList: (listId: number, product: AHProduct) => void;
}

export default function ProductCard({ product, lists, onAddToList }: Props) {
  const image = product.images?.[0]?.url;
  const ahUrl = `https://www.ah.nl/producten/product/wi${product.id}/`;
  const savings = product.price?.was && product.price.now
    ? (product.price.was - product.price.now).toFixed(2)
    : null;

  return (
    <div className="card p-3 flex flex-col gap-2">
      <div className="flex gap-3">
        {image ? (
          <a href={ahUrl} target="_blank" rel="noopener noreferrer" className="relative flex-shrink-0">
            <img src={image} alt={product.title} className="w-16 h-16 object-contain" />
            {product.isBonus && (
              <span className="absolute -top-1 -right-1 bg-ah-orange text-white text-[9px] font-bold px-1 py-0.5 rounded">
                BONUS
              </span>
            )}
          </a>
        ) : (
          <div className="w-16 h-16 bg-gray-50 rounded flex items-center justify-center text-2xl flex-shrink-0">
            🛒
          </div>
        )}

        <div className="flex-1 min-w-0">
          <a
            href={ahUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-900 leading-tight hover:text-ah-blue transition-colors line-clamp-2 block"
          >
            {product.title}
          </a>

          {product.brand && <p className="text-xs text-gray-400 mt-0.5">{product.brand}</p>}

          <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
            {product.price && product.price.now > 0 && (
              <span className={`font-bold text-sm ${product.isBonus ? 'text-ah-orange' : 'text-ah-blue'}`}>
                € {product.price.now.toFixed(2)}
              </span>
            )}
            {product.price?.was && (
              <span className="text-gray-400 text-xs line-through">
                € {product.price.was.toFixed(2)}
              </span>
            )}
            {savings && (
              <span className="text-green-600 text-xs font-medium">-€{savings}</span>
            )}
          </div>

          {product.price?.unitSize && (
            <span className="text-gray-400 text-[11px]">{product.price.unitSize}</span>
          )}

          {product.discountLabel && (
            <span className="inline-block mt-1 text-[10px] bg-ah-orange/10 text-ah-orange px-1.5 py-0.5 rounded font-medium">
              {product.discountLabel}
            </span>
          )}

          {product.category && (
            <span className="inline-block mt-1 ml-1 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
              {product.category}
            </span>
          )}
        </div>
      </div>

      {lists.length > 0 ? (
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
      ) : (
        <a
          href={ahUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-ah-blue hover:underline text-center"
        >
          Bekijk op AH.nl →
        </a>
      )}
    </div>
  );
}

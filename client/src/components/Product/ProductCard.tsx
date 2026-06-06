import { useState } from 'react';
import { AHProduct, GroceryList } from '../../types';

interface Props {
  product: AHProduct;
  lists: GroceryList[];
  onAddToList: (listId: number, product: AHProduct) => void;
  onCreateAndAdd: (listName: string, product: AHProduct) => void;
}

export default function ProductCard({ product, lists, onAddToList, onCreateAndAdd }: Props) {
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const image = product.images?.[0]?.url;
  const ahUrl = `https://www.ah.nl/producten/product/wi${product.id}/`;
  const savings = product.price?.was && product.price.now
    ? (product.price.was - product.price.now).toFixed(2)
    : null;

  const handleSubmitNewList = (e: React.FormEvent) => {
    e.preventDefault();
    if (newListName.trim()) {
      onCreateAndAdd(newListName.trim(), product);
      setNewListName('');
      setShowNewList(false);
    }
  };

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
          <div className="w-16 h-16 bg-gray-50 rounded flex items-center justify-center text-2xl flex-shrink-0">🛒</div>
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
              <span className="text-gray-400 text-xs line-through">€ {product.price.was.toFixed(2)}</span>
            )}
            {savings && <span className="text-green-600 text-xs font-medium">-€{savings}</span>}
          </div>

          {product.price?.unitSize && (
            <span className="text-gray-400 text-[11px]">{product.price.unitSize}</span>
          )}

          <div className="flex flex-wrap gap-1 mt-1">
            {product.discountLabel && (
              <span className="text-[10px] bg-ah-orange text-white px-1.5 py-0.5 rounded font-bold">
                {product.discountLabel}
              </span>
            )}
            {product.category && (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                {product.category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Add to list */}
      {showNewList ? (
        <form onSubmit={handleSubmitNewList} className="flex gap-1">
          <input
            autoFocus
            className="input flex-1 text-xs py-1"
            placeholder="Naam nieuwe lijst..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
          />
          <button type="submit" className="btn-primary text-xs px-2 py-1" disabled={!newListName.trim()}>
            +
          </button>
          <button
            type="button"
            onClick={() => { setShowNewList(false); setNewListName(''); }}
            className="text-gray-400 hover:text-gray-600 px-1"
          >
            ×
          </button>
        </form>
      ) : (
        <select
          className="input text-xs py-1"
          value=""
          onChange={(e) => {
            if (e.target.value === 'new') {
              setShowNewList(true);
            } else if (e.target.value) {
              onAddToList(Number(e.target.value), product);
            }
          }}
        >
          <option value="" disabled>+ Toevoegen aan lijst</option>
          {lists.map((list) => (
            <option key={list.id} value={list.id}>{list.name}</option>
          ))}
          <option value="new">📄 Nieuwe lijst aanmaken...</option>
        </select>
      )}
    </div>
  );
}

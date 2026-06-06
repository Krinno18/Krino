import { useState, useRef, useEffect } from 'react';
import { productsApi } from '../../api/products';
import { AHProduct } from '../../types';

interface Props {
  value: string;
  onChange: (value: string, product?: AHProduct) => void;
  placeholder?: string;
  className?: string;
}

export default function ProductAutocomplete({ value, onChange, placeholder, className }: Props) {
  const [results, setResults] = useState<AHProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (text: string) => {
    onChange(text);
    setHighlightedIndex(-1);
    clearTimeout(timerRef.current);

    if (text.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const data = await productsApi.search(text.trim(), 0, 6);
        setResults(data.products);
        setOpen(data.products.length > 0);
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const select = (product: AHProduct) => {
    onChange(product.title, product);
    setResults([]);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      select(results[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <div className="relative">
        <input
          type="text"
          className={className ?? 'input w-full'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
            ...
          </span>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          {results.map((product, i) => {
            const image = product.images?.[0]?.url;
            return (
              <button
                key={product.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); select(product); }}
                onMouseEnter={() => setHighlightedIndex(i)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  highlightedIndex === i ? 'bg-ah-blue/5' : 'hover:bg-gray-50'
                }`}
              >
                {image ? (
                  <img src={image} alt="" className="w-10 h-10 object-contain flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-gray-100 rounded flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{product.title}</p>
                  <p className="text-xs text-gray-400">
                    {product.brand && `${product.brand} · `}
                    {product.price?.now ? `€ ${product.price.now.toFixed(2)}` : ''}
                    {product.price?.unitSize ? ` / ${product.price.unitSize}` : ''}
                    {product.isBonus && (
                      <span className="ml-1 text-ah-orange font-medium">BONUS</span>
                    )}
                  </p>
                </div>
                {product.category && (
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex-shrink-0">
                    {product.category}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

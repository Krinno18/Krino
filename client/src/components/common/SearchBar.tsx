import { useState, FormEvent } from 'react';

interface Props {
  placeholder?: string;
  onSearch: (query: string) => void;
  onClear?: () => void;
  loading?: boolean;
  activeQuery?: string;
}

export default function SearchBar({ placeholder = 'Zoeken...', onSearch, onClear, loading, activeQuery }: Props) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  };

  const handleClear = () => {
    setValue('');
    onClear?.();
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            className="input w-full pr-8"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          {value && (
            <button
              type="button"
              onClick={() => setValue('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
              tabIndex={-1}
            >
              ×
            </button>
          )}
        </div>
        <button type="submit" className="btn-primary" disabled={loading || !value.trim()}>
          {loading ? '...' : 'Zoek'}
        </button>
      </form>

      {activeQuery && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-gray-500">Zoekresultaten voor:</span>
          <span className="inline-flex items-center gap-1 bg-ah-blue/10 text-ah-blue text-sm px-2 py-0.5 rounded-full font-medium">
            {activeQuery}
            <button
              onClick={handleClear}
              className="hover:text-ah-blue/70 ml-0.5 font-bold"
              title="Zoekopdracht wissen"
            >
              ×
            </button>
          </span>
        </div>
      )}
    </div>
  );
}

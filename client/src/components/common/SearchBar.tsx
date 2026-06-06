import { useState, FormEvent } from 'react';

interface Props {
  placeholder?: string;
  onSearch: (query: string) => void;
  loading?: boolean;
}

export default function SearchBar({ placeholder = 'Zoeken...', onSearch, loading }: Props) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        className="input flex-1"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit" className="btn-primary" disabled={loading || !value.trim()}>
        {loading ? '...' : 'Zoek'}
      </button>
    </form>
  );
}

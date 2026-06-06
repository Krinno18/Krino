import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { recipesApi } from '../api/recipes';
import RecipeCard from '../components/Recipe/RecipeCard';
import SearchBar from '../components/common/SearchBar';
import LoadingSpinner from '../components/common/LoadingSpinner';

const SUGGESTED = ['pasta', 'soep', 'salade', 'kip', 'vis', 'vegetarisch'];

export default function Recipes() {
  const [query, setQuery] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['recipes', query],
    queryFn: () => recipesApi.search(query),
    enabled: !!query,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Recepten</h1>
      <p className="text-gray-500 text-sm mb-6">
        Zoek Albert Heijn recepten en voeg ingrediënten direct toe aan je boodschappenlijst.
      </p>

      <div className="mb-6">
        <SearchBar
          placeholder="Zoek recept (bijv. pasta, soep, kip...)"
          onSearch={setQuery}
          onClear={() => setQuery('')}
          loading={isLoading || isFetching}
          activeQuery={query || undefined}
        />
        <div className="flex flex-wrap gap-2 mt-3">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              onClick={() => setQuery(s)}
              className="text-xs px-3 py-1 rounded-full bg-gray-100 hover:bg-ah-blue hover:text-white transition-colors capitalize"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {!query ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🍳</p>
          <p>Zoek een recept om te beginnen</p>
        </div>
      ) : isLoading ? (
        <LoadingSpinner text="Recepten zoeken..." />
      ) : data?.recipes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>Geen recepten gevonden voor "{query}"</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {data?.total} recepten gevonden voor "{query}"
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {data?.recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

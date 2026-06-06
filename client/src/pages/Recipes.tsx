import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recipesApi } from '../api/recipes';
import { listsApi } from '../api/lists';
import RecipeCard from '../components/Recipe/RecipeCard';
import SearchBar from '../components/common/SearchBar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { AHRecipe } from '../types';

const SUGGESTED = ['pasta', 'soep', 'salade', 'kip', 'vis', 'vegetarisch', 'curry', 'taart'];
type Tab = 'zoeken' | 'url';

export default function Recipes() {
  const [tab, setTab] = useState<Tab>('zoeken');
  const [query, setQuery] = useState('');

  // URL import state
  const [urlInput, setUrlInput] = useState('');
  const [importedRecipe, setImportedRecipe] = useState<AHRecipe | null>(null);
  const [importError, setImportError] = useState('');
  const [selectedListId, setSelectedListId] = useState<number | 'new' | ''>('');
  const [newListName, setNewListName] = useState('');
  const [addedMsg, setAddedMsg] = useState('');

  const qc = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['recipes', query],
    queryFn: () => recipesApi.search(query),
    enabled: !!query && tab === 'zoeken',
  });

  const { data: lists = [] } = useQuery({
    queryKey: ['lists'],
    queryFn: listsApi.getAll,
  });

  const importMutation = useMutation({
    mutationFn: (url: string) => recipesApi.fromUrl(url),
    onSuccess: (recipe) => {
      setImportedRecipe(recipe);
      setImportError('');
    },
    onError: (err: any) => {
      setImportError(err.response?.data?.error ?? 'Kon recept niet importeren');
      setImportedRecipe(null);
    },
  });

  const addToListMutation = useMutation({
    mutationFn: async (listId: number) => {
      if (!importedRecipe) return;
      const items = importedRecipe.ingredients.map((ing) => ({
        name: ing.name,
        quantity: 1,
      }));
      return listsApi.addItems(listId, items);
    },
    onSuccess: (_, listId) => {
      qc.invalidateQueries({ queryKey: ['lists'] });
      const name = lists.find((l) => l.id === listId)?.name ?? 'lijst';
      setAddedMsg(`${importedRecipe?.ingredients.length} ingrediënten toegevoegd aan "${name}"`);
      setTimeout(() => setAddedMsg(''), 4000);
    },
  });

  const createAndAddMutation = useMutation({
    mutationFn: async () => {
      if (!importedRecipe || !newListName.trim()) return;
      const list = await listsApi.create(newListName.trim());
      const items = importedRecipe.ingredients.map((ing) => ({ name: ing.name, quantity: 1 }));
      await listsApi.addItems(list.id, items);
      return list;
    },
    onSuccess: (list) => {
      qc.invalidateQueries({ queryKey: ['lists'] });
      setAddedMsg(`${importedRecipe?.ingredients.length} ingrediënten toegevoegd aan nieuwe lijst "${list?.name}"`);
      setNewListName('');
      setSelectedListId('');
      setTimeout(() => setAddedMsg(''), 4000);
    },
  });

  const handleAdd = () => {
    if (selectedListId === 'new') createAndAddMutation.mutate();
    else if (selectedListId) addToListMutation.mutate(Number(selectedListId));
  };

  const isPending = addToListMutation.isPending || createAndAddMutation.isPending;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Recepten</h1>
      <p className="text-gray-500 text-sm mb-4">
        Zoek recepten of importeer ze via een link en voeg ingrediënten direct toe aan je boodschappenlijst.
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('zoeken')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'zoeken' ? 'bg-ah-blue text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          🔍 Recepten zoeken
        </button>
        <button
          onClick={() => setTab('url')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'url' ? 'bg-ah-blue text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          🔗 Importeer via link
        </button>
      </div>

      {/* Search tab */}
      {tab === 'zoeken' && (
        <>
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
                  className={`text-xs px-3 py-1 rounded-full transition-colors capitalize ${query === s ? 'bg-ah-blue text-white' : 'bg-gray-100 hover:bg-ah-blue hover:text-white'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {!query ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🍳</p>
              <p>Zoek een recept of importeer via een link</p>
            </div>
          ) : isLoading ? (
            <LoadingSpinner text="Recepten zoeken..." />
          ) : data?.recipes.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p>Geen recepten gevonden voor "{query}"</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">{data?.total} recepten gevonden voor "{query}"</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {data?.recipes.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* URL import tab */}
      {tab === 'url' && (
        <div className="max-w-2xl">
          <div className="card p-5 mb-4">
            <h2 className="font-semibold text-gray-800 mb-1">Recept importeren via link</h2>
            <p className="text-sm text-gray-500 mb-4">
              Plak een link naar een recept (bijv. van AH Allerhande, Jumbo, of andere receptenwebsites).
              De ingrediënten worden automatisch herkend.
            </p>
            <form
              onSubmit={(e) => { e.preventDefault(); if (urlInput.trim()) importMutation.mutate(urlInput.trim()); }}
              className="flex gap-2"
            >
              <input
                type="url"
                className="input flex-1"
                placeholder="https://www.ah.nl/allerhande/recept/..."
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setImportedRecipe(null); setImportError(''); setAddedMsg(''); }}
              />
              <button
                type="submit"
                className="btn-primary whitespace-nowrap"
                disabled={!urlInput.trim() || importMutation.isPending}
              >
                {importMutation.isPending ? 'Bezig...' : 'Importeer'}
              </button>
            </form>

            {importError && (
              <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{importError}</div>
            )}
          </div>

          {/* Imported recipe result */}
          {importedRecipe && (
            <div className="card p-5">
              {importedRecipe.images?.[0]?.url && (
                <img
                  src={importedRecipe.images[0].url}
                  alt={importedRecipe.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}

              <h2 className="text-xl font-bold text-gray-900 mb-1">{importedRecipe.title}</h2>
              <div className="flex gap-4 text-sm text-gray-500 mb-4">
                {importedRecipe.cookTime && <span>⏱ {importedRecipe.cookTime} min</span>}
                {importedRecipe.servings && <span>👤 {importedRecipe.servings} pers.</span>}
                <span>🥗 {importedRecipe.ingredients.length} ingrediënten</span>
              </div>

              <h3 className="font-semibold text-gray-800 mb-2">Ingrediënten</h3>
              <ul className="divide-y divide-gray-50 mb-5">
                {importedRecipe.ingredients.map((ing, i) => (
                  <li key={i} className="py-1.5 text-sm text-gray-700">{ing.name}</li>
                ))}
              </ul>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Ingrediënten toevoegen aan boodschappenlijst
                </h3>
                <div className="flex gap-2 flex-wrap">
                  <select
                    className="input flex-1 min-w-0 text-sm"
                    value={selectedListId}
                    onChange={(e) => setSelectedListId(e.target.value === 'new' ? 'new' : Number(e.target.value) || '')}
                  >
                    <option value="">Kies een lijst...</option>
                    {lists.map((list) => (
                      <option key={list.id} value={list.id}>{list.name}</option>
                    ))}
                    <option value="new">📄 Nieuwe lijst aanmaken</option>
                  </select>
                  <button
                    className="btn-primary text-sm whitespace-nowrap"
                    disabled={!selectedListId || isPending}
                    onClick={handleAdd}
                  >
                    {isPending ? 'Bezig...' : 'Voeg toe'}
                  </button>
                </div>

                {selectedListId === 'new' && (
                  <input
                    autoFocus
                    className="input w-full mt-2 text-sm"
                    placeholder="Naam voor de nieuwe lijst..."
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                  />
                )}

                {addedMsg && <p className="text-green-600 text-sm mt-2">{addedMsg}</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recipesApi } from '../api/recipes';
import { listsApi } from '../api/lists';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedListId, setSelectedListId] = useState<number | 'new' | ''>('');
  const [newListName, setNewListName] = useState('');
  const [addedMsg, setAddedMsg] = useState('');

  const { data: recipe, isLoading: recipeLoading } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => recipesApi.getById(id!),
    enabled: !!id,
  });

  const { data: lists = [] } = useQuery({
    queryKey: ['lists'],
    queryFn: listsApi.getAll,
  });

  const addToListMutation = useMutation({
    mutationFn: async (listId: number) => {
      if (!recipe) return;
      const items = recipe.ingredients.map((ing) => ({
        name: ing.name,
        quantity: parseFloat(ing.quantity ?? '1') || 1,
        unit: ing.unit,
        ah_product_id: ing.product?.id,
      }));
      return listsApi.addItems(listId, items);
    },
    onSuccess: (_, listId) => {
      qc.invalidateQueries({ queryKey: ['lists'] });
      const name = lists.find((l) => l.id === listId)?.name ?? 'lijst';
      setAddedMsg(`${recipe?.ingredients.length} ingrediënten toegevoegd aan "${name}"`);
      setTimeout(() => setAddedMsg(''), 4000);
    },
  });

  const createAndAddMutation = useMutation({
    mutationFn: async () => {
      if (!recipe || !newListName.trim()) return;
      const list = await listsApi.create(newListName.trim());
      const items = recipe.ingredients.map((ing) => ({
        name: ing.name,
        quantity: parseFloat(ing.quantity ?? '1') || 1,
        unit: ing.unit,
        ah_product_id: ing.product?.id,
      }));
      await listsApi.addItems(list.id, items);
      return list;
    },
    onSuccess: (list) => {
      qc.invalidateQueries({ queryKey: ['lists'] });
      if (list) navigate(`/lists/${list.id}`);
    },
  });

  const handleAdd = () => {
    if (selectedListId === 'new') {
      createAndAddMutation.mutate();
    } else if (selectedListId) {
      addToListMutation.mutate(Number(selectedListId));
    }
  };

  if (recipeLoading) return <LoadingSpinner />;
  if (!recipe) return <div className="text-center py-16 text-gray-400">Recept niet gevonden</div>;

  const image = recipe.images?.[0]?.url;
  const isPending = addToListMutation.isPending || createAndAddMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/recipes" className="text-gray-400 hover:text-gray-600 text-sm mb-4 inline-block">
        ← Terug naar recepten
      </Link>

      {image && (
        <img src={image} alt={recipe.title} className="w-full h-56 object-cover rounded-xl mb-6" />
      )}

      <h1 className="text-2xl font-bold text-gray-900 mb-2">{recipe.title}</h1>

      <div className="flex gap-4 text-sm text-gray-500 mb-4 flex-wrap">
        {recipe.cookTime && <span>⏱ {recipe.cookTime} minuten</span>}
        {recipe.servings && <span>👤 {recipe.servings} personen</span>}
        <span>🥗 {recipe.ingredients.length} ingrediënten</span>
        {recipe.tags && recipe.tags.length > 0 && (
          <span className="text-gray-400">{recipe.tags.slice(0, 3).join(' · ')}</span>
        )}
      </div>

      {recipe.description && (
        <p className="text-gray-600 mb-6 leading-relaxed">{recipe.description}</p>
      )}

      <div className="card p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">
          Ingrediënten ({recipe.ingredients.length})
        </h2>

        <ul className="divide-y divide-gray-50 mb-5">
          {recipe.ingredients.map((ing, i) => (
            <li key={i} className="py-2 text-sm flex gap-2">
              <span className="text-gray-400 w-24 flex-shrink-0">
                {ing.quantity || ''} {ing.unit || ''}
              </span>
              <span className="text-gray-800">{ing.name}</span>
            </li>
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
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
              <option value="new">+ Nieuwe lijst aanmaken</option>
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
              className="input w-full mt-2 text-sm"
              placeholder="Naam voor de nieuwe lijst..."
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              autoFocus
            />
          )}

          {addedMsg && (
            <p className="text-green-600 text-sm mt-2">{addedMsg}</p>
          )}
        </div>
      </div>
    </div>
  );
}

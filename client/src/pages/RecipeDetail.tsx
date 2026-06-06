import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recipesApi } from '../api/recipes';
import { listsApi } from '../api/lists';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [selectedListId, setSelectedListId] = useState<number | ''>('');
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
    mutationFn: async () => {
      if (!recipe || !selectedListId) return;
      const items = recipe.ingredients.map((ing) => ({
        name: ing.name,
        quantity: parseFloat(ing.quantity ?? '1') || 1,
        unit: ing.unit,
        ah_product_id: ing.product?.id,
      }));
      return listsApi.addItems(Number(selectedListId), items);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lists'] });
      setAddedMsg('Ingrediënten toegevoegd!');
      setTimeout(() => setAddedMsg(''), 3000);
    },
  });

  if (recipeLoading) return <LoadingSpinner />;
  if (!recipe) return <div className="text-center py-16 text-gray-400">Recept niet gevonden</div>;

  const image = recipe.images?.[0]?.url;

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/recipes" className="text-gray-400 hover:text-gray-600 text-sm mb-4 inline-block">
        ← Terug naar recepten
      </Link>

      {image && (
        <img src={image} alt={recipe.title} className="w-full h-56 object-cover rounded-xl mb-6" />
      )}

      <h1 className="text-2xl font-bold text-gray-900 mb-2">{recipe.title}</h1>

      <div className="flex gap-4 text-sm text-gray-500 mb-4">
        {recipe.cookTime && <span>⏱ {recipe.cookTime} minuten</span>}
        {recipe.servings && <span>👤 {recipe.servings} personen</span>}
      </div>

      {recipe.description && (
        <p className="text-gray-600 mb-6 leading-relaxed">{recipe.description}</p>
      )}

      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">
            Ingrediënten ({recipe.ingredients.length})
          </h2>
        </div>

        <ul className="divide-y divide-gray-50">
          {recipe.ingredients.map((ing, i) => (
            <li key={i} className="py-2 text-sm flex gap-2">
              <span className="text-gray-400 w-20 flex-shrink-0">
                {ing.quantity || ''} {ing.unit || ''}
              </span>
              <span className="text-gray-800">{ing.name}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 pt-4 border-t border-gray-100">
          {lists.length === 0 ? (
            <div className="text-sm text-gray-500">
              <Link to="/lists" className="text-ah-blue hover:underline">
                Maak eerst een boodschappenlijst
              </Link>{' '}
              om ingrediënten toe te voegen.
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                className="input flex-1 text-sm"
                value={selectedListId}
                onChange={(e) => setSelectedListId(Number(e.target.value) || '')}
              >
                <option value="">Kies een lijst...</option>
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
              <button
                className="btn-primary text-sm"
                disabled={!selectedListId || addToListMutation.isPending}
                onClick={() => addToListMutation.mutate()}
              >
                {addToListMutation.isPending ? 'Bezig...' : 'Voeg toe'}
              </button>
            </div>
          )}

          {addedMsg && (
            <p className="text-green-600 text-sm mt-2">{addedMsg}</p>
          )}
        </div>
      </div>
    </div>
  );
}

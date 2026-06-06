import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listsApi } from '../api/lists';
import { useAuthStore } from '../store/authStore';
import GroceryListItemRow from '../components/GroceryList/GroceryListItem';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function GroceryListDetail() {
  const { id } = useParams<{ id: string }>();
  const listId = Number(id);
  const qc = useQueryClient();
  const { loggedIn } = useAuthStore();

  const [newItem, setNewItem] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const { data: list, isLoading } = useQuery({
    queryKey: ['lists', listId],
    queryFn: () => listsApi.getById(listId),
  });

  const addItemMutation = useMutation({
    mutationFn: (item: { name: string; quantity: number; unit?: string }) =>
      listsApi.addItem(listId, item),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lists', listId] });
      setNewItem('');
      setQty('1');
      setUnit('');
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: { checked: boolean } }) =>
      listsApi.updateItem(listId, itemId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lists', listId] }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => listsApi.deleteItem(listId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lists', listId] }),
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim()) {
      addItemMutation.mutate({
        name: newItem.trim(),
        quantity: parseFloat(qty) || 1,
        unit: unit.trim() || undefined,
      });
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      await listsApi.syncToAH(listId);
      setSyncMsg('Gesynchroniseerd met AH!');
      qc.invalidateQueries({ queryKey: ['lists', listId] });
    } catch {
      setSyncMsg('Synchroniseren mislukt');
    } finally {
      setSyncing(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (!list) return <div className="text-center py-16 text-gray-400">Lijst niet gevonden</div>;

  const unchecked = list.items.filter((i) => !i.checked);
  const checked = list.items.filter((i) => i.checked);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/lists" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="text-2xl font-bold text-gray-900 flex-1">{list.name}</h1>
        {loggedIn && (
          <button
            onClick={handleSync}
            disabled={syncing || list.items.length === 0}
            className="btn-primary text-sm py-1.5"
          >
            {syncing ? 'Bezig...' : '🔄 Sync naar AH'}
          </button>
        )}
      </div>

      {syncMsg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${syncMsg.includes('mislukt') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {syncMsg}
        </div>
      )}

      <form onSubmit={handleAddItem} className="card p-4 mb-6 flex flex-col gap-3">
        <h2 className="font-semibold text-gray-700 text-sm">Item toevoegen</h2>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Productnaam"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
          />
          <input
            className="input w-16 text-center"
            type="number"
            min="0.1"
            step="0.1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            title="Hoeveelheid"
          />
          <input
            className="input w-20"
            placeholder="eenheid"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            title="Eenheid (bijv. kg, l, st)"
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={!newItem.trim() || addItemMutation.isPending}
          >
            +
          </button>
        </div>
      </form>

      {list.items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🛒</p>
          <p>Lijst is leeg. Voeg items toe of zoek een recept!</p>
          <Link to="/recipes" className="btn-primary inline-block mt-4 text-sm">
            Recepten bekijken
          </Link>
        </div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {unchecked.map((item) => (
            <GroceryListItemRow
              key={item.id}
              item={item}
              onToggle={(itemId, ch) => updateItemMutation.mutate({ itemId, data: { checked: ch } })}
              onDelete={(itemId) => deleteItemMutation.mutate(itemId)}
            />
          ))}

          {checked.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
                Afgevinkt ({checked.length})
              </div>
              {checked.map((item) => (
                <GroceryListItemRow
                  key={item.id}
                  item={item}
                  onToggle={(itemId, ch) => updateItemMutation.mutate({ itemId, data: { checked: ch } })}
                  onDelete={(itemId) => deleteItemMutation.mutate(itemId)}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listsApi } from '../api/lists';
import { useAuthStore } from '../store/authStore';
import GroceryListItemRow from '../components/GroceryList/GroceryListItem';
import ProductAutocomplete from '../components/GroceryList/ProductAutocomplete';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { AHProduct } from '../types';

export default function GroceryListDetail() {
  const { id } = useParams<{ id: string }>();
  const listId = Number(id);
  const qc = useQueryClient();
  const { loggedIn } = useAuthStore();

  const [newItem, setNewItem] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>();
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [copySourceId, setCopySourceId] = useState<number | ''>('');
  const [showCopyPanel, setShowCopyPanel] = useState(false);

  const { data: list, isLoading } = useQuery({
    queryKey: ['lists', listId],
    queryFn: () => listsApi.getById(listId),
  });

  const { data: allLists = [] } = useQuery({
    queryKey: ['lists'],
    queryFn: listsApi.getAll,
  });

  const otherLists = allLists.filter((l) => l.id !== listId);

  const addItemMutation = useMutation({
    mutationFn: (item: { name: string; quantity: number; unit?: string; ah_product_id?: number }) =>
      listsApi.addItem(listId, item),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lists', listId] });
      setNewItem('');
      setQty('1');
      setUnit('');
      setSelectedProductId(undefined);
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

  const deleteCheckedMutation = useMutation({
    mutationFn: () => listsApi.deleteCheckedItems(listId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lists', listId] }),
  });

  const copyFromMutation = useMutation({
    mutationFn: (sourceId: number) => listsApi.copyFrom(listId, sourceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lists', listId] });
      setCopySourceId('');
      setShowCopyPanel(false);
    },
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim()) {
      addItemMutation.mutate({
        name: newItem.trim(),
        quantity: parseFloat(qty) || 1,
        unit: unit.trim() || undefined,
        ah_product_id: selectedProductId,
      });
    }
  };

  const handleProductSelect = (name: string, product?: AHProduct) => {
    setNewItem(name);
    setSelectedProductId(product?.id);
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
  const progress = list.items.length > 0 ? Math.round((checked.length / list.items.length) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link to="/lists" className="text-gray-400 hover:text-gray-600 text-xl">←</Link>
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

      {/* Progress bar */}
      {list.items.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{unchecked.length} te gaan</span>
            <span>{progress}% klaar</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-ah-blue rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {syncMsg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${syncMsg.includes('mislukt') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {syncMsg}
        </div>
      )}

      {/* Add item form */}
      <form onSubmit={handleAddItem} className="card p-4 mb-4 flex flex-col gap-3">
        <h2 className="font-semibold text-gray-700 text-sm">Item toevoegen</h2>
        <div className="flex gap-2">
          <ProductAutocomplete
            value={newItem}
            onChange={handleProductSelect}
            placeholder="Zoek product of typ naam..."
            className="input w-full"
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

      {/* Copy from another list */}
      {otherLists.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowCopyPanel((v) => !v)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"
          >
            <span className={`transition-transform ${showCopyPanel ? 'rotate-90' : ''}`}>▶</span>
            📋 Items kopiëren van andere lijst
          </button>

          {showCopyPanel && (
            <div className="card p-3 mt-2 flex gap-2">
              <select
                className="input flex-1 text-sm"
                value={copySourceId}
                onChange={(e) => setCopySourceId(Number(e.target.value) || '')}
              >
                <option value="">Kies een lijst...</option>
                {otherLists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.items.length} items)
                  </option>
                ))}
              </select>
              <button
                className="btn-primary text-sm whitespace-nowrap"
                disabled={!copySourceId || copyFromMutation.isPending}
                onClick={() => copySourceId && copyFromMutation.mutate(Number(copySourceId))}
              >
                {copyFromMutation.isPending ? 'Bezig...' : 'Kopieer alles'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* List items */}
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
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Afgevinkt ({checked.length})
                </span>
                <button
                  onClick={() => {
                    if (confirm(`${checked.length} afgevinkte items verwijderen?`))
                      deleteCheckedMutation.mutate();
                  }}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Verwijder afgevinkte
                </button>
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

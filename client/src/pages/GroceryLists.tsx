import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listsApi } from '../api/lists';
import { TemplateItem } from '../types';
import GroceryListCard from '../components/GroceryList/GroceryListCard';
import ProductAutocomplete from '../components/GroceryList/ProductAutocomplete';
import LoadingSpinner from '../components/common/LoadingSpinner';

type CreateMode = 'leeg' | 'template' | 'kopie';

export default function GroceryLists() {
  const [newName, setNewName] = useState('');
  const [createMode, setCreateMode] = useState<CreateMode>('leeg');
  const [copySourceId, setCopySourceId] = useState<number | ''>('');
  const [showTemplate, setShowTemplate] = useState(false);
  const [tmplName, setTmplName] = useState('');
  const [tmplQty, setTmplQty] = useState('1');
  const [tmplUnit, setTmplUnit] = useState('');
  const qc = useQueryClient();

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ['lists'],
    queryFn: listsApi.getAll,
  });

  const { data: templateItems = [] } = useQuery({
    queryKey: ['template'],
    queryFn: listsApi.getTemplate,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => {
      if (createMode === 'template') return listsApi.create(name, { fromTemplate: true });
      if (createMode === 'kopie' && copySourceId) return listsApi.create(name, { copyFromId: Number(copySourceId) });
      return listsApi.create(name);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lists'] });
      setNewName('');
      setCopySourceId('');
      setCreateMode('leeg');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => listsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lists'] }),
  });

  const addTmplMutation = useMutation({
    mutationFn: () => listsApi.addTemplateItem({ name: tmplName.trim(), quantity: parseFloat(tmplQty) || 1, unit: tmplUnit.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['template'] });
      setTmplName('');
      setTmplQty('1');
      setTmplUnit('');
    },
  });

  const removeTmplMutation = useMutation({
    mutationFn: (id: number) => listsApi.removeTemplateItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['template'] }),
  });

  const clearTmplMutation = useMutation({
    mutationFn: () => listsApi.clearTemplate(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['template'] }),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    if (createMode === 'kopie' && !copySourceId) return;
    createMutation.mutate(newName.trim());
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">📋</span>
        <h1 className="text-2xl font-bold text-gray-900">Boodschappenlijsten</h1>
      </div>

      {/* Create form */}
      <div className="card p-4 mb-6">
        <h2 className="font-semibold text-gray-700 text-sm mb-3">Nieuwe lijst aanmaken</h2>

        {/* Mode selector */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {(['leeg', 'template', 'kopie'] as CreateMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setCreateMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                createMode === mode
                  ? 'bg-ah-blue text-white border-ah-blue'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {mode === 'leeg' && '📄 Lege lijst'}
              {mode === 'template' && `⭐ Met standaard items ${templateItems.length > 0 ? `(${templateItems.length})` : ''}`}
              {mode === 'kopie' && '📋 Kopieer van bestaande'}
            </button>
          ))}
        </div>

        {createMode === 'kopie' && (
          <select
            className="input w-full mb-3 text-sm"
            value={copySourceId}
            onChange={(e) => setCopySourceId(Number(e.target.value) || '')}
          >
            <option value="">Kies een lijst om van te kopiëren...</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.items.length} items)
              </option>
            ))}
          </select>
        )}

        {createMode === 'template' && templateItems.length === 0 && (
          <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-3">
            Geen standaard items ingesteld. Voeg items toe via "Standaard items beheren" hieronder.
          </p>
        )}

        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            className="input flex-1"
            placeholder="Naam voor de nieuwe lijst..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button
            type="submit"
            className="btn-primary whitespace-nowrap"
            disabled={!newName.trim() || createMutation.isPending || (createMode === 'kopie' && !copySourceId)}
          >
            {createMutation.isPending ? 'Bezig...' : 'Aanmaken'}
          </button>
        </form>
      </div>

      {/* Template management */}
      <div className="mb-6">
        <button
          onClick={() => setShowTemplate((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-2"
        >
          <span className={`transition-transform ${showTemplate ? 'rotate-90' : ''}`}>▶</span>
          <span>⭐ Standaard items beheren</span>
          {templateItems.length > 0 && (
            <span className="bg-ah-blue/10 text-ah-blue text-xs px-2 py-0.5 rounded-full">
              {templateItems.length} items
            </span>
          )}
        </button>

        {showTemplate && (
          <div className="card p-4">
            <p className="text-xs text-gray-500 mb-4">
              Deze items worden automatisch toegevoegd als je kiest voor "Met standaard items".
            </p>

            {/* Add template item form */}
            <form
              onSubmit={(e) => { e.preventDefault(); if (tmplName.trim()) addTmplMutation.mutate(); }}
              className="flex gap-2 mb-4"
            >
              <ProductAutocomplete
                value={tmplName}
                onChange={(name) => setTmplName(name)}
                placeholder="Zoek of typ product (bijv. Melk, Eieren...)"
                className="input w-full text-sm"
              />
              <input
                className="input w-14 text-center text-sm"
                type="number"
                min="0.1"
                step="0.1"
                value={tmplQty}
                onChange={(e) => setTmplQty(e.target.value)}
                title="Hoeveelheid"
              />
              <input
                className="input w-16 text-sm"
                placeholder="enh."
                value={tmplUnit}
                onChange={(e) => setTmplUnit(e.target.value)}
                title="Eenheid"
              />
              <button type="submit" className="btn-primary text-sm" disabled={!tmplName.trim() || addTmplMutation.isPending}>
                +
              </button>
            </form>

            {templateItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nog geen standaard items</p>
            ) : (
              <>
                <ul className="divide-y divide-gray-50 mb-3">
                  {templateItems.map((item: TemplateItem) => (
                    <li key={item.id} className="flex items-center gap-2 py-2 text-sm">
                      <span className="flex-1 text-gray-800">{item.name}</span>
                      <span className="text-gray-400 text-xs">{item.quantity} {item.unit || ''}</span>
                      <button
                        onClick={() => removeTmplMutation.mutate(item.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors ml-1"
                        title="Verwijder"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => { if (confirm('Alle standaard items verwijderen?')) clearTmplMutation.mutate(); }}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Alles wissen
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Lists grid */}
      {isLoading ? (
        <LoadingSpinner />
      ) : lists.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p>Nog geen lijsten. Maak je eerste lijst aan!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => (
            <GroceryListCard
              key={list.id}
              list={list}
              onDelete={(id) => {
                if (confirm('Lijst verwijderen?')) deleteMutation.mutate(id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

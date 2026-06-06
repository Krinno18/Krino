import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listsApi } from '../api/lists';
import GroceryListCard from '../components/GroceryList/GroceryListCard';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function GroceryLists() {
  const [newName, setNewName] = useState('');
  const qc = useQueryClient();

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ['lists'],
    queryFn: listsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => listsApi.create(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lists'] });
      setNewName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => listsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lists'] }),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) createMutation.mutate(newName.trim());
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Boodschappenlijsten</h1>

      <form onSubmit={handleCreate} className="flex gap-2 mb-6">
        <input
          type="text"
          className="input flex-1"
          placeholder="Nieuwe lijst aanmaken..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={!newName.trim() || createMutation.isPending}
        >
          Aanmaken
        </button>
      </form>

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

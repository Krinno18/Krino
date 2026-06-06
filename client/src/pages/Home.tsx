import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listsApi } from '../api/lists';
import { useAuthStore } from '../store/authStore';

export default function Home() {
  const { loggedIn } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [newListName, setNewListName] = useState('');

  const { data: lists = [] } = useQuery({
    queryKey: ['lists'],
    queryFn: listsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => listsApi.create(name),
    onSuccess: (list) => {
      qc.invalidateQueries({ queryKey: ['lists'] });
      navigate(`/lists/${list.id}`);
    },
  });

  const recentLists = lists.slice(0, 3);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero */}
      <div className="text-center py-8 mb-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Welkom bij <span className="text-ah-blue">Krino</span>
        </h1>
        <p className="text-gray-500">
          Boodschappenlijsten, AH-recepten en bonus aanbiedingen — alles op één plek.
        </p>
      </div>

      {/* Quick create list */}
      <div className="card p-5 mb-6">
        <h2 className="font-semibold text-gray-800 mb-3">🛒 Snel een nieuwe lijst aanmaken</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newListName.trim()) createMutation.mutate(newListName.trim());
          }}
          className="flex gap-2"
        >
          <input
            className="input flex-1"
            placeholder="Naam voor je nieuwe boodschappenlijst..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
          />
          <button
            type="submit"
            className="btn-primary whitespace-nowrap"
            disabled={!newListName.trim() || createMutation.isPending}
          >
            Aanmaken
          </button>
        </form>
      </div>

      {/* Recent lists */}
      {recentLists.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Recente lijsten</h2>
            <Link to="/lists" className="text-sm text-ah-blue hover:underline">Alle lijsten →</Link>
          </div>
          <div className="grid gap-2">
            {recentLists.map((list) => {
              const checked = list.items.filter((i) => i.checked).length;
              const total = list.items.length;
              const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
              return (
                <Link
                  key={list.id}
                  to={`/lists/${list.id}`}
                  className="card p-3 flex items-center gap-3 hover:shadow-md transition-shadow"
                >
                  <span className="text-xl">📋</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{list.name}</p>
                    <p className="text-xs text-gray-400">{total === 0 ? 'Leeg' : `${total - checked} van ${total} items te gaan`}</p>
                  </div>
                  {total > 0 && (
                    <div className="w-12 text-right">
                      <span className="text-xs font-medium text-ah-blue">{pct}%</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { icon: '🍳', title: 'Recepten', desc: 'Zoek recepten en voeg ingrediënten direct toe', to: '/recipes' },
          { icon: '🔍', title: 'Producten', desc: 'Zoek AH-producten en voeg toe aan je lijst', to: '/products' },
          { icon: '🏷️', title: 'Bonus', desc: 'Bekijk de bonus aanbiedingen van deze week', to: '/bonus' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="card p-5 hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">{item.icon}</div>
            <h2 className="font-semibold text-gray-900 mb-1">{item.title}</h2>
            <p className="text-sm text-gray-500">{item.desc}</p>
          </Link>
        ))}
      </div>

      {!loggedIn && (
        <div className="card p-5 bg-ah-blue/5 border border-ah-blue/20">
          <p className="text-sm text-gray-700 mb-3">
            <strong>Tip:</strong> Log in met je AH-account om boodschappenlijsten te synchroniseren met de Albert Heijn app.
          </p>
          <button
            onClick={() => alert('AH-login werkt alleen bij een echte deployment (niet lokaal). Alle andere functies werken gewoon zonder inloggen!')}
            className="btn-primary text-sm py-1.5"
          >
            Inloggen bij Albert Heijn
          </button>
        </div>
      )}
    </div>
  );
}

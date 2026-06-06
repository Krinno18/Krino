import { Link } from 'react-router-dom';
import { GroceryList } from '../../types';

interface Props {
  list: GroceryList;
  onDelete: (id: number) => void;
}

export default function GroceryListCard({ list, onDelete }: Props) {
  const total = list.items.length;
  const checked = list.items.filter((i) => i.checked).length;

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/lists/${list.id}`} className="font-semibold text-gray-900 hover:text-ah-blue">
          {list.name}
        </Link>
        {list.ah_list_id && (
          <span className="text-xs bg-ah-blue/10 text-ah-blue px-2 py-0.5 rounded-full whitespace-nowrap">
            AH gesync
          </span>
        )}
      </div>

      <div className="text-sm text-gray-500">
        {total === 0 ? (
          'Geen items'
        ) : (
          <>
            {checked}/{total} items afgevinkt
            <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-ah-blue rounded-full transition-all"
                style={{ width: `${(checked / total) * 100}%` }}
              />
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Link to={`/lists/${list.id}`} className="btn-primary text-xs py-1 px-3">
          Openen
        </Link>
        <button
          onClick={() => onDelete(list.id)}
          className="btn-secondary text-xs py-1 px-3 text-red-500 border-red-200 hover:bg-red-50"
        >
          Verwijder
        </button>
      </div>
    </div>
  );
}

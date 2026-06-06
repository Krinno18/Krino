import { GroceryListItem as Item } from '../../types';

interface Props {
  item: Item;
  onToggle: (id: number, checked: boolean) => void;
  onDelete: (id: number) => void;
}

export default function GroceryListItemRow({ item, onToggle, onDelete }: Props) {
  return (
    <div
      className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors ${
        item.checked ? 'bg-gray-50' : 'hover:bg-gray-50'
      }`}
    >
      <input
        type="checkbox"
        checked={item.checked}
        onChange={(e) => onToggle(item.id, e.target.checked)}
        className="w-4 h-4 rounded accent-ah-blue cursor-pointer"
      />
      <span
        className={`flex-1 text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-800'}`}
      >
        {item.quantity !== 1 || item.unit ? (
          <span className="text-gray-500 mr-1">
            {item.quantity}
            {item.unit ? ` ${item.unit}` : 'x'}
          </span>
        ) : null}
        {item.name}
      </span>
      <button
        onClick={() => onDelete(item.id)}
        className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
        title="Verwijder"
      >
        ×
      </button>
    </div>
  );
}

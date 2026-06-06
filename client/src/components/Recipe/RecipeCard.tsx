import { Link } from 'react-router-dom';
import { AHRecipe } from '../../types';

interface Props {
  recipe: AHRecipe;
}

export default function RecipeCard({ recipe }: Props) {
  const image = recipe.images?.[0]?.url;

  return (
    <Link to={`/recipes/${recipe.id}`} className="card overflow-hidden hover:shadow-md transition-shadow block">
      {image && (
        <img src={image} alt={recipe.title} className="w-full h-40 object-cover" />
      )}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{recipe.title}</h3>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          {recipe.cookTime && <span>⏱ {recipe.cookTime} min</span>}
          {recipe.servings && <span>👤 {recipe.servings} pers.</span>}
          <span>🥗 {recipe.ingredients.length} ingrediënten</span>
        </div>
      </div>
    </Link>
  );
}

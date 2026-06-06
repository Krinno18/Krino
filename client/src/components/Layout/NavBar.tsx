import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/lists', label: 'Boodschappenlijsten', icon: '📋' },
  { to: '/recipes', label: 'Recepten', icon: '🍳' },
  { to: '/products', label: 'Producten', icon: '🛒' },
  { to: '/bonus', label: 'Bonus', icon: '🏷️' },
];

export default function NavBar() {
  const location = useLocation();
  const { loggedIn, logout } = useAuthStore();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 flex items-center h-14 gap-6">
        <Link to="/" className="font-bold text-ah-blue text-xl tracking-tight">
          Krino
        </Link>

        <div className="flex items-center gap-1 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.to
                  ? 'bg-ah-blue/10 text-ah-blue'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{item.icon}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {loggedIn ? (
            <button
              onClick={() => logout()}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Uitloggen
            </button>
          ) : (
            <button
              onClick={() => alert('AH-login werkt alleen bij een echte deployment (niet in StackBlitz). Je kunt alle andere functies gewoon gebruiken zonder in te loggen!')}
              className="btn-primary text-sm py-1.5"
            >
              Inloggen bij AH
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Home() {
  const { loggedIn } = useAuthStore();

  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-3">
        Welkom bij <span className="text-ah-blue">Krino</span>
      </h1>
      <p className="text-gray-500 text-lg mb-8">
        Maak boodschappenlijsten, zoek recepten en synchroniseer direct met de Albert Heijn app.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          {
            icon: '📋',
            title: 'Boodschappenlijsten',
            desc: 'Maak en beheer je lijsten',
            to: '/lists',
          },
          {
            icon: '🍳',
            title: 'Recepten',
            desc: 'Zoek AH-recepten en voeg ingrediënten toe',
            to: '/recipes',
          },
          {
            icon: '🛒',
            title: 'Producten',
            desc: 'Zoek AH-producten en voeg toe aan lijst',
            to: '/products',
          },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="card p-5 hover:shadow-md transition-shadow text-left"
          >
            <div className="text-3xl mb-3">{item.icon}</div>
            <h2 className="font-semibold text-gray-900 mb-1">{item.title}</h2>
            <p className="text-sm text-gray-500">{item.desc}</p>
          </Link>
        ))}
      </div>

      {!loggedIn && (
        <div className="card p-6 bg-ah-blue/5 border-ah-blue/20">
          <p className="text-gray-700 mb-3">
            Log in met je Albert Heijn account om lijsten te synchroniseren met de AH app.
          </p>
          <button
            onClick={() => alert('AH-login werkt alleen bij een echte deployment. Alle andere functies (lijsten, recepten, producten zoeken) werken zonder login!')}
            className="btn-primary inline-block"
          >
            Inloggen bij Albert Heijn
          </button>
        </div>
      )}
    </div>
  );
}

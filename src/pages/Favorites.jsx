import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import { useAuth } from '../context/AuthContext';
import { fetchFavoriteProperties } from '../lib/data';

export default function Favorites() {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchFavoriteProperties(user.id)
      .then((rows) => { if (active) setProperties(rows); })
      .catch((err) => { if (active) setError(err.message || 'Could not load saved properties.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.id]);

  return (
    <div className="container page-section">
      <div className="page-head">
        <h1><Heart size={22} /> Saved properties</h1>
        <div className="sub">{loading ? 'Loading saved properties…' : `${properties.length} saved listings`}</div>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {!loading && !error && !properties.length && (
        <div className="empty-state">
          <Heart size={30} />
          <h2>Your saved list is ready</h2>
          <p>Save approved listings to compare them and return later.</p>
          <Link className="btn btn-primary" to="/properties">Explore properties</Link>
        </div>
      )}
      <div className="prop-grid cols-3">
        {properties.map((property) => <PropertyCard key={property.id} property={property} />)}
      </div>
    </div>
  );
}

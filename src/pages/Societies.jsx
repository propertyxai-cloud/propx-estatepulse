import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin } from 'lucide-react';
import { fetchSocieties, formatCurrency } from '../lib/data';

export default function Societies() {
  const [societies,setSocieties] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  useEffect(()=>{
    fetchSocieties().then(setSocieties).catch((err)=>setError(err.message || 'Could not load society directory.')).finally(()=>setLoading(false));
  },[]);
  return (
    <div className="container page-section">
      <div className="page-head"><h1><Building2 size={24}/> Housing society directory</h1><div className="sub">Societies are listed only when they have approved PropertyX properties.</div></div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {loading && <p className="empty-inline">Loading society data…</p>}
      {!loading && !error && societies.length===0 && <div className="empty-state"><Building2 size={32}/><h2>No society data yet</h2><p>Approved listings will populate this directory. No sample ratings or listing counts are displayed.</p><Link to="/post-property" className="btn btn-primary">Post a property</Link></div>}
      <div className="society-grid">{societies.map((society)=>(
        <Link to={`/properties?city=${encodeURIComponent(society.city)}&society=${encodeURIComponent(society.name)}`} className="society-data-card" key={`${society.name}-${society.city}-${society.currency_code}`}>
          <span className="society-card-icon"><Building2 size={20}/></span>
          <h2>{society.name}</h2><p><MapPin size={13}/> {[society.city,society.country].filter(Boolean).join(', ')}</p>
          <div className="society-card-stats"><b>{society.listings_count.toLocaleString()} approved listings</b><span>Average asking price: {formatCurrency(society.average_listing_price,society.currency_code)}</span></div>
        </Link>
      ))}</div>
    </div>
  );
}

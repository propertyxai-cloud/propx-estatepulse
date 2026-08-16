import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin } from 'lucide-react';
import Stars from './Stars';

export default function SocietyCard({ society }) {
  return (
    <Link to="/societies" className="society-card">
      <div className="society-img">
        {society.image_url && <img src={society.image_url} alt={society.name} loading="lazy" />}
        <div className="badges">
          {society.verified && <span className="badge blue"><BadgeCheck size={11} /> Verified</span>}
        </div>
        <div className="society-name-overlay">
          <div className="s-name">{society.name}</div>
          <div className="s-city"><MapPin size={10} /> {society.city}</div>
        </div>
      </div>
      <div className="society-body">
        <div className="society-dev">
          <span>{society.developer}</span>
          <Stars rating={society.rating} />
        </div>
        <div className="society-meta">
          <span><b className="strong">{society.listings_count}</b> Listings</span>
          <span>Avg. <b className="strong">PKR {society.avg_price_per_marla.toFixed(2)} Lac</b>/marla</span>
        </div>
      </div>
    </Link>
  );
}

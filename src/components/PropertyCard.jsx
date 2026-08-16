import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bath, BedDouble, CalendarClock, Eye, Flame, Heart, MapPin, Phone, ShieldCheck, Share2, Ruler, Sparkles } from 'lucide-react';
import { LISTING_TYPE_LABEL } from '../lib/data';

export default function PropertyCard({ property, showMatch = false, showActions = false, onViewing }) {
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState('');
  const p = property;

  const badgeKey = (b) => {
    const k = b.toLowerCase();
    if (k.includes('hot')) return 'hot';
    if (k.includes('docs')) return 'verified';
    if (k.includes('rent')) return 'rent';
    return 'sale';
  };

  const sizeLabel = p.area
    ? `${p.area} ${p.area_unit}`
    : `${p.beds ? p.beds + ' bed' : ''}`;

  return (
    <article className="prop-card">
      <div className="prop-media">
        {p.images?.[0] ? <img src={p.images[0]} alt={p.title} loading="lazy" /> : <img src="/assets/images/placeholder.svg" alt="" loading="lazy" />}
        <div className="badges">
          <span className={`badge ${badgeKey(p.badges?.[0] || p.listing_type)}`}>{p.badges?.[0] || LISTING_TYPE_LABEL[p.listing_type]}</span>
          {p.badges?.slice(1).map((b) => (
            <span key={b} className={`badge ${badgeKey(b)}`}>
              {b.toLowerCase().includes('hot') ? <Flame size={10} /> : b.toLowerCase().includes('docs') ? <ShieldCheck size={10} /> : null}
              {b}
            </span>
          ))}
        </div>
        <div className="prop-top-right">
          <button
            aria-label="Share"
            onClick={() => {
              navigator.clipboard?.writeText(window.location.origin + '/property/' + p.id);
              setToast('Link copied');
              setTimeout(() => setToast(''), 2000);
            }}
          >
            <Share2 size={14} />
          </button>
          <button
            aria-label="Save"
            className={saved ? 'saved' : ''}
            onClick={() => setSaved(!saved)}
          >
            <Heart size={14} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="price-overlay">
          <div>
            <div className="price">{p.price_label}</div>
            {p.installment && <div className="installment">{p.installment}</div>}
          </div>
          <div className="views"><Eye size={12} /> {p.view_count} · {p.posted_months_ago} months ago</div>
        </div>
      </div>

      <div className="prop-body">
        <Link to={`/property/${p.id}`} className="prop-title">{p.title}</Link>
        <div className="prop-loc"><MapPin size={13} /> {p.location || p.city}</div>
        <div className="meta-chips">
          <span className="chip">{p.property_type}</span>
          {p.area && <span className="chip"><Ruler size={11} /> {sizeLabel}</span>}
          {p.beds ? <span className="chip"><BedDouble size={11} /> {p.beds}</span> : null}
          {p.baths ? <span className="chip"><Bath size={11} /> {p.baths}</span> : null}
          {showMatch && p.match_score ? <span className="chip green"><Sparkles size={11} /> {p.match_score}% match</span> : null}
        </div>
        {showActions && p.features?.length > 0 && (
          <div className="meta-chips">
            {p.features.slice(0, 4).map((f) => (
              <span key={f} className="chip gray">{f}</span>
            ))}
          </div>
        )}
        {showActions && (
          <div className="prop-actions-row">
            <button className="btn btn-outline btn-sm" onClick={onViewing}><CalendarClock size={13} /> Viewing</button>
          </div>
        )}
      </div>

      <div className="prop-footer">
        <span className="agent">{p.agent_name}</span>
        <a className="call-link" href={`tel:${p.agent_phone}`}><Phone size={13} /> Call</a>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </article>
  );
}

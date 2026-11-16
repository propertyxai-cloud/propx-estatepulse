import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bath, BedDouble, CalendarClock, Eye, Heart, MapPin, Phone, Ruler, Share2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { addFavorite, formatCurrency, isPropertyFavorite, removeFavorite } from '../lib/data';

export default function PropertyCard({ property, showMatch = false, showActions = false, onViewing }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [imageIndex, setImageIndex] = useState(0);
  const p = property;

  useEffect(() => {
    let active = true;
    if (!user?.id || !p?.id) { setSaved(false); return undefined; }
    isPropertyFavorite(user.id, p.id)
      .then((value) => { if (active) setSaved(value); })
      .catch((error) => console.warn('Could not load favorite state:', error));
    return () => { active = false; };
  }, [user?.id, p?.id]);

  const images = Array.isArray(p.images) && p.images.length ? p.images : [];
  const badgeKey = (badge) => {
    const value = String(badge).toLowerCase();
    if (value.includes('hot')) return 'hot';
    if (value.includes('verified')) return 'verified';
    if (value.includes('rent')) return 'rent';
    return 'sale';
  };
  const sizeLabel = p.area ? `${p.area} ${p.area_unit || ''}`.trim() : null;
  const price = formatCurrency(p.price, p.currency_code || p.currency || 'USD');
  const toggleFavorite = async () => {
    if (!user) { navigate('/login'); return; }
    setSaving(true);
    setMessage('');
    try {
      if (saved) await removeFavorite(user.id, p.id);
      else await addFavorite(user.id, p.id);
      setSaved(!saved);
    } catch (error) {
      setMessage(error.message || 'Could not update saved properties.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="prop-card">
      <div className="prop-media">
        {images.length ? (
          <img src={images[imageIndex]} alt={p.title || 'Property photograph'} loading="lazy" />
        ) : (
          <div className="prop-media-empty" role="img" aria-label="No property photograph uploaded">
            <Ruler size={28} /><span>Photos not supplied</span>
          </div>
        )}
        <div className="badges">
          <span className={`badge ${badgeKey(p.listing_type)}`}>{p.badges?.[0] || (p.listing_type ? p.listing_type.replace('_',' ') : 'Property')}</span>
          {p.verified === true && <span className="badge verified">Verified</span>}
        </div>
        <div className="prop-top-right">
          <button type="button" aria-label="Share property" onClick={async () => {
            const url = `${window.location.origin}/property/${p.id}`;
            try {
              if (navigator.share) await navigator.share({ title: p.title, url });
              else { await navigator.clipboard?.writeText(url); setMessage('Link copied.'); }
            } catch (error) {
              if (error.name !== 'AbortError') setMessage('Unable to share this listing.');
            }
          }}><Share2 size={14} /></button>
          <button type="button" aria-label={saved ? 'Remove saved property' : 'Save property'} className={saved ? 'saved' : ''} disabled={saving} onClick={toggleFavorite}>
            <Heart size={14} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>
        {images.length > 1 && (
          <div className="prop-image-controls">
            <button type="button" aria-label="Previous photo" onClick={() => setImageIndex((i) => (i - 1 + images.length) % images.length)}>‹</button>
            <span>{imageIndex + 1}/{images.length}</span>
            <button type="button" aria-label="Next photo" onClick={() => setImageIndex((i) => (i + 1) % images.length)}>›</button>
          </div>
        )}
        <div className="price-overlay">
          <div className="price">{price}</div>
          <div className="views">{p.view_count ? <><Eye size={12} /> {p.view_count.toLocaleString()}</> : ' '}</div>
        </div>
      </div>
      <div className="prop-body">
        <Link to={`/property/${p.id}`} className="prop-title">{p.title}</Link>
        <div className="prop-loc"><MapPin size={13} /> {[p.location || p.city, p.country].filter(Boolean).join(', ')}</div>
        <div className="meta-chips">
          {p.property_type && <span className="chip">{p.property_type}</span>}
          {sizeLabel && <span className="chip"><Ruler size={11} /> {sizeLabel}</span>}
          {p.beds !== null && p.beds !== undefined && <span className="chip"><BedDouble size={11} /> {p.beds}</span>}
          {p.baths !== null && p.baths !== undefined && <span className="chip"><Bath size={11} /> {p.baths}</span>}
          {showMatch && p.match_score && <span className="chip green"><Sparkles size={11} /> {p.match_score}% match</span>}
        </div>
        {showActions && (
          <div className="prop-actions-row">
            <button type="button" className="btn btn-outline btn-sm" onClick={onViewing || (() => navigate(`/property/${p.id}`))}><CalendarClock size={13} /> Details</button>
          </div>
        )}
        {message && <p className="form-error" role="status">{message}</p>}
      </div>
      <div className="prop-footer">
        <span className="agent">{p.agent_name || 'Owner listed'}</span>
        {p.agent_phone ? <a className="call-link" href={`tel:${p.agent_phone}`}><Phone size={13} /> Call</a> : <Link className="call-link" to={`/property/${p.id}`}>Contact</Link>}
      </div>
    </article>
  );
}

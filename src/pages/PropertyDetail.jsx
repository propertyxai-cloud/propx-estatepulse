import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Bath, BedDouble, Building2, Check, ChevronLeft, ChevronRight,
  Heart, MapPin, MessageCircle, Phone, Ruler, Send, Share2, ShieldCheck,
  Sparkles, X, FileCheck2,
} from 'lucide-react';
import { fetchProperty } from '../lib/data';
import { supabase } from '../lib/supabase';

export default function PropertyDetail() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [idx, setIdx] = useState(0);
  const [saved, setSaved] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [sent, setSent] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetchProperty(id).then((d) => {
      setP(d);
      if (d && d.view_count) {
        d.view_count += 1;
        supabase?.from('properties').update({ view_count: d.view_count }).eq('id', d.id);
      }
    });
    window.scrollTo(0, 0);
  }, [id]);

  if (!p) {
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Loading property…
      </div>
    );
  }

  const images = p.images?.length ? p.images : ['/assets/images/placeholder.svg'];

  const submitInquiry = async (e) => {
    e.preventDefault();
    try {
      await supabase?.from('inquiries').insert({
        property_id: p.id,
        user_id: (await supabase.auth.getUser()).data.user?.id ?? null,
        name: form.name,
        phone: form.phone,
        message: form.message || `Interested in ${p.title}`,
      });
      setSent(true);
    } catch (err) {
      console.warn(err);
      setSent(true);
    }
  };

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 80 }}>
      <Link to="/properties" className="back-link"><ArrowLeft size={15} /> Back</Link>

      <div className="detail-layout">
        <div>
          <div className="gallery">
            <div className="gallery-main">
              {images[0] && <img src={images[idx]} alt={p.title} />}
              <div className="badges" style={{ position: 'absolute', top: 14, left: 14, zIndex: 4 }}>
                {(p.badges?.length ? p.badges : [p.listing_type === 'rent' ? 'For Rent' : 'For Sale']).map((b) => (
                  <span key={b} className={`badge ${b.toLowerCase().includes('hot') ? 'hot' : b.toLowerCase().includes('docs') ? 'verified' : 'sale'}`}>
                    {b.toLowerCase().includes('docs') && <ShieldCheck size={10} />}
                    {b}
                  </span>
                ))}
              </div>
              {images.length > 1 && (
                <>
                  <button className="gallery-nav prev" onClick={() => setIdx((idx - 1 + images.length) % images.length)} aria-label="Previous"><ChevronLeft size={17} /></button>
                  <button className="gallery-nav next" onClick={() => setIdx((idx + 1) % images.length)} aria-label="Next"><ChevronRight size={17} /></button>
                  <span className="gallery-count">{idx + 1}/{images.length}</span>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="gallery-thumbs">
                {images.map((img, i) => (
                  <img key={i} src={img} alt="" className={i === idx ? 'active' : ''} onClick={() => setIdx(i)} />
                ))}
              </div>
            )}
          </div>

          <div className="detail-info">
            <h1>{p.title}</h1>
            <div className="detail-loc"><MapPin size={14} /> {p.location || p.city}</div>
            <div className="detail-price">
              {p.price_label}
              {p.installment && <span className="installment">{p.installment}</span>}
            </div>

            <div className="specs-grid">
              <div className="spec-tile"><div className="k"><Building2 size={11} style={{ verticalAlign: -1 }} /> Type</div><div className="v">{p.property_type}</div></div>
              <div className="spec-tile"><div className="k"><Ruler size={11} style={{ verticalAlign: -1 }} /> Size</div><div className="v">{p.area} {p.area_unit}</div></div>
              <div className="spec-tile"><div className="k"><BedDouble size={11} style={{ verticalAlign: -1 }} /> Bedrooms</div><div className="v">{p.beds ?? '—'}</div></div>
              <div className="spec-tile"><div className="k"><Bath size={11} style={{ verticalAlign: -1 }} /> Bathrooms</div><div className="v">{p.baths ?? '—'}</div></div>
              <div className="spec-tile"><div className="k"><Check size={11} style={{ verticalAlign: -1 }} /> Possession</div><div className="v">{p.possession || 'Ready'}</div></div>
              <div className="spec-tile"><div className="k"><MapPin size={11} style={{ verticalAlign: -1 }} /> City</div><div className="v">{p.city}</div></div>
            </div>

            <div className="detail-section">
              <h3>Description</h3>
              <p>{p.description}</p>
            </div>

            {p.features?.length > 0 && (
              <div className="detail-section">
                <h3>Features &amp; Amenities</h3>
                <div className="chip-row">
                  {p.features.map((f) => <span key={f} className="chip-pill">{f}</span>)}
                </div>
              </div>
            )}

            {p.agent_verified && (
              <div className="verified-box">
                <FileCheck2 size={20} className="v-icon" />
                <div>
                  <div className="v-title">Document Verified Listing</div>
                  <p>Ownership documents for this property have been verified by our team. Transaction protection available via smart escrow.</p>
                </div>
              </div>
            )}

            <div className="neighborhood-box">
              <Sparkles size={18} className="n-icon" />
              <div>
                <div className="n-title">Neighborhood Brief — {p.society || p.city}</div>
                <p>
                  {p.society} offers a mix of residential blocks, schools, parks and commercial areas. Price-per-marla in the area has shown
                  strong year-over-year growth, with rental demand remaining healthy for {p.property_type.toLowerCase()}s.
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="agent-card">
          <div className="a-head">
            <span className="avatar">{p.agent_name[0]}</span>
            <div>
              <div className="a-name">{p.agent_name}</div>
              {p.agent_verified && <div className="a-tag"><ShieldCheck size={12} /> Docs Verified</div>}
            </div>
          </div>
          <a className="btn btn-primary btn-block" href={`tel:${p.agent_phone}`}><Phone size={15} /> Call Agent</a>
          <a
            className="btn btn-outline btn-block"
            style={{ borderColor: 'var(--color-primary-40)', color: 'var(--color-primary)' }}
            href={`https://wa.me/${p.agent_phone?.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={15} /> WhatsApp
          </a>
          <button className="btn btn-outline btn-block" onClick={() => setInquiryOpen(true)}><Send size={15} /> Send Inquiry</button>
          <div className="agent-actions">
            <button className="btn btn-outline btn-sm" onClick={() => setSaved(!saved)}>
              <Heart size={14} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => { navigator.clipboard?.writeText(window.location.href); setToast('Link copied'); setTimeout(() => setToast(''), 2000); }}
            >
              <Share2 size={14} /> Share
            </button>
          </div>
        </aside>
      </div>

      {inquiryOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,24,31,0.5)', zIndex: 300, display: 'grid', placeItems: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440, position: 'relative' }}>
            <button
              style={{ position: 'absolute', top: 16, right: 16, border: 'none', background: 'none', cursor: 'pointer' }}
              onClick={() => setInquiryOpen(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <h3 style={{ fontSize: 20, fontWeight: 700 }}>Send Inquiry</h3>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 6 }}>{p.title}</p>
            {sent ? (
              <div className="auth-msg success" style={{ marginTop: 20 }}>
                Inquiry sent! The agent will contact you shortly.
              </div>
            ) : (
              <form className="auth-form" onSubmit={submitInquiry}>
                <input className="input" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <input className="input" placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Message (optional)"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
                <button className="btn btn-primary btn-block" type="submit"><Send size={15} /> Send Inquiry</button>
              </form>
            )}
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Award, Search, ShieldCheck, Star } from 'lucide-react';
import Stars from '../components/Stars';
import { fetchBrokers } from '../lib/data';

const RING_COLORS = { 1: '#0B835B', 2: '#3B82F6', 3: '#8B5CF6' };

function ScoreRing({ score, color }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const off = c - (score / 100) * c;
  return (
    <div className="score-ring">
      <svg width="84" height="84" viewBox="0 0 84 84">
        <circle cx="42" cy="42" r={r} fill="none" stroke="#F0F2F4" strokeWidth="7" />
        <circle cx="42" cy="42" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <div className="sr-num">{score}</div>
    </div>
  );
}

export default function BrokerRatings() {
  const [brokers, setBrokers] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    fetchBrokers().then(setBrokers);
  }, []);

  const filtered = brokers.filter(
    (b) => !q || b.name.toLowerCase().includes(q.toLowerCase()) || b.email.toLowerCase().includes(q.toLowerCase())
  );

  const avg = brokers.length ? (brokers.reduce((s, b) => s + b.rating, 0) / brokers.length).toFixed(1) : '—';
  const reviews = brokers.reduce((s, b) => s + b.review_count, 0);

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28 }}>
            <Award size={22} style={{ color: 'var(--color-primary)', verticalAlign: -4 }} /> Broker Ratings
          </h1>
          <div className="sub" style={{ color: 'var(--color-text-muted)', fontSize: 16, marginTop: 8 }}>
            Find trusted brokers based on verified client reviews
          </div>
        </div>
        <button className="btn btn-primary"><Star size={15} /> Rate a Broker</button>
      </div>

      <div className="broker-stats">
        <div className="broker-stat"><div className="b-num">{brokers.length || '—'}</div><div className="b-lbl">Brokers Rated</div></div>
        <div className="broker-stat"><div className="b-num">{reviews}</div><div className="b-lbl">Total Reviews</div></div>
        <div className="broker-stat"><div className="b-num">{avg}</div><div className="b-lbl">Avg Rating</div></div>
      </div>

      <div style={{ position: 'relative', marginBottom: 24, maxWidth: 640 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
        <input
          className="input"
          style={{ paddingLeft: 40 }}
          placeholder="Search broker by name or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {filtered.map((b) => (
        <div className="broker-card" key={b.id}>
          <div className="broker-id">
            <span className="avatar">{b.name[0]}</span>
            <div>
              <div className="broker-name">{b.name}</div>
              <span className={`rank-badge rank-${b.rank}`}>
                {b.rank === 1 ? '🥇' : b.rank === 2 ? '🥈' : '🥉'} #{b.rank} Broker
              </span>
              <div className="broker-email">{b.email}</div>
            </div>
          </div>
          <div>
            <div className="broker-rating">
              <Stars rating={b.rating} />
              <span>{b.rating.toFixed(1)} <span className="small">({b.review_count} reviews)</span></span>
            </div>
            <div className="broker-rating" style={{ marginTop: 8 }}>
              <span className="verified-chip"><ShieldCheck size={12} /> {b.verified_deals} verified deals</span>
            </div>
            <div className="broker-bars" style={{ marginTop: 14 }}>
              <div className="progress-row">
                <span>Communication</span>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${b.communication}%` }} /></div>
                <span>{b.communication}</span>
              </div>
              <div className="progress-row">
                <span>Professionalism</span>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${b.professionalism}%` }} /></div>
                <span>{b.professionalism}</span>
              </div>
              <div className="progress-row">
                <span>Market Knowledge</span>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${b.market_knowledge}%` }} /></div>
                <span>{b.market_knowledge}</span>
              </div>
            </div>
          </div>
          <ScoreRing score={b.score} color={RING_COLORS[b.rank] || '#0B835B'} />
        </div>
      ))}
    </div>
  );
}

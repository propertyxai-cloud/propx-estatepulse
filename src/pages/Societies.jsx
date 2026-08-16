import { useEffect, useState } from 'react';
import SocietyCard from '../components/SocietyCard';
import { fetchSocieties } from '../lib/data';

export default function Societies() {
  const [societies, setSocieties] = useState([]);

  useEffect(() => {
    fetchSocieties().then(setSocieties);
  }, []);

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
      <div className="page-head" style={{ paddingTop: 0 }}>
        <h1>Housing Societies</h1>
        <div className="sub">Top housing schemes across Pakistan</div>
      </div>
      {societies.length ? (
        <div className="society-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {societies.map((s) => <SocietyCard key={s.id} society={s} />)}
        </div>
      ) : (
        <p style={{ color: 'var(--color-text-muted)' }}>Loading societies…</p>
      )}
    </div>
  );
}

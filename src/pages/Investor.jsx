import { useEffect, useState } from 'react';
import { Info, TrendingUp } from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import { fetchProperties } from '../lib/data';

export default function Investor() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    minRoi: '',
    minYield: '',
    maxPrice: '',
    minPriceUnit: '',
    possession: 'Any possession',
    taggedOnly: false,
  });

  useEffect(() => {
    setLoading(true);
    fetchProperties({
      investmentOnly: filters.taggedOnly || undefined,
      minRoi: filters.minRoi || undefined,
      minYield: filters.minYield || undefined,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) * 10000000 : 0,
    }).then((d) => {
      let list = d;
      if (filters.possession !== 'Any possession') {
        list = list.filter((p) => (p.possession || 'Ready') === filters.possession);
      }
      setProperties(list);
      setLoading(false);
    });
  }, [filters]);

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28 }}>
        <TrendingUp size={22} style={{ color: 'var(--color-primary)', verticalAlign: -4 }} /> Investor Mode
      </h1>
      <div className="sub" style={{ color: 'var(--color-text-muted)', fontSize: 16, marginTop: 8 }}>
        Discover listings by estimated ROI, rental yield, price per unit, and possession.
      </div>

      <div className="disclaimer">
        <Info size={16} style={{ flexShrink: 0, color: 'var(--color-primary)' }} />
        Figures are estimates based on historical or AI-generated projections — not guaranteed returns. Always verify with a licensed advisor.
      </div>

      <div className="investor-filters">
        <div className="filter-field">
          <label>Min ROI %</label>
          <input className="input" type="number" placeholder="e.g. 8" value={filters.minRoi} onChange={(e) => setFilters({ ...filters, minRoi: e.target.value })} />
        </div>
        <div className="filter-field">
          <label>Min Yield %</label>
          <input className="input" type="number" placeholder="e.g. 5" value={filters.minYield} onChange={(e) => setFilters({ ...filters, minYield: e.target.value })} />
        </div>
        <div className="filter-field">
          <label>Max entry price (Crore)</label>
          <input className="input" type="number" placeholder="e.g. 3" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} />
        </div>
        <div className="filter-field">
          <label>Min price/unit</label>
          <input className="input" type="number" placeholder="PKR" value={filters.minPriceUnit} onChange={(e) => setFilters({ ...filters, minPriceUnit: e.target.value })} />
        </div>
        <div className="filter-field">
          <label>Possession</label>
          <select className="select" value={filters.possession} onChange={(e) => setFilters({ ...filters, possession: e.target.value })}>
            <option>Any possession</option><option>Ready</option><option>Under Construction</option>
          </select>
        </div>
        <label className="checkbox-label" style={{ paddingBottom: 10 }}>
          <input type="checkbox" checked={filters.taggedOnly} onChange={(e) => setFilters({ ...filters, taggedOnly: e.target.checked })} />
          Investment-tagged listings only
        </label>
        <button className="btn btn-outline btn-sm" onClick={() => setFilters({ minRoi: '', minYield: '', maxPrice: '', minPriceUnit: '', possession: 'Any possession', taggedOnly: false })}>
          Reset
        </button>
      </div>

      <div className="results-head">
        <span className="results-count">{loading ? '…' : `${properties.length} matches`}</span>
      </div>

      <div className="prop-grid cols-3">
        {properties.map((p) => (
          <div key={p.id}>
            <PropertyCard property={p} />
            {(p.est_roi || p.est_yield) && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {p.est_yield ? <span className="roi-badge">Est. Yield <b>{p.est_yield}%</b></span> : null}
                {p.est_roi ? <span className="roi-badge">Est. ROI <b>{p.est_roi}%</b></span> : null}
              </div>
            )}
          </div>
        ))}
      </div>
      {!loading && !properties.length && (
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 48 }}>No investment matches found for these filters.</p>
      )}
    </div>
  );
}

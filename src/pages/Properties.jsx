import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Grid3X3, List, Map as MapIcon, Mic, Search, Sparkles, SlidersHorizontal } from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import { fetchProperties } from '../lib/data';

const TYPE_OPTIONS = ['All Types', 'House', 'Apartment', 'Residential Plot', 'Farmhouse'];
const CITY_OPTIONS = ['All Cities', 'Lahore', 'Islamabad', 'Rawalpindi'];
const SOCIETY_OPTIONS = ['All Societies', 'DHA Lahore', 'Bahria Town', 'Lake City', 'Gulberg', 'Capital Smart City', 'Al-Kabir Town', 'Park View City', 'F-11', 'Cantt'];
const SORT_OPTIONS = ['Newest First', 'Price: Low to High', 'Price: High to Low'];

export default function Properties() {
  const [params] = useSearchParams();
  const [view, setView] = useState('grid');
  const [tab, setTab] = useState(params.get('type') || 'sale');
  const [filters, setFilters] = useState({
    city: 'All Cities',
    society: 'All Societies',
    propertyType: 'All Types',
    beds: 'Any',
    maxPrice: 0,
    sort: 'Newest First',
    query: params.get('q') || '',
  });
  const [aiQuery, setAiQuery] = useState(params.get('q') || '');
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTab(params.get('type') || 'sale');
  }, [params]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      fetchProperties({ ...filters, listingType: tab, maxPrice: filters.maxPrice > 0 ? filters.maxPrice : 0 })
        .then((data) => setProperties(data))
        .finally(() => setLoading(false));
    }, 120);
    return () => clearTimeout(t);
  }, [filters, tab]);

  const count = useMemo(() => properties.length, [properties]);

  return (
    <div>
      <div className="container">
        <div className="page-head">
          <h1>Buy Property</h1>
          <div className="sub">{loading ? 'Loading…' : `${count} properties found`}</div>
        </div>

        <div className="tabs" style={{ marginBottom: 20 }}>
          {['sale', 'rent', 'lease'].map((t) => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'sale' ? 'Buy' : t === 'rent' ? 'Rent' : 'Lease'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <div className="view-toggle">
            <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}><Grid3X3 size={14} /> Grid</button>
            <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}><List size={14} /> List</button>
            <button className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}><MapIcon size={14} /> Map</button>
          </div>
          <div className="view-toggle">
            <button>+ List</button>
            <button>Full Map</button>
            <button>Compare</button>
          </div>
        </div>

        <form
          className="ai-search-bar"
          onSubmit={(e) => { e.preventDefault(); setFilters((f) => ({ ...f, query: aiQuery })); }}
        >
          <Sparkles size={16} />
          <input
            placeholder="Try: '3 bed house in Bahria Town under 2 crore with a garden'"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
          />
          <Mic size={16} />
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
        </form>

        <div className="filters-layout">
          <aside className="filter-sidebar">
            <h4><SlidersHorizontal size={14} style={{ verticalAlign: -2 }} /> Filters</h4>
            <div className="filter-group">
              <input
                className="input"
                placeholder="Search…"
                value={filters.query}
                onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
              />
            </div>
            <div className="filter-group">
              <select
                className="select"
                value={filters.city}
                onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
              >
                {CITY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <select
                className="select"
                value={filters.propertyType}
                onChange={(e) => setFilters((f) => ({ ...f, propertyType: e.target.value }))}
              >
                {TYPE_OPTIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <select
                className="select"
                value={filters.society}
                onChange={(e) => setFilters((f) => ({ ...f, society: e.target.value }))}
              >
                {SOCIETY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <select
                className="select"
                value={filters.beds}
                onChange={(e) => setFilters((f) => ({ ...f, beds: e.target.value }))}
              >
                {['Any', '1', '2', '3', '4', '5', '6'].map((b) => <option key={b} value={b}>{b === 'Any' ? 'Any' : `${b}+ Bedrooms`}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <div className="range-labels">
                <span>Contact for Price</span>
                <span>PKR {filters.maxPrice === 0 ? '50.00 Crore' : `${(filters.maxPrice / 10000000).toFixed(2)} Crore`}</span>
              </div>
              <input
                type="range"
                min="0"
                max="500000000"
                step="1000000"
                value={filters.maxPrice}
                onChange={(e) => setFilters((f) => ({ ...f, maxPrice: Number(e.target.value) }))}
              />
            </div>
            <div className="filter-group">
              <select
                className="select"
                value={filters.sort}
                onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
              >
                {SORT_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </aside>

          <main>
            <div className="results-head">
              <span className="results-count">{count} matches</span>
            </div>
            <div className={`prop-grid ${view === 'grid' ? 'cols-3' : ''} ${view === 'list' ? 'list-view' : ''}`}>
              {properties.map((p) => (
                <PropertyCard key={p.id} property={p} showMatch showActions />
              ))}
            </div>
            {!loading && properties.length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 48 }}>
                No properties match your filters. Try widening the search.
              </p>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

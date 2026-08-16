import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LocateFixed, MapPin, Radio } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchProperties } from '../lib/data';

export default function MapSearch() {
  const [properties, setProperties] = useState([]);
  const [selected, setSelected] = useState(null);
  const [radius, setRadius] = useState(10);
  const [alerts, setAlerts] = useState(false);
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    fetchProperties().then((d) => setProperties(d.filter((p) => p.lat && p.lng)));
  }, []);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    mapRef.current = L.map(mapEl.current, { scrollWheelZoom: false }).setView([31.52, 74.35], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(mapRef.current);
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    properties.forEach((p) => {
      const icon = L.divIcon({
        className: '',
        html: `<div class="map-pin ${selected === p.id ? 'selected' : ''}" style="${selected === p.id ? 'background:#F97316' : ''}">P</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 26],
      });
      const marker = L.marker([p.lat, p.lng], { icon }).addTo(mapRef.current);
      marker.on('click', () => setSelected(p.id));
      markersRef.current.push(marker);
    });
    if (selected) {
      const p = properties.find((x) => x.id === selected);
      if (p) mapRef.current.flyTo([p.lat, p.lng], 13);
    }
  }, [properties, selected]);

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28 }}>
          <MapPin size={22} style={{ color: 'var(--color-primary)', verticalAlign: -3 }} /> Map Search
        </h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="select" style={{ width: 130 }} defaultValue="Lahore">
            <option>Lahore</option><option>Islamabad</option><option>Rawalpindi</option>
          </select>
          <select className="select" style={{ width: 110 }} defaultValue="All">
            <option>All</option><option>House</option><option>Plot</option><option>Apartment</option>
          </select>
          <span className="toggle-pill" style={{ fontSize: 13 }}>Radius {radius} km
            <input type="range" min="2" max="30" value={radius} onChange={(e) => setRadius(e.target.value)} style={{ width: 80 }} />
          </span>
          <span className="toggle-pill">Alerts <input type="checkbox" checked={alerts} onChange={(e) => setAlerts(e.target.checked)} /></span>
          <button className="btn btn-outline btn-sm"><LocateFixed size={14} /> My location</button>
          <span className="results-count">{properties.length} properties</span>
        </div>
      </div>

      <div className="map-layout" style={{ marginTop: 20 }}>
        <div className="map-sidebar">
          {properties.map((p) => (
            <div
              key={p.id}
              className="map-card-item"
              style={selected === p.id ? { borderColor: 'var(--color-primary)' } : undefined}
              onClick={() => setSelected(p.id)}
            >
              {p.images?.[0] && <img src={p.images[0]} alt={p.title} />}
              <div>
                <Link to={`/property/${p.id}`} className="mc-title">{p.title}</Link>
                <div className="mc-meta">{p.price_label} · {p.property_type} {p.beds ? `· ${p.beds} bed` : ''}</div>
                <div className="mc-meta"><MapPin size={11} style={{ verticalAlign: -1 }} /> {p.society || p.city}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="map-area" ref={mapEl} aria-label="Property map" />
      </div>
      {alerts && (
        <div className="insight-card" style={{ marginTop: 16 }}>
          <div className="insight-text"><Radio size={16} /> Hyper-local alerts enabled — we'll notify you when new listings appear in this radius.</div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Sparkles, TrendingUp } from 'lucide-react';
import { TREND_DATA } from '../lib/data';

export default function PriceTrends() {
  const [tab, setTab] = useState('society');
  const [city, setCity] = useState('Lahore');

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 36 }}>Price Trends</h1>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 16, marginTop: 8 }}>
            Track real estate price movements across Pakistan
          </div>
        </div>
        <select className="select" style={{ width: 140 }} value={city} onChange={(e) => setCity(e.target.value)}>
          <option>Lahore</option>
          <option>Islamabad</option>
          <option>Rawalpindi</option>
        </select>
      </div>

      <div className="trend-stats">
        <div className="trend-stat green">
          <div className="t-up"><TrendingUp size={18} style={{ verticalAlign: -2 }} /> +39.6%</div>
          <div className="t-sub">DHA · YTD 2025</div>
        </div>
        <div className="trend-stat blue">
          <div className="t-up"><TrendingUp size={18} style={{ verticalAlign: -2 }} /> +40.6%</div>
          <div className="t-sub">Bahria Town · YTD 2025</div>
        </div>
        <div className="trend-stat purple">
          <div className="t-up"><TrendingUp size={18} style={{ verticalAlign: -2 }} /> +29.4%</div>
          <div className="t-sub">Gulberg/F-Sectors · YTD 2025</div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${tab === 'society' ? 'active' : ''}`} onClick={() => setTab('society')}>Society Price Trends</button>
        <button className={`tab ${tab === 'type' ? 'active' : ''}`} onClick={() => setTab('type')}>By Property Type</button>
      </div>

      <div className="chart-card">
        <h3>Price per Marla (PKR) — {city} 2025</h3>
        <div className="chart-sub">Monthly average prices across top societies</div>
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={TREND_DATA} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gDHA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0B835B" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#0B835B" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gBahria" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gGulberg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E6E9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6A7181' }} tickLine={false} axisLine={{ stroke: '#E2E6E9' }} />
            <YAxis tick={{ fontSize: 11, fill: '#6A7181' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}L`} width={48} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #E2E6E9', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13 }}
              formatter={(v) => [`PKR ${v} Lac`, undefined]}
            />
            <Area type="monotone" dataKey="DHA" stroke="#0B835B" strokeWidth={2.5} fill="url(#gDHA)" />
            <Area type="monotone" dataKey="Bahria" stroke="#3B82F6" strokeWidth={2.5} fill="url(#gBahria)" />
            <Area type="monotone" dataKey="Gulberg" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#gGulberg)" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="chart-legend">
          <span className="legend-item"><span className="legend-dot" style={{ background: '#0B835B' }} /> DHA</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: '#3B82F6' }} /> Bahria Town</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: '#8B5CF6' }} /> Gulberg / F-Sectors</span>
        </div>
      </div>

      <div className="insight-card">
        <div className="insight-text"><Sparkles size={16} /> AI Market Insight</div>
        <button className="btn btn-primary btn-sm">Get AI Analysis</button>
      </div>
    </div>
  );
}

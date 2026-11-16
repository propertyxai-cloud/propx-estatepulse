import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowUpRight, BrainCircuit, Building2, CircleDollarSign, Globe2, ShieldCheck, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const tiles = [
  { key: 'properties', label: 'Property inventory', icon: Building2, note: 'Listings in marketplace' },
  { key: 'reports', label: 'AI intelligence reports', icon: BrainCircuit, note: 'User-scoped reports' },
  { key: 'tasks', label: 'AI workflow tasks', icon: Activity, note: 'Jobs visible to your account' },
  { key: 'markets', label: 'Market observations', icon: Globe2, note: 'Published intelligence points' },
];

export default function CeoCommandCenter() {
  const { user, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState({ properties: 0, reports: 0, tasks: 0, markets: 0 });
  const [status, setStatus] = useState('Loading live workspace data…');
  const [busy, setBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  const refresh = async () => {
    if (!supabase || !user) {
      setStatus('Sign in to connect the CEO workspace to live Supabase data.');
      return;
    }
    setBusy(true);
    setStatus('Refreshing connected metrics…');
    const queries = [
      supabase.from('properties').select('id', { count: 'exact', head: true }),
      supabase.from('property_intelligence_reports').select('id', { count: 'exact', head: true }),
      supabase.from('ai_tasks').select('id', { count: 'exact', head: true }),
      supabase.from('market_observations').select('id', { count: 'exact', head: true }),
    ];
    const results = await Promise.all(queries);
    const errors = results.filter((r) => r.error);
    setMetrics({
      properties: results[0].count || 0,
      reports: results[1].count || 0,
      tasks: results[2].count || 0,
      markets: results[3].count || 0,
    });
    setUpdatedAt(new Date());
    setStatus(errors.length ? 'Some metrics are unavailable. Check Data API exposure and RLS grants in Supabase.' : 'Connected to the PROPERTYXAI Supabase project.');
    setBusy(false);
  };

  useEffect(() => {
    if (!authLoading) refresh();
  }, [authLoading, user?.id]);

  const cards = useMemo(() => tiles.map((tile) => ({ ...tile, value: metrics[tile.key] })), [metrics]);

  return (
    <section className="container" style={{ paddingTop: 42, paddingBottom: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div className="section-label"><ShieldCheck size={14} /> EXECUTIVE CONTROL PLANE</div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 34, marginTop: 14 }}>PROPERTYXAI CEO Command Center</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 8, maxWidth: 700 }}>A live operating view across marketplace inventory, AI intelligence, and global market data. Metrics respect your Supabase row-level security permissions.</p>
        </div>
        <button className="btn btn-primary" onClick={refresh} disabled={busy || !user}><Activity size={16} /> {busy ? 'Refreshing…' : 'Refresh live data'}</button>
      </div>

      <div style={{ marginTop: 18, padding: 14, borderRadius: 10, border: '1px solid var(--color-border)', background: '#fff', color: 'var(--color-text-muted)', fontSize: 13 }}>
        {status}{updatedAt ? ` Last checked ${updatedAt.toLocaleString()}.` : ''}
      </div>

      {!authLoading && !user && <div className="disclaimer" style={{ marginTop: 18 }}><AlertTriangle size={16} /> Sign in to view metrics available to your account.</div>}

      <div className="prop-grid cols-4" style={{ marginTop: 26 }}>
        {cards.map(({ key, label, icon: Icon, note, value }) => (
          <article key={key} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 14, padding: 20, minHeight: 145 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-primary)' }}><Icon size={20} /><ArrowUpRight size={16} /></div>
            <div style={{ fontSize: 30, fontWeight: 700, marginTop: 16 }}>{value.toLocaleString()}</div>
            <div style={{ fontWeight: 600, marginTop: 3 }}>{label}</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 4 }}>{note}</div>
          </article>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 18, marginTop: 24 }}>
        <article style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 14, padding: 22 }}>
          <h2 style={{ fontSize: 17, display: 'flex', gap: 9, alignItems: 'center' }}><Globe2 size={18} color="var(--color-primary)" /> Global rollout readiness</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 9 }}>Launch each market only after local data rights, regulatory review, listing verification, payments, and support operations are ready.</p>
          <ul style={{ paddingLeft: 19, marginTop: 12, lineHeight: 1.9, fontSize: 13 }}><li>Pakistan: validate partner supply and listing provenance.</li><li>UAE: secure broker/developer feeds and local compliance review.</li><li>Next markets: require a repeatable country launch scorecard.</li></ul>
        </article>
        <article style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 14, padding: 22 }}>
          <h2 style={{ fontSize: 17, display: 'flex', gap: 9, alignItems: 'center' }}><CircleDollarSign size={18} color="var(--color-primary)" /> Intelligence quality gate</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 9 }}>AI estimates must include confidence, methodology version, comparable evidence, data freshness, and an explicit non-appraisal disclaimer.</p>
        </article>
        <article style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 14, padding: 22 }}>
          <h2 style={{ fontSize: 17, display: 'flex', gap: 9, alignItems: 'center' }}><Users size={18} color="var(--color-primary)" /> Enterprise access</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 9 }}>Organization roles and RLS provide the starting point for tenant isolation. SSO, advanced audit, provisioning, and formal security review remain enterprise launch requirements.</p>
        </article>
      </div>
    </section>
  );
}

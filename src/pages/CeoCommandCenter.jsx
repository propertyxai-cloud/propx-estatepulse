import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowUpRight, BrainCircuit, Building2, CircleDollarSign, Globe2, ShieldCheck, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const tiles = [
  { key: 'properties', label: 'Property inventory', icon: Building2, note: 'Marketplace listings' },
  { key: 'reports', label: 'AI intelligence reports', icon: BrainCircuit, note: 'Administrator-visible reports' },
  { key: 'tasks', label: 'AI workflow tasks', icon: Activity, note: 'Administrator-visible jobs' },
  { key: 'markets', label: 'Market observations', icon: Globe2, note: 'Published intelligence points' },
];

export default function CeoCommandCenter() {
  const { user, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState({ properties: 0, reports: 0, tasks: 0, markets: 0 });
  const [status, setStatus] = useState('Checking executive access…');
  const [busy, setBusy] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  const refresh = async () => {
    if (!supabase || !user) {
      setAuthorized(false);
      setStatus('Sign in with an authorized PROPERTYX administrator account.');
      return;
    }
    setBusy(true);
    setStatus('Verifying administrator permissions…');
    try {
      const { data: isAdmin, error: accessError } = await supabase.rpc('is_propertyx_admin');
      if (accessError || isAdmin !== true) {
        setAuthorized(false);
        setStatus('Access restricted. Only authorized PROPERTYX administrators can view executive metrics.');
        return;
      }
      setAuthorized(true);
      const queries = [
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        supabase.from('property_intelligence_reports').select('id', { count: 'exact', head: true }),
        supabase.from('ai_tasks').select('id', { count: 'exact', head: true }),
        supabase.from('market_observations').select('id', { count: 'exact', head: true }),
      ];
      const results = await Promise.all(queries);
      const errors = results.filter((r) => r.error);
      setMetrics({ properties: results[0].count || 0, reports: results[1].count || 0, tasks: results[2].count || 0, markets: results[3].count || 0 });
      setUpdatedAt(new Date());
      setStatus(errors.length ? 'Some metrics are unavailable. Check Supabase Data API exposure and grants.' : 'Connected to PROPERTYXAI Supabase.');
    } catch {
      setAuthorized(false);
      setStatus('Could not verify executive access. Contact the platform administrator.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { if (!authLoading) refresh(); }, [authLoading, user?.id]);
  const cards = useMemo(() => tiles.map((tile) => ({ ...tile, value: metrics[tile.key] })), [metrics]);

  if (!authLoading && !user) return <section className="container" style={{ paddingTop: 56, paddingBottom: 80 }}><div className="disclaimer"><AlertTriangle size={16} /> Sign in with an authorized PROPERTYX administrator account to access CEO HQ.</div></section>;

  return (
    <section className="container" style={{ paddingTop: 42, paddingBottom: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div className="section-label"><ShieldCheck size={14} /> EXECUTIVE CONTROL PLANE</div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 34, marginTop: 14 }}>PROPERTYXAI CEO Command Center</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 8, maxWidth: 700 }}>Live operating metrics across marketplace inventory, AI intelligence, and global market data. Access is checked against the platform's administrator authorization function.</p>
        </div>
        <button className="btn btn-primary" onClick={refresh} disabled={busy || !user}><Activity size={16} /> {busy ? 'Refreshing…' : 'Refresh live data'}</button>
      </div>
      <div style={{ marginTop: 18, padding: 14, borderRadius: 10, border: '1px solid var(--color-border)', background: '#fff', color: 'var(--color-text-muted)', fontSize: 13 }}>{status}{updatedAt ? ` Last checked ${updatedAt.toLocaleString()}.` : ''}</div>
      {authorized && <>
        <div className="prop-grid cols-4" style={{ marginTop: 26 }}>
          {cards.map(({ key, label, icon: Icon, note, value }) => <article key={key} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 14, padding: 20, minHeight: 145 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-primary)' }}><Icon size={20} /><ArrowUpRight size={16} /></div>
            <div style={{ fontSize: 30, fontWeight: 700, marginTop: 16 }}>{value.toLocaleString()}</div><div style={{ fontWeight: 600, marginTop: 3 }}>{label}</div><div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 4 }}>{note}</div>
          </article>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 18, marginTop: 24 }}>
          <article style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 14, padding: 22 }}><h2 style={{ fontSize: 17, display: 'flex', gap: 9, alignItems: 'center' }}><Globe2 size={18} color="var(--color-primary)" /> Global rollout readiness</h2><p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 9 }}>Launch a market only after data rights, local legal review, listing verification, payment rails, and support operations are ready.</p><ul style={{ paddingLeft: 19, marginTop: 12, lineHeight: 1.9, fontSize: 13 }}><li>Pakistan: validate partner supply and listing provenance.</li><li>UAE: secure broker/developer feeds and compliance review.</li><li>New markets: use a repeatable country launch scorecard.</li></ul></article>
          <article style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 14, padding: 22 }}><h2 style={{ fontSize: 17, display: 'flex', gap: 9, alignItems: 'center' }}><CircleDollarSign size={18} color="var(--color-primary)" /> Intelligence quality gate</h2><p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 9 }}>AI estimates must show confidence, methodology version, comparable evidence, data freshness, and a non-appraisal disclaimer.</p></article>
          <article style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 14, padding: 22 }}><h2 style={{ fontSize: 17, display: 'flex', gap: 9, alignItems: 'center' }}><Users size={18} color="var(--color-primary)" /> Enterprise access</h2><p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 9 }}>Organization roles and RLS establish tenant isolation. SSO, advanced audit, provisioning, and formal security review remain enterprise launch requirements.</p></article>
        </div>
      </>}
      {!authorized && <div className="disclaimer" style={{ marginTop: 18 }}><AlertTriangle size={16} /> Executive metrics remain hidden until administrator authorization is confirmed.</div>}
    </section>
  );
}

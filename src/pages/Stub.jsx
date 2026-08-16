import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Compass, Flame, Gauge, MessageSquare, PieChart, Swords, Wallet } from 'lucide-react';

const STUBS = {
  rentals: { icon: Building2, title: 'Rentals', desc: 'Long-term and short-term rental discovery across Pakistan. Filter by city, society, budget and amenities.', links: [{ to: '/properties?type=rent', label: 'Browse rentals' }, { to: '/ai-search', label: 'Ask the AI advisor' }] },
  portfolio: { icon: PieChart, title: 'Portfolio', desc: 'Track holdings, rental yields, and capital gains across all your properties in one investor dashboard.', links: [{ to: '/investor', label: 'Open investor mode' }, { to: '/login', label: 'Create account' }] },
  'roi-battle': { icon: Swords, title: 'ROI Battle', desc: 'Compare deals head-to-head on ROI, yield, and appreciation to find the strongest investment.', links: [{ to: '/investor', label: 'Explore investments' }] },
  heatmap: { icon: Gauge, title: 'Heatmap', desc: 'Neighborhood heatmaps showing price density, demand, and growth across Pakistan\u2019s top societies.', links: [{ to: '/price-trends', label: 'View price trends' }] },
  auctions: { icon: Flame, title: 'Auctions', desc: 'Upcoming property auctions with verified ownership. Bid safely with smart escrow.', links: [{ to: '/properties', label: 'Browse properties' }] },
  community: { icon: MessageSquare, title: 'Community', desc: 'Join buyers, sellers and agents discussing markets, societies and deals across Pakistan.', links: [{ to: '/societies', label: 'Explore societies' }] },
  about: { icon: Compass, title: 'About EstatePulse', desc: 'EstatePulse is Pakistan\u2019s AI-powered real estate intelligence platform — built for next-generation buyers, sellers, and agents.', links: [{ to: '/', label: 'Back to home' }] },
  contact: { icon: MessageSquare, title: 'Contact us', desc: 'Reach our team at +92 300 1234567 or info@propx.pk. We reply within one business day.', links: [{ to: '/', label: 'Back to home' }] },
  settings: { icon: Wallet, title: 'Settings', desc: 'Manage your account, notifications and preferences.', links: [{ to: '/login', label: 'Sign in to manage settings' }] },
};

export default function Stub({ page }) {
  const s = STUBS[page] || STUBS.about;
  return (
    <div className="stub-page">
      <div className="stub-icon"><s.icon size={32} /></div>
      <h1>{s.title}</h1>
      <p>{s.desc}</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {s.links.map((l) => (
          <Link key={l.label} to={l.to} className="btn btn-primary">{l.label} <ArrowRight size={15} /></Link>
        ))}
      </div>
    </div>
  );
}

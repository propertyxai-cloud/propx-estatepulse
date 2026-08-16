import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Building2, Heart, Monitor, Menu, Plus, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LINKS = [
  { to: '/ai-search', label: 'AI Search' },
  { to: '/properties', label: 'Buy' },
  { to: '/properties?type=rent', label: 'Rent' },
  { to: '/rentals', label: 'Rentals' },
  { to: '/investor', label: 'Investor' },
  { to: '/map-search', label: 'Map' },
  { to: '/ai-search', label: 'AI Advisor' },
  { to: '/price-trends', label: 'Trends' },
  { to: '/heatmap', label: 'Heatmap' },
  { to: '/auctions', label: 'Auctions' },
  { to: '/community', label: 'Community' },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="logo" onClick={() => setOpen(false)}>
          <span className="logo-mark"><Building2 size={18} /></span>
          <span className="logo-text">PropX.pk</span>
        </Link>

        <nav className="nav-links">
          {LINKS.map((l) => (
            <NavLink
              key={l.label}
              to={l.to}
              className={({ isActive }) => `nav-link ${isActive && l.to.split('?')[0] !== '/properties' ? 'active' : ''}`}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-actions">
          <button className="icon-btn" aria-label="Notifications"><Monitor size={17} /></button>
          <button className="icon-btn" aria-label="Favorites" onClick={() => navigate(user ? '/properties' : '/login')}>
            <Heart size={17} />
          </button>
          <button className="btn btn-primary btn-post-ad" onClick={() => navigate('/login')}>
            <Plus size={15} /> Post Ad
          </button>
          <button
            className="avatar-btn"
            aria-label="Account"
            onClick={() => navigate(user ? '/agent-portal' : '/login')}
          >
            <User size={17} />
          </button>
          <button className="hamburger" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      <div className={`mobile-menu ${open ? 'open' : ''}`}>
        {LINKS.map((l) => (
          <NavLink key={l.label} to={l.to} className="nav-link" onClick={() => setOpen(false)}>
            {l.label}
          </NavLink>
        ))}
        <button className="btn btn-primary btn-post-ad" onClick={() => { setOpen(false); navigate('/login'); }}>
          <Plus size={15} /> Post Ad
        </button>
      </div>
    </header>
  );
}

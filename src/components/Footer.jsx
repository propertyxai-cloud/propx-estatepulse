import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';

export default function Footer(){
  return(
    <footer className="footer-dark">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="logo"><span className="logo-mark"><Building2 size={18}/></span><span className="logo-text">PropertyX</span></Link>
            <p>A property marketplace connecting buyers, sellers, landlords, investors and agents across supported countries and cities.</p>
          </div>
          <div className="footer-col"><h4>Discover</h4><ul><li><Link to="/properties">Properties</Link></li><li><Link to="/map-search">Map search</Link></li><li><Link to="/ai-search">AI property search</Link></li><li><Link to="/price-trends">Market data</Link></li></ul></div>
          <div className="footer-col"><h4>Marketplace</h4><ul><li><Link to="/post-property">Post a property</Link></li><li><Link to="/societies">Society directory</Link></li><li><Link to="/broker-ratings">Agent directory</Link></li><li><Link to="/investor">Investor tools</Link></li></ul></div>
          <div className="footer-col"><h4>Account & support</h4><ul><li><Link to="/login">Sign in / register</Link></li><li><Link to="/favorites">Saved properties</Link></li><li><Link to="/agent-portal">Dashboard</Link></li><li><Link to="/settings">Settings</Link></li><li><Link to="/billing">Billing</Link></li><li><Link to="/contact">Contact support</Link></li></ul></div>
        </div>
        <div className="footer-legal"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/contact">Contact</Link></div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} PropertyX. All rights reserved.</span><span>Market information is indicative; verify property details before transacting.</span></div>
      </div>
    </footer>
  );
}

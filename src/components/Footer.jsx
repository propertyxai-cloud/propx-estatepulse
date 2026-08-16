import { Link } from 'react-router-dom';
import { Building2, Mail, MapPin, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <>
      <footer className="footer-light">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <Link to="/" className="logo">
                <span className="logo-mark"><Building2 size={18} /></span>
                <span className="logo-text">EstatePulse</span>
              </Link>
              <p>Pakistan's most advanced real estate marketplace. Buy, sell and rent properties with AI-powered insights.</p>
            </div>
            <div className="footer-col">
              <h4>Platform</h4>
              <ul>
                <li><Link to="/properties">Search properties</Link></li>
                <li><Link to="/map-search">Map search</Link></li>
                <li><Link to="/ai-search">AI advisor</Link></li>
                <li><Link to="/ai-search">AI search</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Invest</h4>
              <ul>
                <li><Link to="/investor">Investor mode</Link></li>
                <li><Link to="/rentals">Rentals</Link></li>
                <li><Link to="/portfolio">Portfolio</Link></li>
                <li><Link to="/roi-battle">ROI battle</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li><Link to="/about">About</Link></li>
                <li><Link to="/contact">Contact</Link></li>
                <li><Link to="/community">Community</Link></li>
                <li><Link to="/broker-ratings">Broker ratings</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Account</h4>
              <ul>
                <li><Link to="/login">Sign in</Link></li>
                <li><Link to="/login">Get started</Link></li>
                <li><Link to="/agent-portal">Dashboard</Link></li>
                <li><Link to="/settings">Settings</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 EstatePulse. All rights reserved.</span>
            <span>Crafted for buyers, investors & agents across Pakistan.</span>
          </div>
        </div>
      </footer>

      <footer className="footer-dark">
        <div className="container">
          <div className="footer-grid">
            <div>
              <Link to="/" className="logo">
                <span className="logo-mark"><Building2 size={18} /></span>
                <span className="logo-text">PropX.pk</span>
              </Link>
              <p>Pakistan's most advanced real estate marketplace. Buy, sell, rent properties with AI-powered insights.</p>
            </div>
            <div className="footer-col">
              <h4>Quick Links</h4>
              <ul>
                <li><Link to="/properties">Buy Property</Link></li>
                <li><Link to="/properties?type=rent">Rent Property</Link></li>
                <li><Link to="/societies">Housing Societies</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Popular Societies</h4>
              <ul>
                <li><Link to="/societies">Bahria Town</Link></li>
                <li><Link to="/societies">DHA Lahore</Link></li>
                <li><Link to="/societies">Al-Kabir Town</Link></li>
              </ul>
            </div>
            <div>
              <h4>Contact</h4>
              <div className="contact-item"><Phone size={15} /> +92 300 1234567</div>
              <div className="contact-item"><Mail size={15} /> info@propx.pk</div>
              <div className="contact-item"><MapPin size={15} /> Lahore, Pakistan</div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

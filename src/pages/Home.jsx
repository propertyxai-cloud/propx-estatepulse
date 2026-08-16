import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, BarChart3, BadgeCheck, Building2, Check, Crown, Flame, Globe2,
  Heart, LineChart, Map as MapIcon, MessageSquare, Search, ShieldCheck, Sparkles,
  TrendingUp, Users, Wallet, ChevronRight, Phone, Star, Bot, Layers,
} from 'lucide-react';
import Reveal from '../components/Reveal';
import PropertyCard from '../components/PropertyCard';
import SocietyCard from '../components/SocietyCard';
import Stars from '../components/Stars';
import { fetchProperties, fetchSocieties } from '../lib/data';

const FEATURES = [
  { icon: Bot, title: 'AI Property Advisor', desc: 'Natural-language search and explainable match scores across every active listing.' },
  { icon: LineChart, title: 'Market Trends & Valuations', desc: 'Live price-per-marla trends, predictive valuations, and neighborhood heatmaps.' },
  { icon: MapIcon, title: 'Smart Map Search', desc: 'Radius, commute-time, and hyper-local alerts powered by open geodata.' },
  { icon: Wallet, title: 'Investor Toolkit', desc: 'ROI battles, rental discovery, portfolio analytics, and group-buying.' },
  { icon: ShieldCheck, title: 'Verified Listings Only', desc: 'Ownership documents, broker ratings, and smart escrow for safe transactions.' },
  { icon: Users, title: 'Agent & Agency Portal', desc: 'Bulk imports, CRM leads, approval workflows, and multi-team management.' },
];

const STEPS = [
  { icon: Search, title: 'Discover', desc: 'Search with natural language, voice, or map filters across 12,000+ verified listings.' },
  { icon: Sparkles, title: 'Analyze', desc: 'Get AI valuations, ROI estimates, commute times, and neighborhood insights in seconds.' },
  { icon: ShieldCheck, title: 'Invest with confidence', desc: 'Close safely with verified ownership, broker ratings, and smart escrow.' },
];

const TESTIMONIALS = [
  { q: 'The AI advisor found a 3-bed in Bahria that fit my exact budget and commute. The valuation gave me confidence to negotiate 8% off.', name: 'Ayesha K.', role: 'First-time buyer, Lahore' },
  { q: 'Portfolio analytics and ROI battles replaced my spreadsheets entirely. I closed two group-buys this quarter.', name: 'Hamza R.', role: 'Investor, Islamabad' },
  { q: 'Bulk import and the approval workflow cut our listing time from days to hours. Verified-only builds real trust.', name: 'Sana M.', role: 'Agency owner, Karachi' },
];

const PLANS = [
  {
    name: 'Free', desc: 'For exploring listings & basic valuations.', price: 'PKR 0', per: 'forever',
    features: ['Search & map view', '3 AI valuations / month', 'Save favorites & searches', 'Community access'], cta: 'Start free', popular: false,
  },
  {
    name: 'Pro', desc: 'For active buyers & serious investors.', price: 'PKR 2,999', per: '/ month',
    features: ['Unlimited AI valuations', 'Predictive valuation & heatmaps', 'Portfolio & ROI analytics', 'Hyper-local alerts', 'Priority support'], cta: 'Go Pro', popular: true,
  },
  {
    name: 'Enterprise', desc: 'For agencies, developers & teams.', price: 'Custom', per: '',
    features: ['Everything in Pro', 'Bulk import & CRM portal', 'Approval workflows & teams', 'Dedicated account manager', 'API & integrations'], cta: 'Contact sales', popular: false,
  },
];

const TRUSTED = ['Bahria Town', 'DHA', 'Al-Kabir', 'Capital Smart City', 'Park View', 'Lake City', 'Citi Housing', 'Gulberg'];

export default function Home() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    fetchProperties().then(setProperties);
    fetchSocieties().then(setSocieties);
  }, []);

  const featured = properties.slice(0, 8);

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div>
              <Reveal>
                <span className="hero-badge"><Sparkles size={14} /> AI-powered real estate intelligence</span>
                <h1 className="hero-title">
                  The operating system for <span className="accent">property trading</span> &amp; investment.
                </h1>
                <p className="hero-sub">
                  Discover, analyze, and close real estate deals with AI valuations, live market trends, smart matching,
                  and a full investor toolkit — built for Pakistan's next-generation buyers, sellers, and agents.
                </p>
              </Reveal>

              <Reveal delay={100}>
                <form
                  className="search-bar"
                  onSubmit={(e) => { e.preventDefault(); navigate(`/properties?q=${encodeURIComponent(q)}`); }}
                >
                  <div className="search-field">
                    <Search size={16} />
                    <input
                      placeholder="Search society, area or city…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      aria-label="Search properties"
                    />
                  </div>
                  <select aria-label="City">
                    <option>City</option>
                    <option>Lahore</option>
                    <option>Islamabad</option>
                    <option>Rawalpindi</option>
                  </select>
                  <button type="submit" className="btn btn-primary">Search</button>
                </form>
              </Reveal>

              <Reveal delay={160}>
                <div className="hero-ctas">
                  <Link to="/login" className="btn btn-primary">Get started free <ArrowRight size={16} /></Link>
                  <Link to="/ai-search" className="btn btn-ghost"><Bot size={16} /> Talk to the AI advisor <ChevronRight size={14} /></Link>
                </div>
              </Reveal>

              <Reveal delay={220}>
                <div className="hero-stats">
                  <div className="stat-tile">
                    <span className="stat-icon"><Building2 size={18} /></span>
                    <div><div className="stat-num">12,400+</div><div className="stat-lbl">Listings</div></div>
                  </div>
                  <div className="stat-tile">
                    <span className="stat-icon"><Sparkles size={18} /></span>
                    <div><div className="stat-num">50,000+</div><div className="stat-lbl">AI valuations</div></div>
                  </div>
                  <div className="stat-tile">
                    <span className="stat-icon"><BadgeCheck size={18} /></span>
                    <div><div className="stat-num">98%</div><div className="stat-lbl">Verified</div></div>
                  </div>
                </div>
              </Reveal>
            </div>

            <Reveal delay={150}>
              <div className="dashboard-card">
                <div className="dash-head">
                  <div>
                    <div className="lbl">Portfolio value</div>
                    <div className="val">PKR 4.82 Cr</div>
                  </div>
                  <span className="chip-up"><TrendingUp size={12} /> +12.4% YoY</span>
                </div>
                <div className="bars-chart" aria-hidden="true">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div className="bar" key={i} />)}
                </div>
                <div className="dash-mini">
                  <div className="mini-card">
                    <div className="mc-lbl">Top match</div>
                    <div className="mc-val">10 Marla · DHA 6</div>
                    <div className="mc-sub buy">94% match</div>
                  </div>
                  <div className="mini-card">
                    <div className="mc-lbl">Est. ROI</div>
                    <div className="mc-val">9.6% / yr</div>
                    <div className="mc-sub strong">Strong buy</div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ TRUSTED SOCIETIES ============ */}
      <div className="trusted-bar">
        <div className="container">
          <div className="trusted-lbl">Trusted across 500+ societies &amp; leading developers</div>
          <div className="trusted-logos">
            {TRUSTED.map((t) => (
              <span className="trusted-logo" key={t}><Building2 size={15} /> {t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ============ PLATFORM FEATURES ============ */}
      <section className="section">
        <div className="container">
          <Reveal>
            <span className="section-label"><Sparkles size={13} /> Platform</span>
            <h2 className="section-title">One platform. Every property decision.</h2>
            <p className="section-sub">
              From first search to closed deal — EstatePulse unifies discovery, analysis, and transaction management in a single intelligent workspace.
            </p>
          </Reveal>
          <div className="feature-grid" style={{ marginTop: 40 }}>
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 60}>
                <article className="feature-card">
                  <span className="icon-tile"><f.icon size={22} /></span>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                  <Link to={f.title.includes('Investor') ? '/investor' : f.title.includes('Trends') ? '/price-trends' : f.title.includes('Map') ? '/map-search' : f.title.includes('Verified') ? '/broker-ratings' : f.title.includes('Agent') ? '/agent-portal' : '/ai-search'} className="link-more">
                    Explore <ArrowRight size={14} />
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ DISCOVERY ============ */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="split">
            <Reveal className="split-copy">
              <span className="section-label"><Search size={13} /> Discovery</span>
              <h2 className="section-title">Search properties the way you think</h2>
              <p>
                Ask in plain English or Urdu — "2-bed apartment in Bahria under 1.5 crore near a school" — and get ranked, explainable matches instantly.
              </p>
              <ul className="bullets">
                <li><span className="dot" /> Natural-language &amp; voice search</li>
                <li><span className="dot" /> Explainable match scores</li>
                <li><span className="dot" /> Saved searches with alerts</li>
              </ul>
              <Link to="/ai-search" className="link-more" style={{ marginTop: 20 }}>Learn more <ArrowRight size={14} /></Link>
            </Reveal>
            <Reveal delay={120} className="split-visual">
              <div className="mockup-card mockup-green">
                <div className="mock-query"><Search size={14} /> "10 marla house in DHA Lahore, budget 2 crore"</div>
                <div className="mock-result">
                  <div>
                    <div className="mr-title">DHA Phase 6 · 10 Marla</div>
                    <div className="mr-sub">5 beds · 6 baths</div>
                  </div>
                  <span className="match-chip">96% match</span>
                </div>
                <div className="mock-result">
                  <div>
                    <div className="mr-title">DHA Phase 8 · 10 Marla</div>
                    <div className="mr-sub">4 beds · 5 baths</div>
                  </div>
                  <span className="match-chip">91% match</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ INTELLIGENCE ============ */}
      <section className="section">
        <div className="container">
          <div className="split split-reverse">
            <Reveal className="split-copy">
              <span className="section-label"><BarChart3 size={13} /> Intelligence</span>
              <h2 className="section-title">Know what a property is worth — before you bid</h2>
              <p>
                AI valuations combine live transactions, neighborhood trends, and amenity data to give you a confident price and ROI estimate.
              </p>
              <ul className="bullets">
                <li><span className="dot" /> Predictive valuation engine</li>
                <li><span className="dot" /> Price-per-marla trend dashboards</li>
                <li><span className="dot" /> Neighborhood heatmaps &amp; alerts</li>
              </ul>
              <Link to="/price-trends" className="link-more" style={{ marginTop: 20 }}>Learn more <ArrowRight size={14} /></Link>
            </Reveal>
            <Reveal delay={120} className="split-visual">
              <div className="mockup-card mockup-amber">
                <div className="mock-title">
                  <div>
                    <div className="lbl">Estimated value</div>
                    <div className="val">PKR 2.14 Cr</div>
                  </div>
                  <span className="chip-up chip-amber"><TrendingUp size={12} /> +8.2%</span>
                </div>
                <div className="amber-bars" aria-hidden="true">
                  {[1, 2, 3, 4, 5, 6].map((i) => <div className="bar" key={i} />)}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ INVESTMENT ============ */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="split">
            <Reveal className="split-copy">
              <span className="section-label"><Wallet size={13} /> Investment</span>
              <h2 className="section-title">Run your portfolio like a fund</h2>
              <p>
                Track holdings, rental yields, and capital gains, compare deals head-to-head, and join group-buys — all in one investor dashboard.
              </p>
              <ul className="bullets">
                <li><span className="dot" /> Portfolio analytics &amp; yield tracking</li>
                <li><span className="dot" /> ROI battles &amp; rental discovery</li>
                <li><span className="dot" /> Group-buying &amp; smart escrow</li>
              </ul>
              <Link to="/investor" className="link-more" style={{ marginTop: 20 }}>Learn more <ArrowRight size={14} /></Link>
            </Reveal>
            <Reveal delay={120} className="split-visual">
              <div className="mockup-card mockup-blue">
                <div className="mini-stat-grid">
                  <div className="mini-stat"><div className="ms-lbl">Total invested</div><div className="ms-val">PKR 3.4 Cr</div></div>
                  <div className="mini-stat"><div className="ms-lbl">Current value</div><div className="ms-val green">PKR 4.8 Cr</div></div>
                  <div className="mini-stat"><div className="ms-lbl">Avg. rental yield</div><div className="ms-val">7.9%</div></div>
                  <div className="mini-stat"><div className="ms-lbl">Capital gain</div><div className="ms-val green">+41%</div></div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ STEPS ============ */}
      <section className="section">
        <div className="container">
          <Reveal style={{ textAlign: 'center' }}>
            <h2 className="section-title">From search to keys in three steps</h2>
            <p className="section-sub" style={{ margin: '12px auto 0' }}>A guided, transparent path that replaces guesswork with data.</p>
          </Reveal>
          <div className="steps" style={{ marginTop: 44 }}>
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 100}>
                <article className="step-card">
                  <div className="step-num">{i + 1}</div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ GREEN STATS BAR ============ */}
      <div className="stats-bar">
        <div className="container">
          <div className="stats-item"><div className="num">12,400+</div><div className="lbl">Active listings</div></div>
          <div className="stats-item"><div className="num">50,000+</div><div className="lbl">AI valuations delivered</div></div>
          <div className="stats-item"><div className="num">500+</div><div className="lbl">Societies covered</div></div>
          <div className="stats-item"><div className="num">PKR 9.2B</div><div className="lbl">Property analyzed</div></div>
        </div>
      </div>

      {/* ============ FEATURED PROPERTIES ============ */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="section-head-row">
              <div>
                <span className="section-label"><Sparkles size={13} /> Handpicked for you</span>
                <h2 className="section-title">Featured Properties</h2>
              </div>
              <Link to="/properties" className="link-more">View All <ArrowRight size={14} /></Link>
            </div>
          </Reveal>
          {featured.length ? (
            <div className="prop-grid">
              {featured.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 60}>
                  <PropertyCard property={p} />
                </Reveal>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-muted)' }}>Loading properties…</p>
          )}
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <Reveal>
            <h2 className="section-title">Loved by buyers, investors &amp; agents</h2>
            <div className="rating-row">
              <Stars rating={5} size={18} />
              <b>4.9/5</b> from 2,000+ users
            </div>
          </Reveal>
          <div className="testi-grid">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 80}>
                <article className="testi-card">
                  <p className="quote">"{t.q}"</p>
                  <hr className="testi-divider" />
                  <div className="testi-footer">
                    <span className="avatar">{t.name[0]}</span>
                    <div>
                      <div className="t-name">{t.name}</div>
                      <div className="t-role">{t.role}</div>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <Reveal style={{ textAlign: 'center' }}>
            <h2 className="section-title">Pricing that scales with your ambition</h2>
            <p className="section-sub" style={{ margin: '12px auto 0' }}>Start free. Upgrade when you're ready to close smarter.</p>
          </Reveal>
          <div className="pricing-grid" style={{ marginTop: 44 }}>
            {PLANS.map((pl, i) => (
              <Reveal key={pl.name} delay={i * 90}>
                <article className={`plan ${pl.popular ? 'popular' : ''}`}>
                  {pl.popular && <span className="most-popular">Most popular</span>}
                  <h3>{pl.name}</h3>
                  <p className="plan-desc">{pl.desc}</p>
                  <div className="plan-price">{pl.price} <span className={pl.per === 'forever' ? 'forever' : 'per'}>{pl.per}</span></div>
                  <button className={`btn ${pl.popular ? 'btn-primary' : 'btn-outline'}`}>{pl.cta}</button>
                  <ul className="plan-features">
                    {pl.features.map((f) => (
                      <li key={f}><Check size={15} className="check" /> {f}</li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ POPULAR SOCIETIES ============ */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <Reveal>
            <div className="section-head-row">
              <div>
                <span className="section-label"><MapIcon size={13} /> Top housing schemes</span>
                <h2 className="section-title">Popular Societies</h2>
              </div>
              <Link to="/societies" className="link-more">View All <ArrowRight size={14} /></Link>
            </div>
          </Reveal>
          {societies.length ? (
            <div className="society-grid">
              {societies.map((s, i) => (
                <Reveal key={s.id} delay={i * 60}>
                  <SocietyCard society={s} />
                </Reveal>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-muted)' }}>Loading societies…</p>
          )}
        </div>
      </section>

      {/* ============ CTA BANNER ============ */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <Reveal>
            <div className="cta-banner">
              <span className="pill"><Sparkles size={13} /> Start in minutes</span>
              <h2>Your next great property decision starts here.</h2>
              <p>Join thousands using EstatePulse to search smarter, invest with data, and transact with confidence.</p>
              <div className="cta-actions">
                <Link to="/login" className="btn btn-light">Create free account <ArrowRight size={16} /></Link>
                <Link to="/properties" className="btn btn-light-outline">Browse properties</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

import { useEffect,useState } from 'react';
import { Link,useNavigate } from 'react-router-dom';
import { ArrowRight,BarChart3,Bot,Building2,Globe2,Map as MapIcon,Search,ShieldCheck,Sparkles,Users,Wallet } from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import { fetchProperties,fetchSocieties } from '../lib/data';

const FEATURES=[
  {icon:Bot,title:'AI property discovery',description:'Describe your requirements in plain language and search approved live listings.',to:'/ai-search'},
  {icon:MapIcon,title:'Location-aware search',description:'Explore listings with verified coordinates and distance filters on the map.',to:'/map-search'},
  {icon:BarChart3,title:'Market snapshots',description:'Follow monthly asking-price data derived from approved PropertyX inventory.',to:'/price-trends'},
  {icon:Wallet,title:'Investor tools',description:'Filter listings by seller-provided yield and ROI figures; always review assumptions.',to:'/investor'},
  {icon:ShieldCheck,title:'Moderated listings',description:'New submissions enter review and do not appear publicly until approved.',to:'/properties'},
  {icon:Users,title:'Seller and agent workspace',description:'Manage properties, inquiries and public agent profiles from your account.',to:'/agent-portal'},
];

export default function Home(){
  const navigate=useNavigate();
  const [properties,setProperties]=useState([]);
  const [societies,setSocieties]=useState([]);
  const [query,setQuery]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{
    let active=true;
    Promise.all([fetchProperties({limit:100}),fetchSocieties()])
      .then(([listings,directory])=>{if(active){setProperties(listings);setSocieties(directory.slice(0,8));}})
      .catch((err)=>{if(active)setError(err.message||'Marketplace data is unavailable.');})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[]);

  return(
    <>
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div>
              <span className="hero-badge"><Sparkles size={14}/> Real property data. AI-assisted discovery.</span>
              <h1 className="hero-title">Find your next property with <span className="accent">clarity.</span></h1>
              <p className="hero-sub">Search properties across supported countries and cities, compare listing details, contact owners and manage your property journey in one marketplace.</p>
              <form className="search-bar" onSubmit={(event)=>{event.preventDefault();navigate(`/properties?q=${encodeURIComponent(query)}`);}}>
                <div className="search-field"><Search size={16}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search city, area, society or property…" aria-label="Search properties"/></div>
                <button className="btn btn-primary" type="submit">Search <ArrowRight size={15}/></button>
              </form>
              <div className="hero-ctas"><Link to="/ai-search" className="btn btn-primary"><Bot size={16}/> Ask PropertyX AI</Link><Link to="/post-property" className="btn btn-ghost"><Building2 size={16}/> List a property</Link></div>
              <div className="hero-stats">
                <div className="stat-tile"><span className="stat-icon"><Building2 size={18}/></span><div><div className="stat-num">{loading?'—':properties.length}</div><div className="stat-lbl">Approved listings loaded</div></div></div>
                <div className="stat-tile"><span className="stat-icon"><Globe2 size={18}/></span><div><div className="stat-num">{loading?'—':new Set(properties.map((p)=>p.country_code).filter(Boolean)).size}</div><div className="stat-lbl">Countries in current results</div></div></div>
                <div className="stat-tile"><span className="stat-icon"><ShieldCheck size={18}/></span><div><div className="stat-num">Review</div><div className="stat-lbl">Listings moderated</div></div></div>
              </div>
            </div>
            <div className="dashboard-card hero-note">
              <div className="dash-head"><div><div className="lbl">PropertyX marketplace</div><div className="val">Search · Verify · Connect</div></div><span className="chip-up"><ShieldCheck size={12}/> Moderation</span></div>
              <div className="hero-note-steps"><div><b>01</b><span>Explore published properties</span></div><div><b>02</b><span>Review facts, photos and location</span></div><div><b>03</b><span>Contact the listing owner or agent</span></div></div>
              <p className="muted-copy">Market history and broker ratings appear as verified records accumulate. No sample activity is mixed into live results.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head-row"><div><span className="section-label"><Sparkles size={13}/> PropertyX platform</span><h2 className="section-title">Tools for every property decision</h2><p className="section-sub">Useful workflows grounded in real listing and account data.</p></div></div>
          <div className="feature-grid" style={{marginTop:32}}>
            {FEATURES.map((feature)=>{const Icon=feature.icon;return <article className="feature-card" key={feature.title}><span className="icon-tile"><Icon size={22}/></span><h3>{feature.title}</h3><p>{feature.description}</p><Link to={feature.to} className="link-more">Explore <ArrowRight size={14}/></Link></article>;})}
          </div>
        </div>
      </section>

      <section className="section" style={{paddingTop:0}}>
        <div className="container">
          <div className="section-head-row"><div><span className="section-label"><Building2 size={13}/> Live marketplace</span><h2 className="section-title">Recently approved properties</h2><p className="section-sub">Only currently approved, active listings appear here.</p></div><Link to="/properties" className="link-more">View marketplace <ArrowRight size={14}/></Link></div>
          {error&&<div className="form-error" role="alert">{error}</div>}
          {loading?<p className="empty-inline">Loading approved properties…</p>:properties.length===0?<div className="empty-state"><Building2 size={32}/><h2>No public listings yet</h2><p>Property submissions stay private until an administrator approves them. You can post a property for review.</p><Link to="/post-property" className="btn btn-primary">Submit a property</Link></div>:<div className="prop-grid cols-3">{properties.slice(0,6).map((property)=><PropertyCard key={property.id} property={property}/>)}</div>}
        </div>
      </section>

      <section className="section" style={{paddingTop:0}}>
        <div className="container">
          <div className="section-head-row"><div><span className="section-label"><Globe2 size={13}/> Location directory</span><h2 className="section-title">Societies with approved listings</h2><p className="section-sub">Directory counts are derived from approved marketplace inventory.</p></div><Link to="/societies" className="link-more">Open directory <ArrowRight size={14}/></Link></div>
          {!loading&&societies.length===0?<p className="empty-inline">Society data will appear as approved listings are added.</p>:<div className="society-grid">{societies.map((society)=><Link key={`${society.name}-${society.city}-${society.currency_code}`} className="society-data-card" to={`/properties?city=${encodeURIComponent(society.city)}&society=${encodeURIComponent(society.name)}`}><span className="society-card-icon"><Building2 size={20}/></span><h3>{society.name}</h3><p>{[society.city,society.country].filter(Boolean).join(', ')}</p><b>{society.listings_count} approved listings</b></Link>)}</div>}
        </div>
      </section>

      <section className="section" style={{paddingTop:0}}>
        <div className="container"><div className="cta-banner"><span className="pill"><Sparkles size={13}/> Start with a real listing</span><h2>Your next property decision starts here.</h2><p>Create an account to save searches, manage listings and contact property owners.</p><div className="cta-actions"><Link to="/login" className="btn btn-light">Create account <ArrowRight size={16}/></Link><Link to="/properties" className="btn btn-light-outline">Browse properties</Link></div></div></div>
      </section>
    </>
  );
}

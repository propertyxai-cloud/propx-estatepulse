import { useEffect, useState } from 'react';
import { Award, Search, ShieldCheck, Star, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchBrokers, requireSupabase } from '../lib/data';

export default function BrokerRatings() {
  const { user } = useAuth();
  const [brokers,setBrokers]=useState([]);
  const [query,setQuery]=useState('');
  const [selected,setSelected]=useState('');
  const [rating,setRating]=useState(5);
  const [review,setReview]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [reviewed,setReviewed]=useState(false);
  const load=()=>fetchBrokers().then(setBrokers).catch((err)=>setError(err.message || 'Could not load the public broker directory.'));
  useEffect(()=>{load();},[]);
  const filtered=brokers.filter((broker)=>!query || [broker.name,broker.company_name,broker.city].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase()));
  const totalReviews=brokers.reduce((sum,broker)=>sum+(broker.review_count||0),0);
  const rated=brokers.filter((broker)=>Number(broker.rating)>0);
  const average=rated.length ? (rated.reduce((sum,broker)=>sum+Number(broker.rating),0)/rated.length).toFixed(1) : '—';

  const submit=async(event)=>{
    event.preventDefault();setBusy(true);setError('');setMessage('');
    try{
      if(!user) throw new Error('Sign in before submitting a broker review.');
      if(!selected) throw new Error('Choose an agent.');
      if(review.trim().length<20) throw new Error('Write at least 20 characters about your experience.');
      const {error:submitError}=await requireSupabase().from('broker_reviews').insert({
        broker_id:selected, reviewer_id:user.id, rating, review:review.trim(), moderation_status:'pending', verified_deal:false,
      });
      if(submitError) throw submitError;
      setReviewed(true);setReview('');setMessage('Your review has been submitted for moderation. It will appear after approval.');
    }catch(err){setError(err.message || 'Could not submit your review.');}
    finally{setBusy(false);}
  };

  return (
    <div className="container page-section">
      <div className="page-head"><h1><Award size={24}/> Agent and broker directory</h1><p className="sub">Profiles and ratings come from public agent profiles and approved client reviews.</p></div>
      <div className="broker-stats"><div className="broker-stat"><b className="b-num">{brokers.length}</b><span className="b-lbl">Published profiles</span></div><div className="broker-stat"><b className="b-num">{totalReviews}</b><span className="b-lbl">Approved reviews</span></div><div className="broker-stat"><b className="b-num">{average}</b><span className="b-lbl">Average rating</span></div></div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <label className="search-field broker-search"><Search size={16}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search published agents by name, company or city…"/></label>
      {brokers.length===0 ? <div className="empty-state"><UserRound size={32}/><h2>No published agent profiles</h2><p>Agents can publish a public profile from their account settings. Reviews and ratings will appear after moderation.</p></div> : <div className="broker-directory">{filtered.map((broker)=>(
        <article className="broker-card" key={broker.id}>
          <div className="broker-profile-avatar">{broker.avatar_url ? <img src={broker.avatar_url} alt=""/> : <UserRound size={24}/>}</div>
          <div className="broker-profile-info"><h2>{broker.name}</h2><p>{[broker.headline,broker.company_name,broker.city].filter(Boolean).join(' · ')}</p>{broker.bio && <p>{broker.bio}</p>}
            <div className="broker-rating-live">{Number(broker.rating)>0 ? <><Star size={15} fill="currentColor"/> {Number(broker.rating).toFixed(1)} · {broker.review_count} approved reviews</> : 'No approved reviews yet'}</div>
            {broker.verified_deals>0 && <span className="verified-chip"><ShieldCheck size={12}/> {broker.verified_deals} verified deal(s)</span>}
          </div>
          {broker.public_phone && <a className="btn btn-outline btn-sm" href={`tel:${broker.public_phone}`}>Contact agent</a>}
        </article>
      ))}</div>}
      {!reviewed && brokers.length>0 && (
        <section className="dashboard-panel broker-review-form"><h2>Leave an agent review</h2><p>Reviews are public only after moderation. Do not post private personal or financial information.</p>
          <form className="listing-form" onSubmit={submit}>
            <label className="form-field"><span>Agent</span><select className="input" value={selected} onChange={(e)=>setSelected(e.target.value)} required><option value="">Choose an agent</option>{brokers.map((broker)=><option key={broker.id} value={broker.id}>{broker.name} — {broker.city || 'Location not provided'}</option>)}</select></label>
            <label className="form-field"><span>Rating</span><select className="input" value={rating} onChange={(e)=>setRating(Number(e.target.value))}>{[5,4,3,2,1].map((value)=><option key={value} value={value}>{value} / 5</option>)}</select></label>
            <label className="form-field"><span>Your experience</span><textarea className="input" rows={5} maxLength={2000} value={review} onChange={(e)=>setReview(e.target.value)} minLength={20} required/></label>
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy?'Submitting…':'Submit for moderation'}</button>
          </form>
        </section>
      )}
      {message && <div className="success-message" role="status">{message}</div>}
    </div>
  );
}

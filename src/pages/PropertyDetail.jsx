import { useEffect,useState } from 'react';
import { Link,useParams } from 'react-router-dom';
import {
  ArrowLeft,Bath,BedDouble,Building2,CheckCircle2,ChevronLeft,ChevronRight,
  Flag,Heart,MapPin,MessageCircle,Phone,Ruler,Send,Share2,ShieldCheck,
  Sparkles,X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  addFavorite,createInquiry,fetchProperty,formatCurrency,
  isPropertyFavorite,recordRecentlyViewed,removeFavorite,requireSupabase,
} from '../lib/data';

export default function PropertyDetail(){
  const {id}=useParams();
  const {user,profile}=useAuth();
  const [property,setProperty]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [index,setIndex]=useState(0);
  const [saved,setSaved]=useState(false);
  const [saving,setSaving]=useState(false);
  const [inquiryOpen,setInquiryOpen]=useState(false);
  const [form,setForm]=useState({name:'',phone:'',email:'',message:''});
  const [sending,setSending]=useState(false);
  const [sent,setSent]=useState(false);
  const [message,setMessage]=useState('');
  const [insight,setInsight]=useState(null);
  const [insightLoading,setInsightLoading]=useState(false);

  useEffect(()=>{
    let active=true;
    setLoading(true);setError('');setProperty(null);setIndex(0);setInsight(null);
    fetchProperty(id).then(async(item)=>{
      if(!active)return;
      setProperty(item);
      if(item&&user?.id){
        try{
          await recordRecentlyViewed(user.id,item.id);
          const isSaved=await isPropertyFavorite(user.id,item.id);
          if(active)setSaved(isSaved);
        }catch(err){console.warn('Could not sync viewing history:',err);}
      }
    }).catch((err)=>{if(active)setError(err.message||'Property could not be loaded.');})
      .finally(()=>{if(active)setLoading(false);});
    window.scrollTo(0,0);
    return()=>{active=false;};
  },[id,user?.id]);

  const images=Array.isArray(property?.images)?property.images:[];
  const price=property?.price_label||formatCurrency(property?.price,property?.currency_code||property?.currency||'USD');

  const toggleSaved=async()=>{
    if(!user){setMessage('Sign in to save this listing.');return;}
    setSaving(true);setMessage('');
    try{
      if(saved)await removeFavorite(user.id,property.id);else await addFavorite(user.id,property.id);
      setSaved(!saved);
    }catch(err){setMessage(err.message||'Could not update your saved properties.');}
    finally{setSaving(false);}
  };

  const submitInquiry=async(event)=>{
    event.preventDefault();setSending(true);setMessage('');
    try{
      await createInquiry(property,form,user);
      setSent(true);
    }catch(err){setMessage(err.message||'Your inquiry could not be submitted.');}
    finally{setSending(false);}
  };

  const getInsight=async()=>{
    if(!user){setMessage('Sign in to use AI investment insights.');return;}
    setInsightLoading(true);setMessage('');
    try{
      const {data,error:fnError}=await requireSupabase().functions.invoke('ai-assistant',{
        body:{action:'insights',payload:{property:{
          title:property.title,price:property.price,currency:property.currency_code||property.currency,
          city:property.city,country:property.country,property_type:property.property_type,
          listing_type:property.listing_type,beds:property.beds,baths:property.baths,
          area:property.area,area_unit:property.area_unit,est_roi:property.est_roi,
          est_yield:property.est_yield,description:property.description,features:property.features,
          verified:property.verified===true,
        }}},
      });
      if(fnError)throw fnError;
      setInsight(data?.result||null);
    }catch(err){setMessage(err.message||'AI insights are unavailable.');}
    finally{setInsightLoading(false);}
  };

  const share=async()=>{
    try{
      if(navigator.share)await navigator.share({title:property.title,url:window.location.href});
      else{await navigator.clipboard.writeText(window.location.href);setMessage('Property link copied.');}
    }catch(err){if(err.name!=='AbortError')setMessage('Unable to share this listing in this browser.');}
  };

  if(loading)return <div className="container page-status">Loading property details…</div>;
  if(error)return <div className="container page-status"><div className="form-error">{error}</div><Link to="/properties">Return to search</Link></div>;
  if(!property)return <div className="container page-status"><h1>Property not found</h1><p>This listing may have been removed or is not available to your account.</p><Link to="/properties" className="btn btn-primary">Browse properties</Link></div>;

  return(
    <div className="container page-section">
      <Link to="/properties" className="back-link"><ArrowLeft size={15}/> Back to search</Link>
      <div className="detail-layout">
        <div>
          <div className="gallery">
            <div className="gallery-main">
              {images.length?<img src={images[index]} alt={property.title}/>:<div className="prop-media-empty"><Building2 size={32}/><span>No photographs supplied</span></div>}
              <div className="badges"><span className="badge">{property.listing_type==='rent'?'For rent':property.listing_type==='lease'?'For lease':'For sale'}</span>{property.verified===true&&<span className="badge verified"><ShieldCheck size={11}/> PropertyX verified</span>}</div>
              {images.length>1&&<><button className="gallery-nav prev" aria-label="Previous photo" onClick={()=>setIndex((index-1+images.length)%images.length)}><ChevronLeft size={17}/></button><button className="gallery-nav next" aria-label="Next photo" onClick={()=>setIndex((index+1)%images.length)}><ChevronRight size={17}/></button><span className="gallery-count">{index+1}/{images.length}</span></>}
            </div>
            {images.length>1&&<div className="gallery-thumbs">{images.map((url,i)=><button type="button" key={url+i} className={i===index?'active':''} onClick={()=>setIndex(i)}><img src={url} alt={`Property photograph ${i+1}`}/></button>)}</div>}
          </div>
          <div className="detail-info">
            <h1>{property.title}</h1>
            <div className="detail-loc"><MapPin size={14}/>{[property.address||property.location,property.city,property.region,property.country].filter(Boolean).join(', ')}</div>
            <div className="detail-price">{price}{property.installment&&<span className="installment">{property.installment}</span>}</div>
            <div className="specs-grid">
              <div className="spec-tile"><div className="k"><Building2 size={11}/> Property type</div><div className="v">{property.property_type}</div></div>
              <div className="spec-tile"><div className="k"><Ruler size={11}/> Area</div><div className="v">{property.area?`${property.area} ${property.area_unit||''}`:'Not supplied'}</div></div>
              <div className="spec-tile"><div className="k"><BedDouble size={11}/> Bedrooms</div><div className="v">{property.beds??'Not supplied'}</div></div>
              <div className="spec-tile"><div className="k"><Bath size={11}/> Bathrooms</div><div className="v">{property.baths??'Not supplied'}</div></div>
              <div className="spec-tile"><div className="k"><MapPin size={11}/> Country</div><div className="v">{property.country||property.country_code||'Not supplied'}</div></div>
              <div className="spec-tile"><div className="k"><CheckCircle2 size={11}/> Availability</div><div className="v">{String(property.availability||'available').replace('_',' ')}</div></div>
            </div>
            {property.description&&<section className="detail-section"><h3>Description</h3><p>{property.description}</p></section>}
            {property.features?.length>0&&<section className="detail-section"><h3>Features and amenities</h3><div className="chip-row">{property.features.map((feature)=><span className="chip-pill" key={feature}>{feature}</span>)}</div></section>}
            {(property.est_roi!==null||property.est_yield!==null)&&<div className="notice">Seller-provided investment figures are estimates, not guarantees. Verify the assumptions independently. {property.est_roi!==null&&` Estimated ROI: ${property.est_roi}%.`} {property.est_yield!==null&&` Estimated yield: ${property.est_yield}%.`}</div>}
            <section className="detail-section">
              <div className="section-head-row"><h3><Sparkles size={17}/> AI investment review</h3><button className="btn btn-outline btn-sm" onClick={getInsight} disabled={insightLoading}>{insightLoading?'Analysing…':'Analyse listing'}</button></div>
              {insight&&<div className="ai-insight"><p>{insight.summary}</p>{insight.risks?.length>0&&<><b>Risks to examine</b><ul>{insight.risks.map((item,i)=><li key={i}>{item}</li>)}</ul></>}{insight.openQuestions?.length>0&&<><b>Questions to ask</b><ul>{insight.openQuestions.map((item,i)=><li key={i}>{item}</li>)}</ul></>}</div>}
              <p className="sub">AI commentary uses the supplied listing fields. It is not a valuation, title check, ownership verification or financial advice.</p>
            </section>
            <Link className="report-link" to={user?`/report-property/${property.id}`:'/login'}><Flag size={14}/> Report a concern about this listing</Link>
            {message&&<div className="form-error" role="status">{message}</div>}
          </div>
        </div>
        <aside className="agent-card">
          <div className="a-head"><span className="avatar">{(property.agent_name||'Owner')[0]}</span><div><div className="a-name">{property.agent_name||'Property owner'}</div><div className="a-tag">{property.verified===true?'PropertyX verified':'Listing submitted by owner / agent'}</div></div></div>
          {property.agent_phone&&<><a className="btn btn-primary btn-block" href={`tel:${property.agent_phone}`}><Phone size={15}/> Call contact</a><a className="btn btn-outline btn-block" href={`https://wa.me/${property.agent_phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"><MessageCircle size={15}/> WhatsApp</a></>}
          <button className="btn btn-outline btn-block" onClick={()=>{setSent(false);setInquiryOpen(true);}}><Send size={15}/> Send inquiry</button>
          <div className="agent-actions"><button className="btn btn-outline btn-sm" onClick={toggleSaved} disabled={saving}><Heart size={14} fill={saved?'currentColor':'none'}/>{saved?'Saved':'Save'}</button><button className="btn btn-outline btn-sm" onClick={share}><Share2 size={14}/> Share</button></div>
        </aside>
      </div>
      {inquiryOpen&&<div className="modal-overlay" role="presentation" onClick={(event)=>{if(event.target===event.currentTarget)setInquiryOpen(false);}}>
        <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="inquiry-heading">
          <button type="button" className="modal-close" aria-label="Close" onClick={()=>setInquiryOpen(false)}><X size={18}/></button>
          <h2 id="inquiry-heading">Contact about this property</h2><p>{property.title}</p>
          {sent?<div className="success-panel"><CheckCircle2 size={26}/><b>Your inquiry was submitted.</b><p>The listing contact will receive your message through PropertyX.</p><button className="btn btn-primary" onClick={()=>setInquiryOpen(false)}>Done</button></div>:(
            <form className="listing-form" onSubmit={submitInquiry}>
              <label className="form-field"><span>Your name</span><input className="input" required minLength={2} maxLength={120} value={form.name||profile?.full_name||profile?.display_name||''} onChange={(e)=>setForm({...form,name:e.target.value})}/></label>
              <label className="form-field"><span>Phone</span><input className="input" required minLength={6} maxLength={40} value={form.phone||profile?.phone||''} onChange={(e)=>setForm({...form,phone:e.target.value})}/></label>
              {!user&&<label className="form-field"><span>Email (optional)</span><input className="input" type="email" maxLength={254} value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}/></label>}
              <label className="form-field"><span>Message</span><textarea className="input" rows={4} maxLength={5000} value={form.message} onChange={(e)=>setForm({...form,message:e.target.value})} placeholder="Ask a question or request a viewing."/></label>
              <button className="btn btn-primary btn-block" type="submit" disabled={sending}>{sending?'Sending…':'Submit inquiry'}</button>
            </form>
          )}
        </div>
      </div>}
    </div>
  );
}

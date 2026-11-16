import { useEffect,useState } from 'react';
import { Link,useNavigate,useParams } from 'react-router-dom';
import { Flag,ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchProperty,requireSupabase } from '../lib/data';

const REASONS=[
  ['fraud','Suspected scam or fraud'],
  ['incorrect','Incorrect price or property details'],
  ['duplicate','Duplicate listing'],
  ['offensive','Offensive or prohibited content'],
  ['other','Other concern'],
];

export default function ReportProperty(){
  const {id}=useParams();
  const {user}=useAuth();
  const navigate=useNavigate();
  const [property,setProperty]=useState(null);
  const [loading,setLoading]=useState(true);
  const [reason,setReason]=useState('fraud');
  const [details,setDetails]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [sent,setSent]=useState(false);
  useEffect(()=>{let active=true;fetchProperty(id).then((item)=>{if(active)setProperty(item);}).catch((err)=>{if(active)setError(err.message||'Listing unavailable.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[id]);
  const submit=async(event)=>{
    event.preventDefault();setBusy(true);setError('');
    try{
      const {error:insertError}=await requireSupabase().from('listing_reports').insert({
        property_id:id,reporter_id:user.id,reason,details:details.trim()||null,
      });
      if(insertError)throw insertError;
      setSent(true);
    }catch(err){setError(err.message||'Report could not be submitted.');}
    finally{setBusy(false);}
  };
  if(loading)return <div className="container page-status">Loading report details…</div>;
  if(!property)return <div className="container page-status"><p>This listing is not available to report.</p><Link to="/properties">Back to search</Link></div>;
  return(
    <div className="container page-section narrow">
      <div className="page-head"><h1><Flag size={23}/> Report a listing</h1><p className="sub">Reports help the moderation team investigate potentially misleading or unsafe listings.</p></div>
      <div className="notice"><ShieldAlert size={16}/> Reporting does not automatically remove a listing. Moderators review each report and may request more information.</div>
      <div className="report-property-summary"><b>{property.title}</b><span>{[property.city,property.country].filter(Boolean).join(', ')}</span></div>
      {sent?<div className="success-panel"><Flag size={32}/><h2>Report received</h2><p>Your report has been submitted for moderation. Thank you for helping keep the marketplace trustworthy.</p><button className="btn btn-primary" onClick={()=>navigate('/agent-portal')}>Return to dashboard</button></div>:(
        <form className="listing-form" onSubmit={submit}>
          <label className="form-field"><span>Reason</span><select className="input" value={reason} onChange={(event)=>setReason(event.target.value)}>{REASONS.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label className="form-field"><span>Details (optional)</span><textarea className="input" rows={5} maxLength={2000} value={details} onChange={(event)=>setDetails(event.target.value)} placeholder="Describe what you observed. Do not include passwords, payment card details or other sensitive information."/></label>
          {error&&<div className="form-error" role="alert">{error}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy?'Submitting…':'Submit report'}</button>
        </form>
      )}
    </div>
  );
}

import { useCallback,useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,BarChart3,Bell,Building2,Check,Clock3,Inbox,Plus,
  RefreshCw,ShieldCheck,Users,XCircle,Flag,Star,Mail,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchMyProperties,fetchOwnerInquiries,fetchNotifications,formatCurrency,formatDate,requireSupabase } from '../lib/data';

const LEAD_STATUSES=['new','contacted','viewing','negotiating','converted','closed','lost'];
const PROPERTY_DECISIONS=['approved','rejected'];

function StatusPill({value}){
  return <span className={`status-pill status-${String(value||'new').replace(/[^a-z]/g,'')}`}>{String(value||'new').replace('_',' ')}</span>;
}

export default function AgentPortal(){
  const {user,profile}=useAuth();
  const [properties,setProperties]=useState([]);
  const [inquiries,setInquiries]=useState([]);
  const [notifications,setNotifications]=useState([]);
  const [pending,setPending]=useState([]);
  const [reports,setReports]=useState([]);
  const [reviews,setReviews]=useState([]);
  const [messages,setMessages]=useState([]);
  const [accounts,setAccounts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [busyId,setBusyId]=useState('');
  const [filter,setFilter]=useState('all');
  const [adminMessage,setAdminMessage]=useState('');
  const isAdmin=profile?.role==='admin';

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const [listings,leads,notes]=await Promise.all([
        fetchMyProperties(user.id),fetchOwnerInquiries(user.id),fetchNotifications(user.id),
      ]);
      setProperties(listings);setInquiries(leads);setNotifications(notes);
      if(isAdmin){
        const client=requireSupabase();
        const [pendingResult,reportResult,reviewResult,messageResult,userResult]=await Promise.all([
          client.from('properties').select('id,title,city,country,currency,currency_code,price,created_at,moderation_status,owner_id,posted_by').eq('moderation_status','pending').order('created_at',{ascending:true}).limit(100),
          client.from('listing_reports').select('id,property_id,reporter_id,reason,details,status,created_at,property:properties(title,city,country)').in('status',['new','reviewing']).order('created_at',{ascending:true}).limit(100),
          client.from('broker_reviews').select('id,broker_id,reviewer_id,rating,review,created_at,agent:agent_public_profiles(public_name)').eq('moderation_status','pending').order('created_at',{ascending:true}).limit(100),
          client.from('contact_messages').select('id,name,email,subject,message,status,created_at').order('created_at',{ascending:false}).limit(100),
          client.from('profiles').select('id,display_name,full_name,role,suspended_at,suspended_reason,created_at').order('created_at',{ascending:false}).limit(100),
        ]);
        for(const result of [pendingResult,reportResult,reviewResult,messageResult,userResult])if(result.error)throw result.error;
        setPending(pendingResult.data||[]);setReports(reportResult.data||[]);setReviews(reviewResult.data||[]);
        setMessages(messageResult.data||[]);setAccounts(userResult.data||[]);
      }
    }catch(err){setError(err.message||'Could not load your dashboard.');}
    finally{setLoading(false);}
  },[user.id,isAdmin]);

  useEffect(()=>{load();},[load]);

  const updateLead=async(id,status)=>{
    setBusyId(id);setError('');
    try{
      const {error:updateError}=await requireSupabase().from('inquiries').update({status,updated_at:new Date().toISOString()}).eq('id',id);
      if(updateError)throw updateError;
      await load();
    }catch(err){setError(err.message||'Could not update inquiry status.');}
    finally{setBusyId('');}
  };

  const moderateProperty=async(id,decision)=>{
    const note=window.prompt(decision==='rejected'?'Reason for rejecting this listing (internal note):':'Optional moderation note:');
    if(note===null)return;
    setBusyId(id);setError('');
    try{
      const {data,error:rpcError}=await requireSupabase().rpc('moderate_property',{p_property_id:id,p_decision:decision,p_notes:note.trim()||null});
      if(rpcError)throw rpcError;
      if(!data)throw new Error('The property was not pending or could not be moderated.');
      await load();
    }catch(err){setError(err.message||'Could not moderate listing.');}
    finally{setBusyId('');}
  };

  const resolveReport=async(report,status)=>{
    const notes=window.prompt('Internal moderation notes (optional):');
    if(notes===null)return;
    setBusyId(report.id);setError('');
    try{
      const {error:updateError}=await requireSupabase().from('listing_reports').update({
        status,moderator_notes:notes.trim()||null,resolved_by:user.id,resolved_at:new Date().toISOString(),
      }).eq('id',report.id);
      if(updateError)throw updateError;
      await load();
    }catch(err){setError(err.message||'Could not update report.');}
    finally{setBusyId('');}
  };

  const moderateReview=async(review,decision)=>{
    setBusyId(review.id);setError('');
    try{
      const {data,error:rpcError}=await requireSupabase().rpc('moderate_broker_review',{
        p_review_id:review.id,p_decision:decision,p_verified_deal:false,
      });
      if(rpcError)throw rpcError;
      if(!data)throw new Error('The review is not pending or could not be moderated.');
      await load();
    }catch(err){setError(err.message||'Could not moderate broker review.');}
    finally{setBusyId('');}
  };

  const updateSupportMessage=async(id,status)=>{
    setBusyId(id);setError('');
    try{
      const {error:updateError}=await requireSupabase().from('contact_messages').update({status}).eq('id',id);
      if(updateError)throw updateError;
      await load();
    }catch(err){setError(err.message||'Could not update support ticket.');}
    finally{setBusyId('');}
  };

  const manageUser=async(account,action)=>{
    const reason=action==='suspend'?window.prompt('Reason for suspending this account:'):null;
    if(action==='suspend'&&reason===null)return;
    const label=action==='revoke_sessions'?'revoke all sessions':action;
    if(!window.confirm(`Confirm ${label} for ${account.full_name||account.display_name||account.id}?`))return;
    setBusyId(account.id);setError('');setAdminMessage('');
    try{
      const {data,error:functionError}=await requireSupabase().functions.invoke('admin-users',{
        body:{action,userId:account.id,reason:reason||null},
      });
      if(functionError)throw functionError;
      if(data?.error)throw new Error(data.error);
      setAdminMessage(`Account action completed: ${action.replace('_',' ')}.`);
      await load();
    }catch(err){setError(err.message||'The account action was not completed.');}
    finally{setBusyId('');}
  };

  const markRead=async(id)=>{
    try{
      const {error:updateError}=await requireSupabase().from('notifications').update({read_at:new Date().toISOString()}).eq('id',id);
      if(updateError)throw updateError;
      setNotifications((items)=>items.map((item)=>item.id===id?{...item,read_at:new Date().toISOString()}:item));
    }catch(err){setError(err.message||'Could not update notification.');}
  };

  const approved=properties.filter((item)=>item.moderation_status==='approved').length;
  const waiting=properties.filter((item)=>item.moderation_status==='pending').length;
  const visibleInquiries=inquiries.filter((lead)=>filter==='all'||lead.status===filter);

  return(
    <div className="container page-section">
      <div className="dashboard-heading">
        <div><span className="section-label"><Building2 size={14}/> PropertyX workspace</span><h1>Welcome{profile?.full_name||profile?.display_name?`, ${profile.full_name||profile.display_name}`:''}</h1><p className="sub">{isAdmin?'Administrator and moderation workspace.':'Manage your listings, inquiries and account activity.'}</p></div>
        <div className="dashboard-actions"><button className="btn btn-outline" onClick={load} disabled={loading}><RefreshCw size={15}/> Refresh</button><Link to="/post-property" className="btn btn-primary"><Plus size={15}/> Post property</Link></div>
      </div>
      {error&&<div className="form-error" role="alert">{error}</div>}
      {adminMessage&&<div className="success-message" role="status">{adminMessage}</div>}
      <div className="dashboard-stats">
        <div className="dashboard-stat"><Building2/><b>{properties.length}</b><span>My listings</span></div>
        <div className="dashboard-stat"><Check/><b>{approved}</b><span>Approved</span></div>
        <div className="dashboard-stat"><Clock3/><b>{waiting}</b><span>Under review</span></div>
        <div className="dashboard-stat"><Inbox/><b>{inquiries.length}</b><span>Inquiries received</span></div>
      </div>

      {isAdmin&&<>
        <section className="dashboard-panel">
          <div className="section-head-row"><div><h2><ShieldCheck size={18}/> Listing moderation</h2><p>Approve or reject seller submissions using server-side role checks.</p></div><StatusPill value={pending.length?'pending':'clear'}/></div>
          {pending.length===0?<p className="empty-inline">No listings are waiting for review.</p>:<div className="table-wrap"><table className="data-table"><thead><tr><th>Property</th><th>Location</th><th>Price</th><th>Submitted</th><th>Actions</th></tr></thead><tbody>{pending.map((item)=><tr key={item.id}><td><Link to={`/property/${item.id}`}>{item.title}</Link></td><td>{[item.city,item.country].filter(Boolean).join(', ')}</td><td>{formatCurrency(item.price,item.currency_code||item.currency||'USD')}</td><td>{formatDate(item.created_at)}</td><td className="table-actions"><button className="btn btn-primary btn-xs" disabled={busyId===item.id} onClick={()=>moderateProperty(item.id,'approved')}><Check size={13}/> Approve</button><button className="btn btn-outline btn-xs" disabled={busyId===item.id} onClick={()=>moderateProperty(item.id,'rejected')}><XCircle size={13}/> Reject</button></td></tr>)}</tbody></table></div>}
        </section>

        <section className="dashboard-panel">
          <div className="section-head-row"><div><h2><Flag size={18}/> Listing reports</h2><p>Investigate buyer reports. Resolution is stored with the moderator identity.</p></div><span>{reports.length} open</span></div>
          {reports.length===0?<p className="empty-inline">No open reports.</p>:<div className="table-wrap"><table className="data-table"><thead><tr><th>Listing</th><th>Reason</th><th>Details</th><th>Reported</th><th>Actions</th></tr></thead><tbody>{reports.map((report)=><tr key={report.id}><td>{report.property?.title||report.property_id}</td><td>{report.reason}</td><td className="message-cell">{report.details||'No additional details'}</td><td>{formatDate(report.created_at)}</td><td className="table-actions"><button className="btn btn-primary btn-xs" disabled={busyId===report.id} onClick={()=>resolveReport(report,'resolved')}>Resolve</button><button className="btn btn-outline btn-xs" disabled={busyId===report.id} onClick={()=>resolveReport(report,'dismissed')}>Dismiss</button></td></tr>)}</tbody></table></div>}
        </section>

        <section className="dashboard-panel">
          <div className="section-head-row"><div><h2><Star size={18}/> Broker reviews</h2><p>Publish only reviewed submissions. Verified-deal status is not assigned automatically.</p></div><span>{reviews.length} pending</span></div>
          {reviews.length===0?<p className="empty-inline">No broker reviews are waiting for moderation.</p>:<div className="review-moderation-list">{reviews.map((review)=><div className="review-moderation-item" key={review.id}><div><b>{review.agent?.public_name||review.broker_id}</b><span>{review.rating}/5 · {formatDate(review.created_at)}</span><p>{review.review}</p></div><div className="table-actions"><button className="btn btn-primary btn-xs" disabled={busyId===review.id} onClick={()=>moderateReview(review,'approved')}>Approve</button><button className="btn btn-outline btn-xs" disabled={busyId===review.id} onClick={()=>moderateReview(review,'rejected')}>Reject</button></div></div>)}</div>}
        </section>

        <section className="dashboard-panel">
          <div className="section-head-row"><div><h2><Mail size={18}/> Support inbox</h2><p>Customer support requests stored in PropertyX.</p></div><span>{messages.length} tickets</span></div>
          {messages.length===0?<p className="empty-inline">No support messages received.</p>:<div className="table-wrap"><table className="data-table"><thead><tr><th>Customer</th><th>Subject</th><th>Message</th><th>Received</th><th>Status</th></tr></thead><tbody>{messages.map((item)=><tr key={item.id}><td>{item.name}<small>{item.email}</small></td><td>{item.subject}</td><td className="message-cell">{item.message}</td><td>{formatDate(item.created_at)}</td><td><select className="input compact-select" value={item.status} disabled={busyId===item.id} onChange={(event)=>updateSupportMessage(item.id,event.target.value)}><option value="new">New</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></td></tr>)}</tbody></table></div>}
        </section>

        <section className="dashboard-panel">
          <div className="section-head-row"><div><h2><Users size={18}/> Account security actions</h2><p>Suspend, restore or revoke sessions for another account. You cannot target your own administrator account.</p></div><span>{accounts.length} profiles</span></div>
          {accounts.length===0?<p className="empty-inline">No account profiles returned.</p>:<div className="table-wrap"><table className="data-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead><tbody>{accounts.map((account)=><tr key={account.id}><td>{account.full_name||account.display_name||account.id}<small>{account.id}</small></td><td>{account.role||'buyer'}</td><td><StatusPill value={account.suspended_at?'suspended':'active'}/></td><td>{formatDate(account.created_at)}</td><td className="table-actions">{account.id!==user.id&&<><button className="btn btn-outline btn-xs" disabled={busyId===account.id} onClick={()=>manageUser(account,account.suspended_at?'unsuspend':'suspend')}>{account.suspended_at?'Restore':'Suspend'}</button><button className="btn btn-outline btn-xs" disabled={busyId===account.id} onClick={()=>manageUser(account,'revoke_sessions')}>Revoke sessions</button></>}</td></tr>)}</tbody></table></div>}
        </section>
      </>}

      <div className="dashboard-columns">
        <section className="dashboard-panel">
          <div className="section-head-row"><div><h2>My properties</h2><p>Your submitted, approved and archived listings.</p></div><Link to="/post-property" className="link-more">Add listing <Plus size={14}/></Link></div>
          {loading?<p className="empty-inline">Loading listings…</p>:properties.length===0?<div className="empty-inline">You have not posted a property yet. <Link to="/post-property">Create your first listing.</Link></div>:<div className="owner-listings">{properties.map((item)=><div className="owner-listing" key={item.id}><div><Link to={`/property/${item.id}`}><b>{item.title}</b></Link><small>{[item.city,item.country].filter(Boolean).join(', ')} · {formatDate(item.created_at)}</small></div><StatusPill value={item.moderation_status}/></div>)}</div>}
        </section>
        <section className="dashboard-panel">
          <div className="section-head-row"><div><h2><Bell size={18}/> Notifications</h2><p>Updates related to your account and listings.</p></div><span>{notifications.filter((item)=>!item.read_at).length} unread</span></div>
          {notifications.length===0?<p className="empty-inline">No notifications yet.</p>:<div className="notification-list">{notifications.slice(0,10).map((item)=><div className={`notification-item ${item.read_at?'read':''}`} key={item.id}><div><b>{item.title}</b><p>{item.body}</p><small>{formatDate(item.created_at)}</small></div>{!item.read_at&&<button onClick={()=>markRead(item.id)}>Mark read</button>}</div>)}</div>}
        </section>
      </div>

      <section className="dashboard-panel">
        <div className="section-head-row"><div><h2>Incoming inquiries</h2><p>Lead details shared by buyers who contacted your listings.</p></div><select className="input compact-select" value={filter} onChange={(event)=>setFilter(event.target.value)}><option value="all">All statuses</option>{LEAD_STATUSES.map((status)=><option key={status} value={status}>{status}</option>)}</select></div>
        {visibleInquiries.length===0?<p className="empty-inline">No inquiries for this filter.</p>:<div className="table-wrap"><table className="data-table"><thead><tr><th>Buyer</th><th>Property</th><th>Contact</th><th>Message</th><th>Received</th><th>Status</th></tr></thead><tbody>{visibleInquiries.map((lead)=><tr key={lead.id}><td>{lead.name}<small>{lead.email||'Email not shared'}</small></td><td>{lead.property?.title||'Listing'}</td><td>{lead.phone}</td><td className="message-cell">{lead.message}</td><td>{formatDate(lead.created_at)}</td><td><select className="input compact-select" value={lead.status} disabled={busyId===lead.id} onChange={(event)=>updateLead(lead.id,event.target.value)}>{LEAD_STATUSES.map((status)=><option value={status} key={status}>{status}</option>)}</select></td></tr>)}</tbody></table></div>}
      </section>
      <div className="dashboard-panel compact-panel"><h2>Account and regional preferences</h2><p>Manage your profile, country, city, currency, timezone, security and public agent profile.</p><Link to="/settings" className="btn btn-outline">Account settings</Link></div>
    </div>
  );
}

import { useState } from 'react';
import { Send,LifeBuoy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { requireSupabase } from '../lib/data';

export default function Contact(){
  const {user,profile}=useAuth();
  const [form,setForm]=useState({name:profile?.full_name||profile?.display_name||'',email:user?.email||'',subject:'',message:''});
  const [busy,setBusy]=useState(false);
  const [sent,setSent]=useState(false);
  const [error,setError]=useState('');
  const change=(key,value)=>setForm((old)=>({...old,[key]:value}));
  const submit=async(event)=>{
    event.preventDefault();setBusy(true);setError('');
    try{
      const {error:insertError}=await requireSupabase().from('contact_messages').insert({
        user_id:user?.id||null,
        name:form.name.trim(),
        email:form.email.trim(),
        subject:form.subject.trim(),
        message:form.message.trim(),
      });
      if(insertError)throw insertError;
      setSent(true);
    }catch(err){setError(err.message||'Your message could not be submitted.');}
    finally{setBusy(false);}
  };
  return(
    <div className="container page-section narrow">
      <div className="page-head"><h1><LifeBuoy size={23}/> Contact and support</h1><p className="sub">Send a support request. Your message is stored securely for the PropertyX support team.</p></div>
      {sent?<div className="success-panel"><LifeBuoy size={34}/><h2>Message received</h2><p>Your support message has been recorded. A response will be sent when a support email channel is configured for this deployment.</p></div>:(
        <form className="listing-form" onSubmit={submit}>
          <label className="form-field"><span>Your name</span><input className="input" required minLength={2} maxLength={120} value={form.name} onChange={(event)=>change('name',event.target.value)}/></label>
          <label className="form-field"><span>Email address</span><input className="input" required type="email" maxLength={254} value={form.email} onChange={(event)=>change('email',event.target.value)}/></label>
          <label className="form-field"><span>Subject</span><input className="input" required minLength={3} maxLength={120} value={form.subject} onChange={(event)=>change('subject',event.target.value)}/></label>
          <label className="form-field"><span>Message</span><textarea className="input" required minLength={20} maxLength={5000} rows={6} value={form.message} onChange={(event)=>change('message',event.target.value)}/></label>
          {error&&<div className="form-error" role="alert">{error}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}><Send size={15}/>{busy?'Sending…':'Submit support request'}</button>
        </form>
      )}
    </div>
  );
}

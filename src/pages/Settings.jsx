import { useEffect,useMemo,useState } from 'react';
import { Download,LogOut,Save,ShieldCheck,UserRound,Globe2,Bell,Trash2,KeyRound,CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateMyProfile,requireSupabase } from '../lib/data';
import { supabase } from '../lib/supabase';

const COUNTRY_CODES=["AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ","BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE","EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM","HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW","SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI","VN","VU","WF","WS","YE","YT","ZA","ZM","ZW"];
const COUNTRY_NAMES=new Intl.DisplayNames([typeof navigator!=='undefined'?navigator.language:'en'],{type:'region'});
const DEFAULT_CURRENCY={US:'USD',GB:'GBP',PK:'PKR',IN:'INR',AE:'AED',SA:'SAR',QA:'QAR',KW:'KWD',BH:'BHD',OM:'OMR',CA:'CAD',AU:'AUD',SG:'SGD',JP:'JPY',CN:'CNY',TR:'TRY',DE:'EUR',FR:'EUR',IT:'EUR',ES:'EUR',NL:'EUR',CH:'CHF'};
const TIMEZONES=typeof Intl.supportedValuesOf==='function'?Intl.supportedValuesOf('timeZone'):[];

function downloadJson(filename,data){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download=filename;anchor.click();
  URL.revokeObjectURL(url);
}

export default function Settings(){
  const {user,profile,refreshProfile,signOut,updatePassword}=useAuth();
  const navigate=useNavigate();
  const [form,setForm]=useState({});
  const [publicProfile,setPublicProfile]=useState({public_name:'',headline:'',bio:'',company_name:'',avatar_url:'',city:'',country_code:'PK',public_phone:'',website_url:'',is_published:false});
  const [preferences,setPreferences]=useState({inapp_enabled:true,email_enabled:true});
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [password,setPassword]=useState('');
  const [mfaFactors,setMfaFactors]=useState([]);
  const [mfaFactor,setMfaFactor]=useState(null);
  const [mfaChallenge,setMfaChallenge]=useState(null);
  const [mfaCode,setMfaCode]=useState('');
  const [mfaQr,setMfaQr]=useState('');
  const [mfaSecret,setMfaSecret]=useState('');
  const [mfaLoading,setMfaLoading]=useState(false);

  const countryOptions=useMemo(()=>COUNTRY_CODES.map((code)=>({code,name:COUNTRY_NAMES.of(code)||code})).sort((a,b)=>a.name.localeCompare(b.name)),[]);
  const role=profile?.role;
  const canPublishAgentProfile=['agent','seller'].includes(role);
  const update=(key,value)=>setForm((old)=>({...old,[key]:value}));

  const loadMfa=async()=>{
    if(!supabase)return;
    try{
      const {data,error:listError}=await supabase.auth.mfa.listFactors();
      if(listError)throw listError;
      setMfaFactors(data?.totp||[]);
    }catch(err){console.warn('Unable to load MFA factors:',err);}
  };

  useEffect(()=>{
    if(!profile)return;
    setForm({
      full_name:profile.full_name||profile.display_name||'',
      bio:profile.bio||'',phone:profile.phone||'',company_name:profile.company_name||'',
      preferred_country_code:profile.preferred_country_code||'PK',
      preferred_city:profile.preferred_city||'',
      preferred_currency_code:profile.preferred_currency_code||'PKR',
      preferred_timezone:profile.preferred_timezone||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',
      preferred_language:profile.preferred_language||'en',
    });
  },[profile]);

  useEffect(()=>{
    if(!user?.id)return;
    let active=true;
    Promise.all([
      requireSupabase().from('notification_preferences').select('inapp_enabled,email_enabled').eq('user_id',user.id).maybeSingle(),
      requireSupabase().from('agent_public_profiles').select('*').eq('user_id',user.id).maybeSingle(),
    ]).then(([notificationResult,agentResult])=>{
      if(!active)return;
      if(!notificationResult.error&&notificationResult.data)setPreferences(notificationResult.data);
      if(!agentResult.error&&agentResult.data)setPublicProfile((old)=>({...old,...agentResult.data}));
    }).catch((err)=>console.warn('Could not load account preferences:',err));
    loadMfa();
    return ()=>{active=false;};
  },[user?.id]);

  const saveProfile=async(event)=>{
    event.preventDefault();setBusy(true);setError('');setMessage('');
    try{
      await updateMyProfile(user.id,{
        ...form,display_name:form.full_name,
        preferred_country_code:String(form.preferred_country_code||'').toUpperCase(),
        preferred_currency_code:String(form.preferred_currency_code||'').toUpperCase(),
      });
      await refreshProfile();
      setMessage('Profile and regional preferences saved.');
    }catch(err){setError(err.message||'Could not save account details.');}
    finally{setBusy(false);}
  };

  const saveNotifications=async(event)=>{
    event.preventDefault();setBusy(true);setError('');setMessage('');
    try{
      const {error:saveError}=await requireSupabase().from('notification_preferences').upsert({
        user_id:user.id,inapp_enabled:preferences.inapp_enabled,email_enabled:preferences.email_enabled,updated_at:new Date().toISOString(),
      },{onConflict:'user_id'});
      if(saveError)throw saveError;
      setMessage('Notification preferences saved.');
    }catch(err){setError(err.message||'Could not save notification preferences.');}
    finally{setBusy(false);}
  };

  const saveAgentProfile=async(event)=>{
    event.preventDefault();setBusy(true);setError('');setMessage('');
    try{
      if(String(publicProfile.public_name||'').trim().length<2)throw new Error('Enter a public display name.');
      const payload={
        user_id:user.id,
        ...publicProfile,
        public_name:String(publicProfile.public_name).trim(),
        country_code:String(publicProfile.country_code||'').toUpperCase(),
        updated_at:new Date().toISOString(),
      };
      const {error:saveError}=await requireSupabase().from('agent_public_profiles').upsert(payload,{onConflict:'user_id'});
      if(saveError)throw saveError;
      setMessage(publicProfile.is_published?'Public agent profile saved and published.':'Agent profile saved as private.');
    }catch(err){setError(err.message||'Could not save agent profile.');}
    finally{setBusy(false);}
  };

  const changePassword=async(event)=>{
    event.preventDefault();setBusy(true);setError('');setMessage('');
    try{
      if(password.length<8)throw new Error('Use a password with at least 8 characters.');
      await updatePassword(password);setPassword('');setMessage('Password updated.');
    }catch(err){setError(err.message||'Could not update password.');}
    finally{setBusy(false);}
  };

  const enrollMfa=async()=>{
    setMfaLoading(true);setError('');setMessage('');
    try{
      const {data,error:enrollError}=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'PropertyX authenticator'});
      if(enrollError)throw enrollError;
      setMfaFactor(data.id);setMfaQr(data.totp.qr_code);setMfaSecret(data.totp.secret);
      setMessage('Scan the QR code with your authenticator app, then enter its six-digit code.');
    }catch(err){setError(err.message||'Could not start MFA enrollment.');}
    finally{setMfaLoading(false);}
  };

  const verifyMfa=async()=>{
    setMfaLoading(true);setError('');
    try{
      let challengeId=mfaChallenge;
      if(!challengeId){
        const {data,error:challengeError}=await supabase.auth.mfa.challenge({factorId:mfaFactor});
        if(challengeError)throw challengeError;
        challengeId=data.id;setMfaChallenge(challengeId);
      }
      const {error:verifyError}=await supabase.auth.mfa.verify({factorId:mfaFactor,challengeId,code:mfaCode.trim()});
      if(verifyError)throw verifyError;
      setMfaFactor(null);setMfaChallenge(null);setMfaCode('');setMfaQr('');setMfaSecret('');
      await loadMfa();setMessage('Two-factor authentication has been enrolled on this account.');
    }catch(err){setError(err.message||'Authenticator code was not accepted.');}
    finally{setMfaLoading(false);}
  };

  const disableMfa=async(factorId)=>{
    if(!window.confirm('Disable this authenticator factor?'))return;
    setMfaLoading(true);setError('');
    try{
      const {error:removeError}=await supabase.auth.mfa.unenroll({factorId});
      if(removeError)throw removeError;
      await loadMfa();setMessage('Authenticator factor removed.');
    }catch(err){setError(err.message||'Could not remove MFA factor.');}
    finally{setMfaLoading(false);}
  };

  const exportData=async()=>{
    setBusy(true);setError('');
    try{
      const queries=await Promise.all([
        requireSupabase().from('profiles').select('id,display_name,full_name,avatar_url,role,bio,phone,company_name,created_at,preferred_country_code,preferred_city,preferred_currency_code,preferred_timezone,preferred_language').eq('id',user.id).maybeSingle(),
        requireSupabase().from('properties').select('*').or(`owner_id.eq.${user.id},posted_by.eq.${user.id}`),
        requireSupabase().from('favorites').select('id,property_id,created_at').eq('user_id',user.id),
        requireSupabase().from('saved_searches').select('id,query,filters,created_at').eq('user_id',user.id),
        requireSupabase().from('inquiries').select('id,property_id,name,email,phone,message,status,created_at').or(`inquirer_id.eq.${user.id},user_id.eq.${user.id}`),
      ]);
      for(const result of queries){if(result.error)throw result.error;}
      downloadJson(`propertyx-data-export-${new Date().toISOString().slice(0,10)}.json`,{
        exported_at:new Date().toISOString(),
        profile:queries[0].data,
        properties:queries[1].data||[],
        favorites:queries[2].data||[],
        saved_searches:queries[3].data||[],
        inquiries:queries[4].data||[],
      });
      setMessage('Your account data export has been prepared.');
    }catch(err){setError(err.message||'Could not export your data.');}
    finally{setBusy(false);}
  };

  const deleteAccount=async()=>{
    const confirmation=window.prompt('This permanently deletes your PropertyX account. Type DELETE to confirm:');
    if(confirmation!=='DELETE')return;
    setBusy(true);setError('');
    try{
      const {error:deleteError}=await requireSupabase().rpc('delete_my_account');
      if(deleteError)throw deleteError;
      await signOut();navigate('/');
    }catch(err){setError(err.message||'Account deletion could not be completed. Some linked records may require administrator review.');}
    finally{setBusy(false);}
  };

  const signOutNow=async()=>{
    try{await signOut();navigate('/');}
    catch(err){setError(err.message||'Unable to sign out.');}
  };

  const setPublic=(key,value)=>setPublicProfile((old)=>({...old,[key]:value}));
  return(
    <div className="container page-section narrow">
      <div className="page-head"><h1><UserRound size={22}/> Account settings</h1><p className="sub">Manage your identity, regional defaults, agent presence, notifications and security.</p></div>
      <form className="listing-form" onSubmit={saveProfile}>
        <h2>Personal profile</h2>
        <label className="form-field"><span>Full name</span><input className="input" value={form.full_name||''} onChange={(e)=>update('full_name',e.target.value)} required maxLength={120}/></label>
        <label className="form-field"><span>Phone</span><input className="input" value={form.phone||''} onChange={(e)=>update('phone',e.target.value)} maxLength={40}/></label>
        <label className="form-field"><span>Company / agency</span><input className="input" value={form.company_name||''} onChange={(e)=>update('company_name',e.target.value)} maxLength={160}/></label>
        <label className="form-field"><span>Bio</span><textarea className="input" rows={4} value={form.bio||''} onChange={(e)=>update('bio',e.target.value)} maxLength={3000}/></label>
        <h2><Globe2 size={18}/> Regional preferences</h2>
        <label className="form-field"><span>Country</span><select className="input" value={form.preferred_country_code||'PK'} onChange={(e)=>{
          const code=e.target.value;
          setForm((old)=>({...old,preferred_country_code:code,preferred_currency_code:DEFAULT_CURRENCY[code]||old.preferred_currency_code}));
        }}>{countryOptions.map((country)=><option key={country.code} value={country.code}>{country.name} ({country.code})</option>)}</select></label>
        <div className="form-grid two">
          <label className="form-field"><span>City</span><input className="input" value={form.preferred_city||''} onChange={(e)=>update('preferred_city',e.target.value)} maxLength={100}/></label>
          <label className="form-field"><span>Currency code (ISO 4217)</span><input className="input" value={form.preferred_currency_code||''} onChange={(e)=>update('preferred_currency_code',e.target.value.toUpperCase())} maxLength={3}/></label>
          <label className="form-field"><span>Timezone (IANA)</span><input className="input" list="propertyx-timezones" value={form.preferred_timezone||''} onChange={(e)=>update('preferred_timezone',e.target.value)} maxLength={100}/><datalist id="propertyx-timezones">{TIMEZONES.map((zone)=><option key={zone} value={zone}/>)}</datalist></label>
          <label className="form-field"><span>Language code</span><input className="input" value={form.preferred_language||'en'} onChange={(e)=>update('preferred_language',e.target.value)} maxLength={12}/></label>
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}><Save size={15}/>{busy?'Saving…':'Save profile and preferences'}</button>
      </form>

      {canPublishAgentProfile&&<form className="listing-form" onSubmit={saveAgentProfile}>
        <h2>Public agent profile</h2>
        <p className="sub">This separate profile is visible to visitors only when you publish it. Your private account details stay private.</p>
        <label className="form-field"><span>Public name</span><input className="input" maxLength={120} required value={publicProfile.public_name} onChange={(e)=>setPublic('public_name',e.target.value)}/></label>
        <label className="form-field"><span>Professional headline</span><input className="input" maxLength={160} value={publicProfile.headline||''} onChange={(e)=>setPublic('headline',e.target.value)}/></label>
        <label className="form-field"><span>Public biography</span><textarea className="input" rows={4} maxLength={3000} value={publicProfile.bio||''} onChange={(e)=>setPublic('bio',e.target.value)}/></label>
        <div className="form-grid two">
          <label className="form-field"><span>Company</span><input className="input" maxLength={160} value={publicProfile.company_name||''} onChange={(e)=>setPublic('company_name',e.target.value)}/></label>
          <label className="form-field"><span>City</span><input className="input" maxLength={100} value={publicProfile.city||''} onChange={(e)=>setPublic('city',e.target.value)}/></label>
          <label className="form-field"><span>Country code</span><input className="input" maxLength={2} value={publicProfile.country_code||''} onChange={(e)=>setPublic('country_code',e.target.value.toUpperCase())}/></label>
          <label className="form-field"><span>Public phone</span><input className="input" maxLength={40} value={publicProfile.public_phone||''} onChange={(e)=>setPublic('public_phone',e.target.value)}/></label>
        </div>
        <label className="form-field"><span>Public avatar URL</span><input className="input" type="url" maxLength={2000} value={publicProfile.avatar_url||''} onChange={(e)=>setPublic('avatar_url',e.target.value)}/></label>
        <label className="form-field"><span>Website</span><input className="input" type="url" maxLength={500} value={publicProfile.website_url||''} onChange={(e)=>setPublic('website_url',e.target.value)}/></label>
        <label className="checkbox-label"><input type="checkbox" checked={Boolean(publicProfile.is_published)} onChange={(e)=>setPublic('is_published',e.target.checked)}/> Publish my agent profile in the public directory</label>
        <button className="btn btn-primary" type="submit" disabled={busy}>Save public profile</button>
      </form>}

      <form className="listing-form" onSubmit={saveNotifications}>
        <h2><Bell size={18}/> Notification preferences</h2>
        <label className="checkbox-label"><input type="checkbox" checked={Boolean(preferences.inapp_enabled)} onChange={(e)=>setPreferences((old)=>({...old,inapp_enabled:e.target.checked}))}/> In-app notifications</label>
        <label className="checkbox-label"><input type="checkbox" checked={Boolean(preferences.email_enabled)} onChange={(e)=>setPreferences((old)=>({...old,email_enabled:e.target.checked}))}/> Email notifications (when a delivery provider is configured)</label>
        <button className="btn btn-outline" type="submit" disabled={busy}>Save notification preferences</button>
      </form>

      <form className="listing-form" onSubmit={changePassword}>
        <h2><ShieldCheck size={18}/> Password and two-factor authentication</h2>
        <label className="form-field"><span>New password</span><input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} minLength={8} autoComplete="new-password"/></label>
        <button className="btn btn-outline" type="submit" disabled={busy||!password}>Update password</button>
        <div className="security-divider"/>
        <h3><KeyRound size={16}/> Authenticator app</h3>
        {mfaFactors.map((factor)=><div className="mfa-factor" key={factor.id}><span><CheckCircle2 size={16}/> {factor.friendly_name||'Authenticator'} · {factor.status}</span><button className="btn btn-outline btn-xs" type="button" disabled={mfaLoading} onClick={()=>disableMfa(factor.id)}>Remove</button></div>)}
        {mfaFactor?<>
          {mfaQr&&<img className="mfa-qr" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(mfaQr)}`} alt="Authenticator setup QR code"/>}
          <p className="sub">Secret key: <code>{mfaSecret}</code></p>
          <label className="form-field"><span>Six-digit authenticator code</span><input className="input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={mfaCode} onChange={(e)=>setMfaCode(e.target.value.replace(/\D/g,'').slice(0,6))}/></label>
          <button className="btn btn-primary" type="button" onClick={verifyMfa} disabled={mfaLoading||mfaCode.length!==6}>Verify and enable MFA</button>
        </>:<button className="btn btn-outline" type="button" onClick={enrollMfa} disabled={mfaLoading||mfaFactors.some((factor)=>factor.status==='verified')}>{mfaLoading?'Preparing…':'Set up authenticator'}</button>}
      </form>

      <div className="listing-form">
        <h2><Download size={18}/> Your data</h2>
        <p>Download a copy of your profile, your listings, saved properties, saved searches and inquiries.</p>
        <button className="btn btn-outline" type="button" onClick={exportData} disabled={busy}>Export my account data</button>
      </div>
      <div className="listing-form danger-zone">
        <h2><Trash2 size={18}/> Delete account</h2>
        <p>Account deletion is permanent. Linked financial or compliance records may prevent deletion until they are resolved.</p>
        <button className="btn btn-danger" type="button" onClick={deleteAccount} disabled={busy}>Delete my account</button>
      </div>
      {message&&<div className="success-message" role="status">{message}</div>}
      {error&&<div className="form-error" role="alert">{error}</div>}
      <button className="btn btn-outline" onClick={signOutNow}><LogOut size={15}/> Sign out</button>
    </div>
  );
}

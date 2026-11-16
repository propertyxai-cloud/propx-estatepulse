import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Lock, LogIn, Mail, UserPlus, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function GoogleIcon(){return <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.7 39.7 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>}

export default function Login(){
  const {signIn,signUp,signInWithGoogle,resetPassword,updatePassword,user}=useAuth();
  const navigate=useNavigate();
  const [params]=useSearchParams();
  const [mode,setMode]=useState(params.get('recovery')==='1'?'recovery':'login');
  const [form,setForm]=useState({name:'',email:'',password:'',role:'buyer'});
  const [message,setMessage]=useState(null);
  const [busy,setBusy]=useState(false);

  useEffect(()=>{if(user&&mode!=='recovery')navigate('/agent-portal',{replace:true});},[user,mode,navigate]);

  const submit=async(event)=>{
    event.preventDefault();setBusy(true);setMessage(null);
    try{
      if(mode==='login'){
        await signIn(form.email,form.password);
        navigate('/agent-portal',{replace:true});
      }else if(mode==='signup'){
        if(form.password.length<8)throw new Error('Use a password with at least 8 characters.');
        const result=await signUp(form.email,form.password,form.name,form.role);
        setMessage({type:'success',text:result?.session?'Account created and signed in.':'Account created. Check your email if email confirmation is enabled.'});
        if(result?.session)navigate('/agent-portal',{replace:true});else setMode('login');
      }else if(mode==='reset'){
        await resetPassword(form.email);
        setMessage({type:'success',text:'If an account exists for that email, a password reset link has been sent.'});
      }else{
        if(form.password.length<8)throw new Error('Use a password with at least 8 characters.');
        await updatePassword(form.password);
        setMessage({type:'success',text:'Your password has been updated.'});
        setMode('login');
      }
    }catch(err){setMessage({type:'error',text:err.message||'The request failed. Please try again.'});}
    finally{setBusy(false);}
  };

  const title=mode==='login'?'Welcome back':mode==='signup'?'Create your PropertyX account':mode==='reset'?'Reset your password':'Choose a new password';
  return(
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-icon">{mode==='recovery'?<KeyRound size={20}/>:<LogIn size={20}/>}</div>
        <h1 className="auth-title">{title}</h1>
        <div className="auth-sub">Secure access to your PropertyX marketplace account.</div>
        {mode==='login'&&<><button className="google-btn" style={{marginTop:22}} onClick={()=>signInWithGoogle().catch((err)=>setMessage({type:'error',text:err.message}))}><GoogleIcon/> Continue with Google</button><div className="or-divider">OR</div></>}
        {message&&<div className={`auth-msg ${message.type}`} role="status">{message.text}</div>}
        <form className="auth-form" onSubmit={submit}>
          {mode==='signup'&&<>
            <div className="auth-input"><UserPlus size={15}/><input className="input" placeholder="Full name" autoComplete="name" maxLength={120} value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} required/></div>
            <label className="form-field"><span>Account type</span><select className="input" value={form.role} onChange={(e)=>setForm({...form,role:e.target.value})}><option value="buyer">Buyer</option><option value="seller">Seller</option><option value="investor">Investor</option><option value="agent">Agent / broker</option></select></label>
          </>}
          {(mode==='login'||mode==='signup'||mode==='reset')&&<div className="auth-input"><Mail size={15}/><input className="input" type="email" placeholder="Email address" autoComplete="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} required/></div>}
          {(mode==='login'||mode==='signup'||mode==='recovery')&&<div className="auth-input"><Lock size={15}/><input className="input" type="password" placeholder={mode==='login'?'Password':'New password'} autoComplete={mode==='login'?'current-password':'new-password'} value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} minLength={8} required/></div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{busy?'Please wait…':mode==='login'?'Log in':mode==='signup'?'Create account':mode==='reset'?'Send reset link':'Update password'} <ArrowRight size={15}/></button>
        </form>
        <div className="auth-foot">
          {mode==='login'?<>New to PropertyX? <button type="button" className="text-button" onClick={()=>{setMode('signup');setMessage(null);}}>Create account</button><br/><button type="button" className="text-button" onClick={()=>{setMode('reset');setMessage(null);}}>Forgot password?</button></>
          :mode==='signup'||mode==='reset'?<button type="button" className="text-button" onClick={()=>{setMode('login');setMessage(null);}}>Back to login</button>
          :<button type="button" className="text-button" onClick={()=>{setMode('login');setMessage(null);}}>Back to login</button>}
        </div>
      </div>
    </div>
  );
}

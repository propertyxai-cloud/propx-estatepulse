import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, LogIn, Mail, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.7 39.7 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

export default function Login() {
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    navigate('/agent-portal', { replace: true });
    return null;
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'login') {
        await signIn(form.email, form.password);
        navigate('/agent-portal', { replace: true });
      } else {
        await signUp(form.email, form.password, form.name);
        setMsg({ type: 'success', text: 'Account created! Please check your email to confirm, then log in.' });
        setMode('login');
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Something went wrong. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-icon"><LogIn size={20} /></div>
        <h1 className="auth-title">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <div className="auth-sub">{mode === 'login' ? 'Log in to your account' : 'Join thousands using EstatePulse'}</div>

        <button className="google-btn" style={{ marginTop: 22 }} onClick={() => signInWithGoogle().catch((err) => setMsg({ type: 'error', text: err.message }))}>
          <GoogleIcon /> Continue with Google
        </button>
        <div className="or-divider">OR</div>

        {msg && <div className={`auth-msg ${msg.type}`}>{msg.text}</div>}

        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && (
            <div className="auth-input">
              <UserPlus size={15} />
              <input
                className="input"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          )}
          <div className="auth-input">
            <Mail size={15} />
            <input
              className="input"
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="auth-input">
            <Lock size={15} />
            <input
              className="input"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </div>
          {mode === 'login' && (
            <div className="auth-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input type="checkbox" style={{ accentColor: 'var(--color-primary)' }} /> Remember me
              </label>
              <a href="#forgot" onClick={(e) => e.preventDefault()}>Forgot password?</a>
            </div>
          )}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'} <ArrowRight size={15} />
          </button>
        </form>

        <div className="auth-foot">
          {mode === 'login' ? (
            <>Don't have an account? <a href="#signup" onClick={(e) => { e.preventDefault(); setMode('signup'); setMsg(null); }}>Create one</a></>
          ) : (
            <>Already have an account? <a href="#login" onClick={(e) => { e.preventDefault(); setMode('login'); setMsg(null); }}>Log in</a></>
          )}
        </div>
      </div>
    </div>
  );
}

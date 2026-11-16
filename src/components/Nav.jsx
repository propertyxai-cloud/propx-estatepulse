import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, Building2, CreditCard, Heart, Menu, Plus, Settings, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LINKS=[
  {to:'/ai-search',label:'AI Search'},
  {to:'/properties',label:'Buy'},
  {to:'/properties?type=rent',label:'Rent'},
  {to:'/investor',label:'Invest'},
  {to:'/map-search',label:'Map'},
  {to:'/price-trends',label:'Market'},
  {to:'/societies',label:'Societies'},
  {to:'/broker-ratings',label:'Agents'},
];

export default function Nav(){
  const [open,setOpen]=useState(false);
  const {user,profile}=useAuth();
  const navigate=useNavigate();
  const account=()=>navigate(user?'/agent-portal':'/login');

  return(
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="logo" onClick={()=>setOpen(false)}><span className="logo-mark"><Building2 size={18}/></span><span className="logo-text">PropertyX</span></Link>
        <nav className="nav-links" aria-label="Main navigation">
          {LINKS.map((link)=><NavLink key={link.to+link.label} to={link.to} className={({isActive})=>`nav-link ${isActive?'active':''}`}>{link.label}</NavLink>)}
        </nav>
        <div className="nav-actions">
          {user&&<button className="icon-btn" aria-label="Notifications and dashboard" onClick={()=>navigate('/agent-portal')}><Bell size={17}/></button>}
          <button className="icon-btn" aria-label="Saved properties" onClick={()=>navigate(user?'/favorites':'/login')}><Heart size={17}/></button>
          <button className="btn btn-primary btn-post-ad" onClick={()=>navigate(user?'/post-property':'/login')}><Plus size={15}/> Post property</button>
          <button className="avatar-btn" aria-label={user?'Open account dashboard':'Sign in'} onClick={account}>{profile?.avatar_url?<img src={profile.avatar_url} alt=""/>:<User size={17}/>}</button>
          {user&&<button className="icon-btn" aria-label="Settings" onClick={()=>navigate('/settings')}><Settings size={16}/></button>}{user&&<button className="icon-btn" aria-label="Billing" onClick={()=>navigate('/billing')}><CreditCard size={16}/></button>}
          <button className="hamburger" aria-label="Toggle menu" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X size={19}/>:<Menu size={19}/>}</button>
        </div>
      </div>
      <div className={`mobile-menu ${open?'open':''}`}>
        {LINKS.map((link)=><NavLink key={link.to+link.label} to={link.to} className="nav-link" onClick={()=>setOpen(false)}>{link.label}</NavLink>)}
        <button className="btn btn-primary btn-post-ad" onClick={()=>{setOpen(false);navigate(user?'/post-property':'/login');}}><Plus size={15}/> Post property</button>
      </div>
    </header>
  );
}

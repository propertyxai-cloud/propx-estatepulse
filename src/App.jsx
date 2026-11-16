import { Navigate,Route,Routes,useNavigate } from 'react-router-dom';
import { lazy, Suspense, useState } from 'react';
import { AuthProvider,useAuth } from './context/AuthContext';
import Nav from './components/Nav';
import Footer from './components/Footer';
const Home = lazy(() => import('./pages/Home'));
const Properties = lazy(() => import('./pages/Properties'));
const PropertyDetail = lazy(() => import('./pages/PropertyDetail'));
const AiSearch = lazy(() => import('./pages/AiSearch'));
const PriceTrends = lazy(() => import('./pages/PriceTrends'));
const MapSearch = lazy(() => import('./pages/MapSearch'));
const Investor = lazy(() => import('./pages/Investor'));
const BrokerRatings = lazy(() => import('./pages/BrokerRatings'));
const Societies = lazy(() => import('./pages/Societies'));
const Login = lazy(() => import('./pages/Login'));
const AgentPortal = lazy(() => import('./pages/AgentPortal'));
const PostProperty = lazy(() => import('./pages/PostProperty'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Settings = lazy(() => import('./pages/Settings'));
const Contact = lazy(() => import('./pages/Contact'));
const ReportProperty = lazy(() => import('./pages/ReportProperty'));
const Billing = lazy(() => import('./pages/Billing'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const NotFound = lazy(() => import('./pages/NotFound'));

function SuspendedAccountNotice(){
  const {profile,signOut}=useAuth();
  const navigate=useNavigate();
  const [error,setError]=useState('');
  const exitToSupport=async()=>{
    setError('');
    try{
      await signOut();
      navigate('/contact',{replace:true});
    }catch(err){
      setError(err.message||'Could not sign out. Please refresh and try again.');
    }
  };
  return (
    <section className="container page-section narrow">
      <div className="dashboard-panel suspension-notice" role="alert">
        <h1>Account access is temporarily suspended</h1>
        <p>Your PropertyX account has been restricted from creating or changing marketplace records while this review is active.</p>
        <p>Public property browsing remains available. To contact support, sign out first and submit the support form as a guest.</p>
        {profile?.suspended_reason&&<p><b>Notice:</b> {profile.suspended_reason}</p>}
        {error&&<div className="form-error" role="alert">{error}</div>}
        <button className="btn btn-primary" type="button" onClick={exitToSupport}>Sign out and contact support</button>
      </div>
    </section>
  );
}

function ProtectedRoute({children}){
  const {user,profile,loading,profileLoading}=useAuth();
  if(loading||(user&&profileLoading))return <div className="container page-status">Restoring your secure session…</div>;
  if(!user)return <Navigate to="/login" replace/>;
  if(profile?.suspended_at)return <SuspendedAccountNotice/>;
  return children;
}

function AppRoutes(){
  return(
    <>
      <Nav/>
      <main>
        <Suspense fallback={<div className='container page-status'>Loading PropertyX page…</div>}>
        <Routes>
          <Route path="/" element={<Home/>}/>
          <Route path="/properties" element={<Properties/>}/>
          <Route path="/property/:id" element={<PropertyDetail/>}/>
          <Route path="/ai-search" element={<AiSearch/>}/>
          <Route path="/price-trends" element={<PriceTrends/>}/>
          <Route path="/map-search" element={<MapSearch/>}/>
          <Route path="/investor" element={<Investor/>}/>
          <Route path="/broker-ratings" element={<BrokerRatings/>}/>
          <Route path="/societies" element={<Societies/>}/>
          <Route path="/login" element={<Login/>}/>
          <Route path="/contact" element={<Contact/>}/>
          <Route path="/agent-portal" element={<ProtectedRoute><AgentPortal/></ProtectedRoute>}/>
          <Route path="/post-property" element={<ProtectedRoute><PostProperty/></ProtectedRoute>}/>
          <Route path="/report-property/:id" element={<ProtectedRoute><ReportProperty/></ProtectedRoute>}/>
          <Route path="/favorites" element={<ProtectedRoute><Favorites/></ProtectedRoute>}/>
          <Route path="/settings" element={<ProtectedRoute><Settings/></ProtectedRoute>}/>
          <Route path="/billing" element={<ProtectedRoute><Billing/></ProtectedRoute>}/>
          <Route path="/privacy" element={<Privacy/>}/>
          <Route path="/terms" element={<Terms/>}/>
          <Route path="/rentals" element={<Navigate to="/properties?type=rent" replace/>}/>
          <Route path="/portfolio" element={<ProtectedRoute><AgentPortal/></ProtectedRoute>}/>
          <Route path="/roi-battle" element={<Navigate to="/investor" replace/>}/>
          <Route path="/heatmap" element={<Navigate to="/map-search" replace/>}/>
          <Route path="/auctions" element={<div className="container page-status"><h1>Auctions are not enabled</h1><p>Only verified auction inventory will appear when an auction workflow is available.</p></div>}/>
          <Route path="/community" element={<div className="container page-status"><h1>Community discussions are not enabled</h1><p>PropertyX will not display fabricated posts or member activity.</p></div>}/>
          <Route path="/about" element={<div className="container page-status"><h1>About PropertyX</h1><p>PropertyX is building a data-led property marketplace for buyers, sellers, investors and agents across countries and cities.</p></div>}/>
          <Route path="*" element={<NotFound/>}/>
        </Routes>
        </Suspense>
      </main>
      <Footer/>
    </>
  );
}

export default function App(){
  return <AuthProvider><AppRoutes/></AuthProvider>;
}

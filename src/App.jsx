import { Navigate,Route,Routes } from 'react-router-dom';
import { AuthProvider,useAuth } from './context/AuthContext';
import Nav from './components/Nav';
import Footer from './components/Footer';
import Home from './pages/Home';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import AiSearch from './pages/AiSearch';
import PriceTrends from './pages/PriceTrends';
import MapSearch from './pages/MapSearch';
import Investor from './pages/Investor';
import BrokerRatings from './pages/BrokerRatings';
import Societies from './pages/Societies';
import Login from './pages/Login';
import AgentPortal from './pages/AgentPortal';
import PostProperty from './pages/PostProperty';
import Favorites from './pages/Favorites';
import Settings from './pages/Settings';
import Contact from './pages/Contact';
import ReportProperty from './pages/ReportProperty';
import NotFound from './pages/NotFound';

function ProtectedRoute({children}){
  const {user,loading}=useAuth();
  if(loading)return <div className="container page-status">Restoring your secure session…</div>;
  return user?children:<Navigate to="/login" replace/>;
}

function AppRoutes(){
  return(
    <>
      <Nav/>
      <main>
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
          <Route path="/rentals" element={<Navigate to="/properties?type=rent" replace/>}/>
          <Route path="/portfolio" element={<ProtectedRoute><AgentPortal/></ProtectedRoute>}/>
          <Route path="/roi-battle" element={<Navigate to="/investor" replace/>}/>
          <Route path="/heatmap" element={<Navigate to="/map-search" replace/>}/>
          <Route path="/auctions" element={<div className="container page-status"><h1>Auctions are not enabled</h1><p>Only verified auction inventory will appear when an auction workflow is available.</p></div>}/>
          <Route path="/community" element={<div className="container page-status"><h1>Community discussions are not enabled</h1><p>PropertyX will not display fabricated posts or member activity.</p></div>}/>
          <Route path="/about" element={<div className="container page-status"><h1>About PropertyX</h1><p>PropertyX is building a data-led property marketplace for buyers, sellers, investors and agents across countries and cities.</p></div>}/>
          <Route path="*" element={<NotFound/>}/>
        </Routes>
      </main>
      <Footer/>
    </>
  );
}

export default function App(){
  return <AuthProvider><AppRoutes/></AuthProvider>;
}

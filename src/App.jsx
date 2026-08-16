import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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
import Stub from './pages/Stub';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/property/:id" element={<PropertyDetail />} />
          <Route path="/ai-search" element={<AiSearch />} />
          <Route path="/price-trends" element={<PriceTrends />} />
          <Route path="/map-search" element={<MapSearch />} />
          <Route path="/investor" element={<Investor />} />
          <Route path="/broker-ratings" element={<BrokerRatings />} />
          <Route path="/societies" element={<Societies />} />
          <Route path="/login" element={<Login />} />
          <Route path="/agent-portal" element={<AgentPortal />} />
          <Route path="/rentals" element={<Stub page="rentals" />} />
          <Route path="/portfolio" element={<Stub page="portfolio" />} />
          <Route path="/roi-battle" element={<Stub page="roi-battle" />} />
          <Route path="/heatmap" element={<Stub page="heatmap" />} />
          <Route path="/auctions" element={<Stub page="auctions" />} />
          <Route path="/community" element={<Stub page="community" />} />
          <Route path="/about" element={<Stub page="about" />} />
          <Route path="/contact" element={<Stub page="contact" />} />
          <Route path="/settings" element={<Stub page="settings" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </AuthProvider>
  );
}

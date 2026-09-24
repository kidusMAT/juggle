import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import JugglerDashboard from './components/JugglerDashboard';
import BuyerMarketplace from './components/BuyerMarketplace';
import ActiveJuggles from './components/ActiveJuggles';
import BrandCollectionPage from './components/BrandCollectionPage';
import Leaderboard from './components/Leaderboard';
import ChatPage from './components/ChatPage';
import DeliveryTrackingPage from './components/DeliveryTrackingPage';

import SellerDashboard from './components/SellerDashboard';
import AccountPage from './components/AccountPage';
import PyramidPage from './components/PyramidPage';
import CartPage from './components/CartPage';
import ProductDetailPage from './components/ProductDetailPage';
import SignupPage from './components/SignupPage';
import AdminDashboard from './components/AdminDashboard';
import { ProtectedRoute, GuestRoute } from './components/RouteGuards';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<BuyerMarketplace />} />
          <Route path="/juggler" element={<ProtectedRoute><JugglerDashboard /></ProtectedRoute>} />
          <Route path="/shop" element={<BuyerMarketplace />} />
          <Route path="/brand/:brandName" element={<BrandCollectionPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/active-juggles" element={<ProtectedRoute><ActiveJuggles /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/track" element={<ProtectedRoute><DeliveryTrackingPage /></ProtectedRoute>} />

          <Route path="/seller" element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/pyramid" element={<ProtectedRoute><PyramidPage /></ProtectedRoute>} />
          <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
          <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

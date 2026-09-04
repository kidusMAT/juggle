import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import JugglerDashboard from './components/JugglerDashboard';
import BuyerMarketplace from './components/BuyerMarketplace';
import ActiveJuggles from './components/ActiveJuggles';

import SellerDashboard from './components/SellerDashboard';
import AccountPage from './components/AccountPage';
import PyramidPage from './components/PyramidPage';
import CartPage from './components/CartPage';
import ProductDetailPage from './components/ProductDetailPage';
import SignupPage from './components/SignupPage';
import AdminDashboard from './components/AdminDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<BuyerMarketplace />} />
        <Route path="/juggler" element={<JugglerDashboard />} />
        <Route path="/shop" element={<BuyerMarketplace />} />
        <Route path="/brand/:brandName" element={<BuyerMarketplace />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/active-juggles" element={<ActiveJuggles />} />

        <Route path="/seller" element={<SellerDashboard />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/pyramid" element={<PyramidPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;

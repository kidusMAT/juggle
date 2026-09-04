import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingCart, Trash2, ArrowRight, ShoppingBag, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';

const API_BASE = 'http://localhost:8000/api';

function CartPage() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [notification, setNotification] = useState({ message: '', visible: false });
  const navigate = useNavigate();

  const fetchCart = async () => {
    try {
      const res = await axios.get(`${API_BASE}/cart/`, { withCredentials: true });
      setCartItems(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching cart", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const removeItem = async (id) => {
    try {
      await axios.delete(`${API_BASE}/cart/${id}/`, { withCredentials: true });
      fetchCart();
    } catch (err) {
      console.error("Error removing item", err);
    }
  };

  const handleUpdateQuantity = async (id, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      await axios.post(`${API_BASE}/cart/${id}/update_quantity/`, { quantity: newQuantity }, { withCredentials: true });
      fetchCart();
    } catch (err) {
      console.error("Error updating quantity", err);
      const errorMsg = err.response?.data?.error || "Update failed";
      setNotification({ message: errorMsg, visible: true });
      setTimeout(() => setNotification({ message: '', visible: false }), 4000);
    }
  };

  const handleCheckout = async () => {
    setCheckingOut(true);
    try {
      const res = await axios.post(`${API_BASE}/cart/checkout/`, {}, { withCredentials: true });
      setNotification({ message: res.data.success, visible: true });
      setCartItems([]);
      setTimeout(() => {
        setNotification({ message: '', visible: false });
        navigate('/shop');
      }, 3000);
    } catch (err) {
      console.error("Checkout failed", err);
    } finally {
      setCheckingOut(false);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((acc, item) => {
      const price = item.offer_details ? item.offer_details.markup_price : item.product_details.base_price;
      return acc + (parseFloat(price) * item.quantity);
    }, 0);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <h2 className="neon-pulse">SYNCING CART...</h2>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'black' }}>
      <Navbar />
      
      <div className="container" style={{ paddingTop: '8rem', maxWidth: '1000px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem' }}>
          <ShoppingCart size={32} />
          <h1 style={{ margin: 0 }}>Your Cart</h1>
        </div>

        {cartItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <ShoppingBag size={64} style={{ opacity: 0.1, marginBottom: '2rem' }} />
            <p className="text-muted" style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Your cart is empty.</p>
            <Link to="/shop">
              <button className="btn-black" style={{ margin: '0 auto' }}>CONTINUE SHOPPING</button>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '3rem' }}>
            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {cartItems.map(item => {
                const isDeal = !!item.offer_details;
                const price = isDeal ? item.offer_details.markup_price : item.product_details.base_price;
                
                return (
                  <div key={item.id} className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', padding: '1.5rem' }}>
                    <div style={{ 
                      width: '100px', height: '100px', 
                      background: item.product_details.image ? `url(http://localhost:8000${item.product_details.image}) center/cover` : '#eee', 
                      borderRadius: '1rem' 
                    }} />
                    
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0 }}>{item.product_details.name}</h3>
                      <p className="text-muted" style={{ margin: '0.25rem 0' }}>{item.product_details.brand}</p>
                      {isDeal && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--neon-purple)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle size={12}/> JUGGLED DEAL APPLIED
                          </span>
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                         <span className="text-muted" style={{ fontSize: '0.8rem' }}>Qty:</span>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f5f5f5', padding: '2px 8px', borderRadius: '4px' }}>
                            <button onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem', minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                            <button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                         </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: '800', fontSize: '1.25rem', margin: 0 }}>ETB {(parseFloat(price) * item.quantity).toFixed(2)}</p>
                      <button 
                        onClick={() => removeItem(item.id)}
                        style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: 'auto', fontSize: '0.8rem' }}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div>
              <div className="card" style={{ position: 'sticky', top: '8rem', padding: '2rem', border: '2px solid black' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Summary</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span className="text-muted">Subtotal</span>
                  <span style={{ fontWeight: '700' }}>ETB {calculateTotal().toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <span className="text-muted">Delivery</span>
                  <span style={{ fontWeight: '700' }}>ETB 0.00</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid #eee', marginBottom: '1.5rem' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <span style={{ fontWeight: '800', fontSize: '1.25rem' }}>Total</span>
                  <span style={{ fontWeight: '800', fontSize: '1.25rem' }}>ETB {calculateTotal().toFixed(2)}</span>
                </div>

                <button 
                  className="btn-checkout" 
                  onClick={handleCheckout}
                  disabled={checkingOut}
                >
                  {checkingOut ? 'PROCESSING...' : 'COMPLETE ORDER'} <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notification */}
      {notification.visible && (
        <div style={{ 
          position: 'fixed', bottom: '2rem', right: '2rem', 
          background: 'black', color: 'white', padding: '1rem 2rem', 
          borderRadius: '1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          zIndex: 10000, display: 'flex', alignItems: 'center', gap: '1rem'
        }}>
          <CheckCircle style={{ color: '#10b981' }} />
          <span>{notification.message}</span>
        </div>
      )}
    </div>
  );
}

export default CartPage;

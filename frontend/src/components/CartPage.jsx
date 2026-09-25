import React, { useState, useEffect } from 'react';
import api, { API_BASE } from '../api';
import { ShoppingCart, Trash2, ArrowRight, ShoppingBag, CheckCircle, ShieldCheck, Truck, LockKeyhole, Plus, Minus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';

function CartPage() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [notification, setNotification] = useState({ message: '', visible: false });
  const navigate = useNavigate();

  const fetchCart = async () => {
    try {
      const res = await api.get('/cart/');
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
      await api.delete(`/cart/${id}/`);
      fetchCart();
    } catch (err) {
      console.error("Error removing item", err);
    }
  };

  const handleUpdateQuantity = async (id, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      await api.post(`/cart/${id}/update_quantity/`, { quantity: newQuantity });
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
      const res = await api.post('/cart/checkout/', {});
      setNotification({ message: res.data.success, visible: true });
      setCartItems([]);
      setTimeout(() => {
        setNotification({ message: '', visible: false });
        navigate('/shop');
      }, 3000);
    } catch (err) {
      console.error("Checkout failed", err);
      const errorMsg = err.response?.data?.error || "Checkout failed. Please try again.";
      setNotification({ message: errorMsg, visible: true });
      setTimeout(() => setNotification({ message: '', visible: false }), 4000);
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

  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const juggleCount = cartItems.filter(item => item.offer_details).length;
  const directCount = cartItems.length - juggleCount;
  const total = calculateTotal();

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <h2 className="neon-pulse">SYNCING CART...</h2>
    </div>
  );

  return (
    <div className="buyer-cart-page" style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'black' }}>
      <Navbar />
      
      <div className="container cart-page-container" style={{ paddingTop: '3rem', maxWidth: '1180px' }}>
        <div className="cart-page-header">
          <div>
            <div className="cart-eyebrow"><i /> Cart workspace</div>
            <h1>Your cart</h1>
            <p>Review your live offers before they move.</p>
          </div>
          <div className="cart-header-actions">
            <div className="cart-header-stat"><strong>{itemCount}</strong><span>units</span></div>
            <div className="cart-header-stat"><strong>{cartItems.length}</strong><span>offers</span></div>
            <Link to="/shop" className="cart-continue-link">Continue shopping <ArrowRight size={15} /></Link>
          </div>
        </div>

        {cartItems.length === 0 ? (
          <div className="cart-empty-state">
            <ShoppingBag size={64} style={{ opacity: 0.1, marginBottom: '2rem' }} />
            <p className="text-muted" style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Your cart is empty.</p>
            <Link to="/shop">
              <button className="btn-black" style={{ margin: '0 auto' }}>CONTINUE SHOPPING</button>
            </Link>
          </div>
        ) : (
          <div>
          <div className="cart-checkout-track">
            <div className="cart-track-step is-active"><span>01</span><strong>Cart</strong></div>
            <div className="cart-track-line" />
            <div className="cart-track-step"><span>02</span><strong>Payment</strong></div>
            <div className="cart-track-line" />
            <div className="cart-track-step"><span>03</span><strong>Dispatch</strong></div>
          </div>

          <div className="cart-order-overview">
            <div><ShoppingCart size={16} /><strong>{itemCount} {itemCount === 1 ? 'unit' : 'units'} ready</strong></div>
            <span>{juggleCount > 0 ? `${juggleCount} live offer${juggleCount === 1 ? '' : 's'} locked` : 'Direct supply selected'}</span>
          </div>

          <div className="buyer-cart-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '3rem' }}>
            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="cart-list-heading"><div><span>Your selection</span><strong>Ready to check out</strong></div><span>{juggleCount > 0 && `${juggleCount} Juggle · `}{directCount > 0 && `${directCount} Direct`}</span></div>
              {cartItems.map(item => {
                const isDeal = !!item.offer_details;
                const price = isDeal ? item.offer_details.markup_price : item.product_details.base_price;
                
                return (
                  <div key={item.id} className="card cart-item-card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', padding: '1.25rem' }}>
                    <div className="cart-item-media" style={{ 
                      width: '100px', height: '100px', 
                      background: item.product_details.image ? `url(${API_BASE.replace('/api', '')}${item.product_details.image}) center/cover` : '#eee', 
                      borderRadius: '1rem' 
                    }}><span>{isDeal ? 'LIVE' : 'DIRECT'}</span></div>
                    
                    <div className="cart-item-main" style={{ flex: 1 }}>
                      <h3 style={{ margin: 0 }}>{item.product_details.name}</h3>
                      <p className="text-muted" style={{ margin: '0.25rem 0' }}>{item.product_details.brand}</p>
                      {isDeal && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#159b6d', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle size={12}/> JUGGLED DEAL APPLIED
                          </span>
                        </div>
                      )}
                      <div className="cart-market-note"><span className="cart-live-dot" /> {isDeal ? 'Juggle offer · price locked in cart' : 'Direct supply · currently available'}</div>
                      
                      <div className="cart-item-meta"><span>{item.product_details.delivery_type || 'Standard delivery'}</span><span>Price locked</span></div>
                      <div className="cart-quantity-control">
                         <span>Quantity</span>
                         <div>
                            <button aria-label="Decrease quantity" onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}><Minus size={13} /></button>
                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem', minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                            <button aria-label="Increase quantity" onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}><Plus size={13} /></button>
                         </div>
                      </div>
                    </div>

                    <div className="cart-item-side" style={{ textAlign: 'right' }}>
                      <span className="cart-item-unit-price">ETB {parseFloat(price).toFixed(2)} / unit</span>
                      <p style={{ fontWeight: '800', fontSize: '1.25rem', margin: '.25rem 0 0' }}>ETB {(parseFloat(price) * item.quantity).toFixed(2)}</p>
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
              <div className="card cart-summary-card" style={{ position: 'sticky', top: '8rem', padding: '1.5rem', border: '2px solid black' }}>
                <div className="cart-summary-top"><div><span className="cart-summary-kicker">Order at a glance</span><h3>Summary</h3></div><span className="cart-live-pill"><i /> Live</span></div>
                <div className="cart-summary-breakdown"><div><span>Offers</span><strong>{cartItems.length}</strong></div><div><span>Units</span><strong>{itemCount}</strong></div><div><span>Supply</span><strong>{juggleCount > 0 && directCount > 0 ? 'Mixed' : juggleCount > 0 ? 'Juggle' : 'Direct'}</strong></div></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span className="text-muted">Subtotal</span>
                  <span style={{ fontWeight: '700' }}>ETB {total.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <span className="text-muted">Delivery</span>
                  <span style={{ fontWeight: '700' }}>ETB 0.00</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid #eee', marginBottom: '1.5rem' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <span style={{ fontWeight: '800', fontSize: '1.25rem' }}>Total</span>
                  <span style={{ fontWeight: '800', fontSize: '1.25rem' }}>ETB {total.toFixed(2)}</span>
                </div>

                <div className="cart-assurance-list"><div><ShieldCheck size={15} /><span>Offers stay locked in your cart</span></div><div><Truck size={15} /><span>Delivery is arranged after payment</span></div><div><LockKeyhole size={15} /><span>Secure checkout through Juggle</span></div></div>

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

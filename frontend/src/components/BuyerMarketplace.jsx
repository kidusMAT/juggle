import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShoppingBag, ChevronRight, ChevronLeft, CheckCircle, XCircle, CreditCard, ShieldCheck } from 'lucide-react';
import Navbar from './Navbar';

const API_BASE = 'http://localhost:8000/api';

const placeholderColors = [
  '#fce7f3', '#ecfdf5', '#e0f2fe', '#1f2937', '#f3f4f6',
];

const Sparks = ({ count = 30 }) => {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 100 }}>
      {[...Array(count)].map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const velocity = 20 + Math.random() * 60;
        const dx = Math.cos(angle) * velocity;
        const dy = Math.sin(angle) * velocity - (20 + Math.random() * 40); // Dust drifts up
        const size = 1 + Math.random() * 3;
        const delay = Math.random() * 1.5;
        return (
          <div
            key={i}
            className="spark-particle"
            style={{
              '--dx': `${dx}px`,
              '--dy': `${dy}px`,
              left: '50%',
              top: '50%',
              width: `${size}px`,
              height: `${size}px`,
              background: i % 3 === 0 ? 'var(--neon-purple)' : (i % 3 === 1 ? '#888' : 'white'),
              opacity: 0.8,
              boxShadow: i % 3 === 0 ? '0 0 5px var(--neon-purple)' : 'none',
              animationDelay: `${delay}s`,
              animationDuration: '2.5s'
            }}
          />
        );
      })}
    </div>
  );
};

const getFreshMockProducts = () => [
  { id: 'm1', name: 'Habesha Kemis — White Gold', brand: 'Selam Designs', description: 'Handwoven Ethiopian traditional dress.', base_price: '4500.00', image_url: '', delivery_type: 'ABET', delivery_fee: '150.00', allow_juggling: true, seller_name: 'Selam', active_offers: [
    { id: 'mo1', juggler_name: 'Abel', markup_price: '5200.00', start_time: new Date().toISOString(), expires_at: new Date(Date.now() + 15000).toISOString(), is_active: true }, // 15s (1ST OFFER)
    { id: 'mo1_next', juggler_name: 'Dawit', markup_price: '5100.00', start_time: new Date().toISOString(), expires_at: new Date(Date.now() + 120000).toISOString(), is_active: true }, // 2m (REPLACEMENT OFFER)
  ]},
  { id: 'm2', name: 'Leather Messenger Bag', brand: 'Sheba Leather', description: 'Genuine highland leather messenger bag.', base_price: '2800.00', image_url: '', delivery_type: 'ABET', delivery_fee: '100.00', allow_juggling: false, seller_name: 'Kebede', active_offers: [] },
  { id: 'm3', name: 'Coffee Gift Box — Yirgacheffe', brand: 'Buna Origins', description: 'Premium single-origin coffee beans.', base_price: '850.00', image_url: '', delivery_type: 'ABET', delivery_fee: '80.00', allow_juggling: true, seller_name: 'Buna Origins', active_offers: [
    { id: 'mo_c1', juggler_name: 'Sara', markup_price: '950.00', start_time: new Date().toISOString(), expires_at: new Date(Date.now() + 40000).toISOString(), is_active: true }, // 40s
  ]},
  { id: 'm6', name: 'Handwoven Scarf', brand: 'Selam Designs', description: 'Limited edition cotton scarf.', base_price: '780.00', image_url: '', delivery_type: 'ABET', delivery_fee: '50.00', allow_juggling: false, seller_name: 'Selam', active_offers: [] },
  { id: 'm7', name: 'Ceramic Incense Burner', brand: 'Addis Crafts', description: 'Hand-painted ceramic etan burner.', base_price: '450.00', image_url: '', delivery_type: 'SELLER', delivery_fee: '40.00', allow_juggling: true, seller_name: 'Addis Crafts', active_offers: [
    { id: 'mo8', juggler_name: 'Yonas', markup_price: '580.00', start_time: new Date().toISOString(), expires_at: new Date(Date.now() + 120000).toISOString(), is_active: true }, // 120s
  ]},
  { id: 'm9', name: 'Shiro Powder', brand: 'Mama\'s Kitchen', description: 'Traditional Ethiopian shiro spice blend.', base_price: '380.00', image_url: '', delivery_type: 'ABET', delivery_fee: '50.00', allow_juggling: true, seller_name: 'Mama\'s Kitchen', active_offers: [
    { id: 'mo9', juggler_name: 'Meron', markup_price: '480.00', start_time: new Date().toISOString(), expires_at: new Date(Date.now() + 60000).toISOString(), is_active: true }, // 60s
  ]},
];

function BuyerMarketplace() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextPage, setNextPage] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(300);
  const [notification, setNotification] = useState({ message: '', type: '', visible: false });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedSize, setSelectedSize] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [juggleOnly, setJuggleOnly] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [expiredProductIds, setExpiredProductIds] = useState(new Set());
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const handleColorToggle = (color) => {
    setSelectedColors(prev => prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const [tick, setTick] = useState(0);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  const fetchProducts = async (url = `${API_BASE}/products/buyer_market/`, isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    try {
      const res = await axios.get(url);
      const { results, next } = res.data;
      
      if (results && results.length > 0) {
        if (isLoadMore) {
          setDeals(prev => [...prev, ...results]);
        } else {
          setDeals(results);
        }
        setNextPage(next);
      } else if (!isLoadMore) {
        setDeals([]);
      }
      setLoading(false);
      setLoadingMore(false);
    } catch (err) {
      console.error("Error fetching marketplace", err);
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const [allCategories, setAllCategories] = useState([]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE}/categories/`);
      setAllCategories(res.data);
    } catch (err) { console.error("Error fetching categories", err); }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchPhaseTime = async () => {
    try {
      const res = await axios.get(`${API_BASE}/users/me/`);
      if (res.data.seconds_until_next_change !== undefined) {
        setPhaseTimeLeft(res.data.seconds_until_next_change);
      }
    } catch (err) { /* silent */ }
  };

  const scrollRef = React.useRef(null);

  useEffect(() => {
    fetchProducts();
    fetchPhaseTime();
    const interval = setInterval(fetchProducts, 5000);
    const phaseInterval = setInterval(fetchPhaseTime, 5000);
    const phaseTimer = setInterval(() => {
      setPhaseTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    const timer = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      setTick(t => t + 1);

      // High-precision expiration check
      setDeals(prevDeals => {
        let itemsToRemove = [];
        const updated = prevDeals.map(deal => {
          if (deal.expires_at) {
            const expiry = new Date(deal.expires_at).getTime();
            if (expiry <= currentTime) {
              if (!expiredProductIds.has(deal.id)) {
                itemsToRemove.push(deal.id);
              }
            }
          }
          return deal;
        });

        if (itemsToRemove.length > 0) {
          setExpiredProductIds(prev => {
            const next = new Set(prev);
            itemsToRemove.forEach(id => next.add(id));
            return next;
          });

          setTimeout(() => {
            setDeals(current => current.filter(d => !itemsToRemove.includes(d.id)));
            setExpiredProductIds(prev => {
              const next = new Set(prev);
              itemsToRemove.forEach(id => next.delete(id));
              return next;
            });
          }, 3500);
        }
        return updated;
      });
    }, 100); 
    return () => {
      clearInterval(interval);
      clearInterval(phaseInterval);
      clearInterval(phaseTimer);
      clearInterval(timer);
    };
  }, []);

  // Infinite Scroll Observer for Site A
  useEffect(() => {
    if (!nextPage || loadingMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchProducts(nextPage, true);
      }
    }, { threshold: 0.1 });
    if (scrollRef.current) observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, [nextPage, loadingMore]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddToCart = async (deal) => {
    try {
      await axios.post('http://localhost:8000/api/cart/add_to_cart/', {
        product_id: deal.product.id,
        offer_id: deal.is_direct ? 'direct' : deal.id,
        quantity: 1
      });
      showNotification(`Added ${deal.product.name} to cart!`, 'success');
    } catch (err) {
      console.error("Cart error", err);
      showNotification(`Failed to add ${deal.product.name} to cart.`, 'error');
    }
  };

  const confirmMockPayment = async () => {
    if (!selectedOffer) return;
    setProcessingPayment(true);
    
    // Simulate network delay for payment processing
    setTimeout(async () => {
      try {
        let endpoint = `${API_BASE}/juggle/${selectedOffer.id}/buy_item/`;
        let payload = { quantity: selectedQuantity };
        
        if (selectedOffer.is_direct) {
          endpoint = `${API_BASE}/products/${selectedOffer.product.id}/buy_direct/`;
          payload = { quantity: selectedQuantity }; 
        }
        
        const res = await axios.post(endpoint, payload);
        showNotification(res.data.success, "success");
        setCheckoutModalOpen(false);
        setSelectedOffer(null);
        setSelectedQuantity(1);
        fetchProducts(); // Refresh
      } catch (err) {
        const errorMsg = err.response?.data?.error || "Purchase failed";
        showNotification(errorMsg, "error");
      } finally {
        setProcessingPayment(false);
      }
    }, 1500);
  };

  const filteredDeals = deals
    .filter(deal => {
      const p = deal.product;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || p.category_name === selectedCategory;
      
      // Price range filter
      const price = parseFloat(deal.markup_price);
      const matchesPrice = price >= priceRange[0] && price <= priceRange[1];
      
      // Juggle only
      const matchesJuggle = !juggleOnly || !deal.is_direct;
      
      return matchesSearch && matchesCategory && matchesPrice && matchesJuggle;
    })
    .sort((a, b) => {
      if (sortOrder === 'price-low') return parseFloat(a.markup_price) - parseFloat(b.markup_price);
      if (sortOrder === 'price-high') return parseFloat(b.markup_price) - parseFloat(a.markup_price);
      return b.id - a.id;
    });

  const categoryNames = ['All', ...new Set(allCategories.map(c => c.parent ? null : c.name).filter(n => n))];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <div className="container" style={{ padding: '2rem 2rem' }}>
      <Navbar 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        categories={categoryNames}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedColors={selectedColors}
        onColorToggle={handleColorToggle}
        selectedSize={selectedSize}
        onSizeChange={setSelectedSize}
        priceRange={priceRange}
        onPriceRangeChange={setPriceRange}
        juggleOnly={juggleOnly}
        onJuggleOnlyToggle={() => setJuggleOnly(!juggleOnly)}
      />

      <div style={{ position: 'relative' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            Buyer's Hub 
            {loading && <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Syncing market...</span>}
          </h1>
          <p className="text-muted">Live Juggled Prototypes</p>
        </header>
      </div>

      <div className="grid-products">
        {filteredDeals.length === 0 ? (
          <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem' }}>
            <p className="text-muted">No items currently being juggled. Check back soon!</p>
          </div>
        ) : (
          filteredDeals.map((deal, idx) => {
            const product = deal.product;
            const bgColor = placeholderColors[idx % placeholderColors.length];
            const isDark = bgColor === '#1f2937';
            const isDirectSale = deal.is_direct;

            let productSecondsLeft = 0;
            if (deal.expires_at) {
              const expiry = new Date(deal.expires_at).getTime();
              productSecondsLeft = Math.max(0, Math.ceil((expiry - now) / 1000));
            } else {
              productSecondsLeft = phaseTimeLeft;
            }
            
            const isDestroying = expiredProductIds.has(deal.id);
            const displaySeconds = Math.min(productSecondsLeft, phaseTimeLeft, 300);

            return (
              <div 
                key={deal.id} 
                className={`product-card-container ${isDestroying ? 'expired' : ''}`}
                style={{ position: 'relative', cursor: 'pointer' }}
                onClick={() => navigate(`/product/${product.id}`)}
              >
                {isDestroying && <Sparks />}
                <div className={`card card-alive ${isDestroying ? 'destructing' : ''}`} style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ 
                    height: '240px', 
                    background: product.image ? `url(http://localhost:8000${product.image}) center/cover` : (product.image_url ? `url(${product.image_url}) center/cover` : bgColor),
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {/* MULTI-IMAGE BADGE */}
                    {product.images && product.images.length > 1 && (
                      <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 8px', borderRadius: '1rem', fontSize: '0.65rem', fontWeight: 'bold', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        1 / {product.images.length} Photos
                      </div>
                    )}

                    {!isDirectSale ? (
                      <div className="badge-timer badge-live" style={{ 
                        position: 'absolute', top: '1rem', left: '1rem', 
                        border: '1px solid rgba(192, 132, 252, 0.4)', 
                        padding: '0.4rem 0.6rem', zIndex: 2, background: 'rgba(0,0,0,0.7)',
                        borderRadius: '0.5rem', backdropFilter: 'blur(4px)'
                      }}>
                        <span style={{ color: '#818cf8', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <span className="live-dot" style={{ background: productSecondsLeft <= 0 ? '#ff0000' : (productSecondsLeft < 60 ? '#ef4444' : '#10b981') }}></span> 
                          {productSecondsLeft <= 0 ? 'DESTROYED' : (productSecondsLeft < 60 ? 'EXPIRING' : 'LIVE JUGGLE')}
                        </span>
                        <span className="timer-neon" style={{ 
                          color: productSecondsLeft <= 0 ? '#ff0000' : (productSecondsLeft < 60 ? '#f87171' : '#c084fc'), 
                          fontWeight: '900', fontSize: '1.1rem', marginLeft: '0.5rem',
                          fontVariantNumeric: 'tabular-nums'
                        }}>{formatTime(displaySeconds)}</span>
                      </div>
                    ) : (
                      <div className="badge-timer" style={{ 
                        position: 'absolute', top: '1rem', left: '1rem', 
                        border: '1px solid rgba(255, 255, 255, 0.15)', 
                        padding: '0.4rem 0.8rem', zIndex: 2, background: 'rgba(0,0,0,0.5)',
                        borderRadius: '0.5rem', backdropFilter: 'blur(4px)'
                      }}>
                        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          Standard Listing
                        </span>
                      </div>
                    )}
                    
                    {!isDirectSale && (
                      <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--neon-purple)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                        {deal.amount} SLOTS
                      </div>
                    )}

                    {(!product.image && !product.image_url) && (
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: isDark ? 0.1 : 0.05 }}>
                        <path d="M12 2L15 8L22 9L17 14L18 21L12 17.5L6 21L7 14L2 9L9 8L12 2Z" />
                      </svg>
                    )}
                  </div>

                  <div 
                    key={deal.id}
                    className={!isDirectSale ? 'new-deal-entry' : ''}
                    style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                      <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{product.name}</h3>
                      <span style={{ fontSize: '0.65rem', color: 'var(--neon-purple)', border: '1px solid var(--neon-purple)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>{product.brand}</span>
                    </div>
                    <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      {isDirectSale ? 
                        <><span style={{ color: 'var(--neon-purple)', fontWeight: 'bold' }}>✦ DIRECT FROM SELLER</span> - {product.seller_name || 'System'}</> :
                        <>Promoted by <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{deal.juggler_name}</span></>
                      }
                    </p>

                    {/* PRODUCT ATTRIBUTES */}
                    {product.attributes && Object.entries(product.attributes).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                        {Object.entries(product.attributes).map(([k, v]) => v && (
                          <span key={k} style={{ fontSize: '0.6rem', background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                            {k}: <strong>{v}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div style={{ marginTop: 'auto', background: 'rgba(0,0,0,0.05)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--neon-green)' }}>
                          ETB {deal.markup_price}
                        </span>
                        {!isDirectSale && (
                          <span style={{ fontSize: '0.7rem', color: '#6366f1', marginLeft: 'auto' }}>
                             {deal.amount > 1 ? `${deal.amount} available` : 'Last slot!'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* VARIANTS DISPLAY */}
                    {product.variants && product.variants.length > 0 && (
                      <div style={{ marginTop: '0.25rem', marginBottom: '0.75rem', display: 'flex', gap: '0.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                        {product.variants.map((v, i) => (
                          <span key={i} style={{ fontSize: '0.6rem', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>{v.name}</span>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button 
                        className="btn-icon" 
                        title="Add to Cart"
                        onClick={(e) => { e.stopPropagation(); handleAddToCart(deal); }}
                        style={{ border: '1px solid #eee' }}
                      >
                        <ShoppingBag size={18} />
                      </button>
                      <button 
                        className="btn-black" 
                        style={{ flex: 1, background: 'var(--neon-green)', color: 'black', fontWeight: 'bold' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOffer(deal);
                          setSelectedQuantity(1);
                          setCheckoutModalOpen(true);
                        }}
                      >
                        BUY NOW
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Notification Toast */}
      {notification.visible && (
        <div style={{ 
          position: 'fixed', bottom: '2rem', right: '2rem', 
          background: notification.type === 'error' ? '#ef4444' : 'black', 
          color: 'white', padding: '1rem 2rem', 
          borderRadius: '1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          zIndex: 10000, display: 'flex', alignItems: 'center', gap: '1rem'
        }}>
          {notification.type === 'error' ? <XCircle size={20} /> : <ShoppingBag style={{ color: 'var(--neon-green)' }} />}
          <span style={{ fontWeight: '600' }}>{notification.message}</span>
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      <div ref={scrollRef} style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loadingMore && <div className="neon-pulse" style={{ color: 'var(--neon-purple)', fontSize: '0.8rem' }}>SYNCING DEEPER MARKETS...</div>}
      </div>

      {/* CHECKOUT MODAL (TEST MODE) WITH QUANTITY */}
      {checkoutModalOpen && selectedOffer && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: '450px', background: '#111', color: '#fff', border: '1px solid rgba(132, 252, 194, 0.3)', padding: '2rem', position: 'relative' }}>
            <button 
              onClick={() => !processingPayment && setCheckoutModalOpen(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              &times;
            </button>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'inline-block', background: 'rgba(132, 252, 194, 0.1)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
                <CreditCard size={32} color="var(--neon-green)" />
              </div>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Checkout <span style={{fontSize: '0.8rem', color: '#888', background: '#222', padding: '2px 6px', borderRadius: '4px'}}>(TEST MODE)</span></h2>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Simulated Chapa Integration</p>
            </div>
            
            <div style={{ background: '#1a1a1a', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>{selectedOffer.product.name}</p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0' }}>
                <span className="text-muted">Quantity:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#333', padding: '0.25rem 0.75rem', borderRadius: '2rem' }}>
                  <button 
                    onClick={() => setSelectedQuantity(q => Math.max(1, q - 1))}
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}
                  >-</button>
                  <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{selectedQuantity}</span>
                  <button 
                    onClick={() => setSelectedQuantity(q => Math.min(selectedOffer.amount, q + 1))}
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}
                  >+</button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                <span className="text-muted">Unit Price:</span>
                <span>ETB {selectedOffer.markup_price}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                <span className="text-muted">Delivery:</span>
                <span>ETB {selectedOffer.product.delivery_fee || 0}</span>
              </div>
              
              <div style={{ borderTop: '1px solid #333', margin: '1rem 0', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span>Total Due:</span>
                <span style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--neon-green)' }}>
                  ETB {(parseFloat(selectedOffer.markup_price) * selectedQuantity + parseFloat(selectedOffer.product.delivery_fee || 0)).toFixed(2)}
                </span>
              </div>
            </div>

            <button 
              className="btn-checkout" 
              onClick={confirmMockPayment}
              disabled={processingPayment}
            >
              {processingPayment ? 'Processing...' : <><ShieldCheck size={20} /> Pay ETB {(parseFloat(selectedOffer.markup_price) * selectedQuantity + parseFloat(selectedOffer.product.delivery_fee || 0)).toFixed(2)}</>}
            </button>
          </div>
        </div>
      )}

      {/* NOTIFICATION */}
      {notification.visible && (
        <div className={`notification-toast ${notification.type}`}>
          {notification.type === 'success' ? <CheckCircle size={20} color="var(--neon-green)" /> : <XCircle size={20} color="#ef4444" />}
          <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{notification.message}</span>
        </div>
      )}

      <style>{`
      @keyframes spark-destruction {
        0% { transform: scale(1); opacity: 1; filter: brightness(1) blur(0) grayscale(0); }
        30% { transform: scale(1.02) rotate(1deg); filter: brightness(1.5) blur(1px) grayscale(0.2); }
        100% { transform: scale(0.9) translateY(20px) rotate(-2deg); opacity: 0; filter: brightness(0.5) blur(15px) grayscale(1); }
      }

      @keyframes new-deal-flash {
        0% { filter: brightness(1) contrast(1); }
        30% { filter: brightness(1.5) contrast(1.2); }
        100% { filter: brightness(1) contrast(1); }
      }

      .new-deal-entry {
        animation: new-deal-flash 1s ease-out;
      }

      .grid-products {
        display: flex;
        flex-wrap: wrap;
        gap: 2rem;
        padding: 2rem 0;
      }

      .product-card-container {
        flex: 0 0 calc(33.333% - 1.34rem);
        width: calc(33.333% - 1.34rem);
        transition: 
          flex-basis 0.6s cubic-bezier(0.16, 1, 0.3, 1),
          width 0.6s cubic-bezier(0.16, 1, 0.3, 1),
          margin 0.6s cubic-bezier(0.16, 1, 0.3, 1),
          opacity 0.8s ease,
          transform 0.8s ease;
        overflow: hidden;
      }

      .product-card-container.expired {
        flex-basis: 0 !important;
        width: 0 !important;
        min-width: 0 !important;
        margin: 0 !important;
        opacity: 0;
        transform: scale(0.85);
        pointer-events: none;
      }

      .destructing {
        animation: spark-destruction 3s ease-in-out forwards;
      }

      .spark-particle {
        position: absolute;
        pointer-events: none;
        z-index: 100;
        animation: spark-fly 2.5s cubic-bezier(0.11, 0, 0.5, 0) forwards;
      }

      @keyframes spark-fly {
        0% { transform: translate(0, 0) scale(1.5); opacity: 1; }
        20% { opacity: 1; }
        100% { transform: translate(var(--dx), var(--dy)) rotate(360deg) scale(0); opacity: 0; }
      }
      `}</style>
      </div>
    </div>
  );
}

export default BuyerMarketplace;

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ShoppingBag, ChevronRight, ChevronLeft, CheckCircle, XCircle, CreditCard, ShieldCheck, Flame, Clock } from 'lucide-react';
import Navbar from './Navbar';

const API_BASE = 'http://localhost:8000/api';

const placeholderColors = [
  '#fce7f3', '#ecfdf5', '#e0f2fe', '#1f2937', '#f3f4f6',
];

const FloatingParticles = ({ count = 15 }) => {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
      {[...Array(count)].map((_, i) => {
        const tx = (Math.random() - 0.5) * 400;
        const ty = (Math.random() - 0.5) * 400;
        const size = 2 + Math.random() * 4;
        const delay = Math.random() * 10;
        const duration = 10 + Math.random() * 20;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${size}px`,
              height: `${size}px`,
              background: i % 2 === 0 ? 'var(--neon-purple)' : 'var(--neon-green)',
              borderRadius: '50%',
              opacity: 0,
              boxShadow: `0 0 10px ${i % 2 === 0 ? 'var(--neon-purple)' : 'var(--neon-green)'}`,
              '--tx': `${tx}px`,
              '--ty': `${ty}px`,
              animation: `float-particle ${duration}s linear ${delay}s infinite`
            }}
          />
        );
      })}
    </div>
  );
};

const Sparks = ({ count = 30 }) => {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 100 }}>
      {[...Array(count)].map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const velocity = 20 + Math.random() * 60;
        const dx = Math.cos(angle) * velocity;
        const dy = Math.sin(angle) * velocity - (20 + Math.random() * 40);
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
  const [allCategories, setAllCategories] = useState([]);
  const [tick, setTick] = useState(0);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [reliveTransition, setReliveTransition] = useState('none'); // 'none', 'exit', 'enter'

  const { brandName } = useParams();
  const [selectedBrand, setSelectedBrand] = useState(brandName || 'All');

  const scrollRef = React.useRef(null);

  const handleColorToggle = (color) => {
    setSelectedColors(prev => prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const fetchProducts = async (url = `${API_BASE}/products/buyer_market/`, isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    try {
      const res = await axios.get(url, { withCredentials: true });
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

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE}/categories/`, { withCredentials: true });
      setAllCategories(res.data);
    } catch (err) { console.error("Error fetching categories", err); }
  };

  const fetchPhaseTime = async () => {
    try {
      const res = await axios.get(`${API_BASE}/users/me/`, { withCredentials: true });
      if (res.data.seconds_until_next_change !== undefined) {
        setPhaseTimeLeft(res.data.seconds_until_next_change);
      }
    } catch (err) { /* silent */ }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
    fetchPhaseTime();
    const interval = setInterval(() => {
      // Only auto-refresh if we are on the first page and not searching
      if (!nextPage || deals.length <= 24) {
        if (!searchTerm && selectedCategory === 'All' && selectedBrand === 'All') {
          fetchProducts();
        }
      }
    }, 5000);
    const phaseInterval = setInterval(fetchPhaseTime, 5000);
    const phaseTimer = setInterval(() => {
      setPhaseTimeLeft(prev => {
        const next = prev > 0 ? prev - 1 : 0;
        // Trigger exit when timer hit 0 or reset jump detected
        if (prev <= 1 && next === 0) {
           setReliveTransition('exit');
           setTimeout(() => {
             setReliveTransition('enter');
             setTimeout(() => setReliveTransition('none'), 600);
           }, 500);
        }
        return next;
      });
    }, 1000);

    const timer = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      setTick(t => t + 1);

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
      }, { withCredentials: true });
      showNotification(`Added ${deal.product.name} to cart!`, 'success');
    } catch (err) {
      console.error("Cart error", err);
      showNotification(`Failed to add ${deal.product.name} to cart.`, 'error');
    }
  };

  const confirmMockPayment = async () => {
    if (!selectedOffer) return;
    setProcessingPayment(true);
    setTimeout(async () => {
      try {
        let endpoint = `${API_BASE}/juggle/${selectedOffer.id}/buy_item/`;
        let payload = { quantity: selectedQuantity };
        
        if (selectedOffer.is_direct) {
          endpoint = `${API_BASE}/products/${selectedOffer.product.id}/buy_direct/`;
          payload = { quantity: selectedQuantity }; 
        }
        
        const res = await axios.post(endpoint, payload, { withCredentials: true });
        showNotification(res.data.success, "success");
        setCheckoutModalOpen(false);
        setSelectedOffer(null);
        setSelectedQuantity(1);
        fetchProducts();
      } catch (err) {
        const errorMsg = err.response?.data?.error || "Purchase failed";
        showNotification(errorMsg, "error");
      } finally {
        setProcessingPayment(false);
      }
    }, 1500);
  };

  useEffect(() => {
    if (brandName) setSelectedBrand(brandName);
  }, [brandName]);

  const filteredDeals = React.useMemo(() => {
    return deals
      .filter(deal => {
        const p = deal.product;
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = selectedCategory === 'All' || p.category_name === selectedCategory;
        const matchesBrand = selectedBrand === 'All' || p.brand.toLowerCase() === selectedBrand.toLowerCase();
        const price = parseFloat(deal.markup_price);
        const matchesPrice = price >= priceRange[0] && price <= priceRange[1];
        const matchesJuggle = !juggleOnly || !deal.is_direct;
        return matchesSearch && matchesCategory && matchesBrand && matchesPrice && matchesJuggle;
      })
      .sort((a, b) => {
        if (sortOrder === 'price-low') return parseFloat(a.markup_price) - parseFloat(b.markup_price);
        if (sortOrder === 'price-high') return parseFloat(b.markup_price) - parseFloat(a.markup_price);
        return b.id - a.id;
      });
  }, [deals, searchTerm, selectedCategory, selectedBrand, priceRange, juggleOnly, sortOrder]);

  const categoryNames = ['All', ...new Set(allCategories.map(c => c.parent ? null : c.name).filter(n => n))];

  // SPLIT DEALS INTO SECTIONS
  const liveJuggles = filteredDeals.filter(d => !d.is_direct);
  const directDeals = filteredDeals.filter(d => d.is_direct);
  
  const urgentJuggles = liveJuggles.filter(d => {
      if (d.expires_at) {
          const expiry = new Date(d.expires_at).getTime();
          const productSecondsLeft = Math.max(0, Math.ceil((expiry - now) / 1000));
          
          // An item is urgent if its OWN timer is < 120s 
          // OR if it's a persistent item and the GLOBAL phase is < 120s
          return productSecondsLeft < 120 || (productSecondsLeft > 10000 && phaseTimeLeft < 120);
      }
      return false;
  });

  const trendingJuggles = liveJuggles.filter(d => !urgentJuggles.includes(d));

  // Determine Hero Deal (Highly urgent OR most expensive)
  let heroDeal = null;
  if (urgentJuggles.length > 0) heroDeal = urgentJuggles[0];
  else if (trendingJuggles.length > 0) heroDeal = trendingJuggles[0];
  else if (directDeals.length > 0) heroDeal = directDeals[0];


  // REUSABLE PRODUCT CARD RENDERER
  const renderProductCard = (deal, idx, isHorizontal = false) => {
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
        className={`product-card-container ${isDestroying ? 'expired' : ''} ${isHorizontal ? 'horizontal-card' : ''} ${reliveTransition === 'exit' ? 'renew-exit' : (reliveTransition === 'enter' ? 'renew-enter' : 'staggered-entrance')}`}
        style={{ 
          position: 'relative', 
          cursor: 'pointer', 
          flex: isHorizontal ? '0 0 300px' : undefined,
          animationDelay: `${(idx % 10) * 0.1}s`
        }}
        onClick={() => navigate(`/product/${product.id}`)}
      >
        {isDestroying && <Sparks />}
        <div className={`card card-alive ${isDestroying ? 'destructing' : ''} ${!isDirectSale && productSecondsLeft < 60 ? 'vibrating' : ( !isDirectSale ? 'juggling' : '')}`} style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', position: 'relative' }}>
          <div style={{ 
            height: isHorizontal ? '200px' : '240px', 
            background: product.image ? `url(http://localhost:8000${product.image}) center/cover` : (product.image_url ? `url(${product.image_url}) center/cover` : bgColor),
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {!isDirectSale ? (
              <div className="badge-timer badge-live" style={{ 
                position: 'absolute', top: '1rem', left: '1rem', 
                border: '1px solid rgba(192, 132, 252, 0.4)', 
                padding: '0.4rem 0.6rem', zIndex: 2, background: 'rgba(0,0,0,0.8)',
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
              <div style={{ 
                position: 'absolute', top: '1rem', left: '1rem', 
                border: '1px solid rgba(0, 0, 0, 0.1)', 
                padding: '0.3rem 0.6rem', zIndex: 2, background: 'rgba(255,255,255,0.9)',
                borderRadius: '0.5rem', backdropFilter: 'blur(4px)'
              }}>
                <span style={{ color: '#333', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Standard
                </span>
              </div>
            )}
            
            {!isDirectSale && (
              <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                {deal.amount} SLOTS LEFT
              </div>
            )}
          </div>

          <div 
            className={!isDirectSale ? 'new-deal-entry' : ''}
            style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: '800', color: '#111', lineHeight: '1.2' }}>{product.name}</h3>
            </div>
            <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
              {product.brand}
            </p>

            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#000' }}>
                  ETB {deal.markup_price}
                </span>
                {isDirectSale && (
                  <span style={{ fontSize: '0.7rem', color: '#888', marginLeft: 'auto' }}>
                    Retail: ETB {product.base_price}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button 
                className="btn-checkout glass-morphism-dark" 
                style={{ flex: 1, color: '#fff', fontWeight: '900', borderRadius: '0.75rem', padding: '0.75rem', border: 'none', transition: 'all 0.3s' }}
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
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', color: '#111' }}>
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

      {/* LIVE JUGGLING FEED TICKER */}
      <div style={{ background: '#000', color: '#fff', padding: '0.5rem 0', overflow: 'hidden', whiteSpace: 'nowrap', position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'inline-block', animation: 'ticker 30s linear infinite' }}>
          {[...Array(10)].map((_, i) => (
            <span key={i} style={{ margin: '0 2rem', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              <span style={{ color: 'var(--neon-green)' }}>● LIVE</span> {deals.find(d => !d.is_direct)?.product.name || 'HYPE DROPS'} JUGGLED BY {deals.find(d => !d.is_direct)?.juggler_name || 'ELITE USERS'} 
              <span style={{ color: 'var(--neon-purple)', margin: '0 1rem' }}> &bull; </span>
              NEW OFFER DETECTED: ETB {deals.find(d => !d.is_direct)?.markup_price || '---'}
            </span>
          ))}
        </div>
        <style>{`
          @keyframes ticker {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </div>

      {/* QUICK CATEGORIES BAR */}
      <div style={{ background: '#fff', borderBottom: '1px solid #eaeaea', padding: '1rem 2rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {categoryNames.map(cat => (
            <button 
              key={cat} 
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: selectedCategory === cat ? '#000' : '#f0f0f0',
                color: selectedCategory === cat ? '#fff' : '#333',
                border: 'none',
                padding: '0.5rem 1.25rem',
                borderRadius: '2rem',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="container" style={{ padding: '2rem' }}>
        
        {/* HERO SECTION */}
        {heroDeal && !searchTerm && selectedCategory === 'All' && (
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ 
              background: '#000', 
              color: '#fff', 
              borderRadius: '2rem', 
              overflow: 'hidden',
              display: 'flex',
              minHeight: '480px',
              cursor: 'pointer',
              boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
              position: 'relative',
              border: '1px solid rgba(255,255,255,0.1)'
            }} onClick={() => navigate(`/product/${heroDeal.product.id}`)}>
              {/* ALIVE EFFECTS */}
              <div className="scanline-overlay" />
              <FloatingParticles count={20} />
              
              <div style={{ flex: 1, padding: '4rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <span className="glass-morphism" style={{ color: '#fff', padding: '0.4rem 1rem', borderRadius: '2rem', fontWeight: '900', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    {heroDeal.is_direct ? 'Featured Drop' : 'Hottest Juggle'}
                  </span>
                  {!heroDeal.is_direct && (
                    <span style={{ background: 'var(--neon-purple)', color: '#000', padding: '0.4rem 1rem', borderRadius: '2rem', fontWeight: '900', fontSize: '0.7rem', textTransform: 'uppercase', boxShadow: '0 0 15px var(--neon-purple)' }}>
                      Volatile
                    </span>
                  )}
                </div>
                
                <h1 style={{ fontSize: '4.5rem', fontWeight: '900', lineHeight: '1', marginBottom: '1.5rem', letterSpacing: '-0.03em' }}>{heroDeal.product.name}</h1>
                <p style={{ fontSize: '1.4rem', color: '#aaa', marginBottom: '2.5rem', fontWeight: '600' }}>{heroDeal.product.brand}</p>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '3rem', marginTop: 'auto' }}>
                  <div>
                    <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 0.5rem 0', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '0.1em' }}>Current Value</p>
                    <p style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, color: 'var(--neon-green)' }}>ETB {heroDeal.markup_price}</p>
                  </div>
                  {!heroDeal.is_direct && heroDeal.expires_at && (
                    <div className="glass-morphism" style={{ padding: '1.25rem 2rem', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                      <p style={{ fontSize: '0.85rem', color: '#ff4444', margin: '0 0 0.5rem 0', textTransform: 'uppercase', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={18} className="timer-neon" /> Destruction In
                      </p>
                      <p style={{ fontSize: '2rem', fontWeight: '900', margin: 0, color: '#ff4444', fontVariantNumeric: 'tabular-nums' }}>
                        {formatTime(Math.max(0, Math.ceil((new Date(heroDeal.expires_at).getTime() - now) / 1000)))}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="hero-glitch" style={{ 
                flex: 1, 
                background: heroDeal.product.image ? `url(http://localhost:8000${heroDeal.product.image}) center/cover` : (heroDeal.product.image_url ? `url(${heroDeal.product.image_url}) center/cover` : '#222'),
                boxShadow: 'inset 50px 0 100px #000'
              }}></div>
            </div>
          </div>
        )}

        {/* URGENT JUGGLES (EXPIRING SOON) */}
        <div style={{ marginBottom: '6rem', position: 'relative' }}>
          <FloatingParticles count={10} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: '#ef4444', padding: '0.75rem', borderRadius: '1rem', boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)' }}>
              <Flame color="#fff" size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '2.2rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#000' }}>High Volatility</h2>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#ef4444', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Destruction imminent &bull; Under 2 mins</p>
            </div>
          </div>
          {urgentJuggles.length > 0 ? (
            <div className="horizontal-scroller">
              {urgentJuggles.map((deal, idx) => renderProductCard(deal, idx, true))}
            </div>
          ) : (
            <div style={{ background: '#e5e5e5', padding: '3rem', borderRadius: '0.5rem', textAlign: 'center', border: '2px dashed #ccc' }}>
              <p style={{ fontWeight: 'bold', color: '#888', margin: 0 }}>No highly volatile items dropping right now. Stay tuned.</p>
            </div>
          )}
        </div>

        {/* TRENDING JUGGLES */}
        <div style={{ marginBottom: '6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: '#000', padding: '0.75rem', borderRadius: '1rem' }}>
              <Clock color="#fff" size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '2.2rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Trending Juggles</h2>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#888', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{trendingJuggles.length} active sessions globally</p>
            </div>
          </div>
          {trendingJuggles.length > 0 ? (
            <div className="horizontal-scroller">
              {trendingJuggles.map((deal, idx) => renderProductCard(deal, idx, true))}
            </div>
          ) : (
            <div style={{ background: '#e5e5e5', padding: '3rem', borderRadius: '0.5rem', textAlign: 'center', border: '2px dashed #ccc' }}>
              <p style={{ fontWeight: 'bold', color: '#888', margin: 0 }}>The market is calm. Wait for Juggles to appear.</p>
            </div>
          )}
        </div>

        {/* FEATURED BRANDS SECTION */}
        {directDeals.length > 0 && !searchTerm && (
        <div style={{ 
          marginBottom: '6rem', 
          background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.1), rgba(52, 211, 153, 0.1))', 
          padding: '3rem', 
          borderRadius: '2.5rem',
          border: '1px solid rgba(255,255,255,0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div className="scanline-overlay" style={{ opacity: 0.1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem', position: 'relative', zIndex: 2 }}>
            <div style={{ background: '#000', padding: '0.75rem', borderRadius: '1rem', boxShadow: '0 0 20px rgba(0,0,0,0.2)' }}>
              <ShoppingBag color="#fff" size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '2.2rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Global Brands</h2>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#666', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Explore curated collections by brand</p>
            </div>
          </div>
          <div className="horizontal-scroller" style={{ position: 'relative', zIndex: 2 }}>
            {/* Group by brand and show one representative product per brand */}
            {Array.from(new Set(directDeals.map(d => d.product.brand))).map((brand, bIdx) => {
              const representativeDeal = directDeals.find(d => d.product.brand === brand);
              return (
                <div 
                  key={brand}
                  className="product-card-container horizontal-card"
                  style={{ flex: '0 0 300px', cursor: 'pointer' }}
                  onClick={() => navigate(`/brand/${brand.toLowerCase()}`)}
                >
                  <div className="card card-alive" style={{ padding: '0', overflow: 'hidden', height: '100%', background: '#fff' }}>
                    <div style={{ 
                      height: '200px', 
                      background: representativeDeal.product.image ? `url(http://localhost:8000${representativeDeal.product.image}) center/cover` : (representativeDeal.product.image_url ? `url(${representativeDeal.product.image_url}) center/cover` : '#eee'),
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div className="glass-morphism" style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', color: '#fff', fontWeight: '900', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {brand}
                      </div>
                    </div>
                    <div style={{ padding: '1.25rem', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '800', color: '#888', textTransform: 'uppercase' }}>Shop All</p>
                      <h3 style={{ margin: '0.25rem 0', fontSize: '1.2rem', fontWeight: '900' }}>{brand}</h3>
                      <button className="btn-checkout" style={{ padding: '0.5rem', marginTop: '1rem', fontSize: '0.8rem' }}>VIEW COLLECTION</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* DIRECT DEALS (STANDARD GRID) */}
        <div style={{ marginBottom: '4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', textTransform: 'uppercase' }}>Retail & Direct Supply</h2>
          </div>
          {directDeals.length > 0 ? (
            <div className="grid-products">
              {directDeals.map((deal, idx) => renderProductCard(deal, idx, false))}
            </div>
          ) : (
            <div style={{ background: '#e5e5e5', padding: '3rem', borderRadius: '0.5rem', textAlign: 'center', border: '2px dashed #ccc' }}>
              <p style={{ fontWeight: 'bold', color: '#888', margin: 0 }}>No standard supply available.</p>
            </div>
          )}
        </div>
        
        {filteredDeals.length === 0 && !loading && (
          <div className="card" style={{ textAlign: 'center', padding: '6rem 2rem', background: '#fff' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: '900', color: '#888' }}>No items match your criteria.</p>
          </div>
        )}
      </div>

      {/* Infinite Scroll Sentinel */}
      <div ref={scrollRef} style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loadingMore && <div className="neon-pulse" style={{ color: '#000', fontSize: '0.8rem', fontWeight: 'bold' }}>LOADING MORE...</div>}
      </div>

      {/* CHECKOUT MODAL (TEST MODE) WITH QUANTITY */}
      {checkoutModalOpen && selectedOffer && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: '450px', background: '#fff', color: '#000', padding: '2rem', position: 'relative' }}>
            <button 
              onClick={() => !processingPayment && setCheckoutModalOpen(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#000', cursor: 'pointer', fontSize: '1.5rem' }}
            >
              &times;
            </button>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'inline-block', background: '#f5f5f5', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
                <CreditCard size={32} color="#000" />
              </div>
              <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: '900' }}>Checkout <span style={{fontSize: '0.8rem', color: '#fff', background: '#000', padding: '2px 6px', borderRadius: '4px'}}>(TEST)</span></h2>
            </div>
            
            <div style={{ background: '#f9f9f9', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid #eaeaea' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>{selectedOffer.product.name}</p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5rem 0' }}>
                <span className="text-muted" style={{ fontWeight: 'bold' }}>Quantity:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#fff', border: '1px solid #ddd', padding: '0.25rem 0.75rem', borderRadius: '2rem' }}>
                  <button 
                    onClick={() => setSelectedQuantity(q => Math.max(1, q - 1))}
                    style={{ background: 'none', border: 'none', color: '#000', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}
                  >-</button>
                  <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{selectedQuantity}</span>
                  <button 
                    onClick={() => setSelectedQuantity(q => Math.min(selectedOffer.amount || 1, q + 1))}
                    style={{ background: 'none', border: 'none', color: '#000', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}
                  >+</button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                <span className="text-muted">Unit Price:</span>
                <span>ETB {selectedOffer.markup_price}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                <span className="text-muted">Delivery:</span>
                <span>ETB {selectedOffer.product.delivery_fee || 0}</span>
              </div>
              
              <div style={{ borderTop: '2px solid #000', margin: '1rem 0', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: '900' }}>Total Due:</span>
                <span style={{ fontSize: '1.75rem', fontWeight: '900', color: '#000' }}>
                  ETB {(parseFloat(selectedOffer.markup_price) * selectedQuantity + parseFloat(selectedOffer.product.delivery_fee || 0)).toFixed(2)}
                </span>
              </div>
            </div>

            <button 
              className="btn-checkout" 
              onClick={confirmMockPayment}
              disabled={processingPayment}
              style={{ width: '100%', background: '#000', color: '#fff', padding: '1rem', fontWeight: '900', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            >
              {processingPayment ? 'Processing...' : <><ShieldCheck size={20} /> AUTHORIZE PAYMENT</>}
            </button>
          </div>
        </div>
      )}

      {/* NOTIFICATION */}
      {notification.visible && (
        <div className={`notification-toast ${notification.type}`} style={{ background: notification.type === 'success' ? '#000' : '#ef4444', color: '#fff' }}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
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
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 2rem;
      }

      .horizontal-scroller {
        display: flex;
        overflow-x: auto;
        gap: 1.5rem;
        padding-bottom: 1rem;
        scroll-snap-type: x mandatory;
      }
      
      .horizontal-scroller::-webkit-scrollbar {
        height: 8px;
        background: #eaeaea;
        border-radius: 4px;
      }
      
      .horizontal-scroller::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 4px;
      }

      .horizontal-card {
        scroll-snap-align: start;
      }

      .product-card-container {
        transition: opacity 0.8s ease, transform 0.8s ease;
        overflow: hidden;
      }

      .product-card-container.expired {
        opacity: 0;
        transform: scale(0.85);
        pointer-events: none;
        width: 0 !important;
        margin: 0 !important;
        flex: 0 0 0 !important;
      }

      .card {
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        border: 1px solid #eaeaea;
        border-radius: 0.5rem;
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
  );
}

export default BuyerMarketplace;

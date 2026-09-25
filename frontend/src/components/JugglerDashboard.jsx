import React, { useState, useEffect } from 'react';
import api, { API_BASE } from '../api';
import { ShoppingBag, ShieldCheck, Zap, Info, Bookmark, Layers, Activity, Crown, Search, CheckCircle, XCircle } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import HubSidebar from './HubSidebar';
import { useAuth } from '../AuthContext';

const MOCK_PRODUCTS = [
  { id: 1, name: "Vintage Leather Satchel", brand: "Sheba Leather", description: "Handcrafted Ethiopian leather satchel with brass fittings. Each piece tells a story.", base_price: "2500.00", category: 1, category_name: "Accessories", image_url: "", status: "AVAILABLE", stock: 5, remaining_slots: 5, allow_juggling: true, is_limited: true, delivery_type: "ABET", delivery_fee: "100.00", attributes: { Material: "Full-grain Leather", Color: "Cognac" } },
  { id: 2, name: "Yirgacheffe Coffee Beans 1kg", brand: "Ethiopia Origin", description: "Single-origin specialty coffee from Yirgacheffe. Floral notes, bright acidity.", base_price: "850.00", category: 2, category_name: "Food & Beverage", image_url: "", status: "AVAILABLE", stock: 20, remaining_slots: 20, allow_juggling: true, is_limited: false, delivery_type: "ABET", delivery_fee: "50.00", attributes: { Roast: "Light", Process: "Washed" } },
  { id: 3, name: "Handwoven Cotton Scarf", brand: "Sabahar", description: "Traditional Ethiopian handwoven scarf. 100% cotton, natural dyes.", base_price: "450.00", category: 3, category_name: "Clothing", image_url: "", status: "AVAILABLE", stock: 15, remaining_slots: 15, allow_juggling: true, is_limited: false, delivery_type: "ABET", delivery_fee: "50.00", attributes: { Material: "Cotton", Size: "180x45cm" } },
  { id: 4, name: "Berbere Spice Blend Set", brand: "Mama's Kitchen", description: "Authentic Ethiopian spice blend set - Berbere, Mitmita, Korarima.", base_price: "320.00", category: 2, category_name: "Food & Beverage", image_url: "", status: "AVAILABLE", stock: 30, remaining_slots: 30, allow_juggling: true, is_limited: false, delivery_type: "ABET", delivery_fee: "50.00", attributes: { Contains: "3 x 100g jars", Heat: "Medium-Hot" } },
  { id: 5, name: "Cross Coptic Necklace", brand: "Lalibela Crafts", description: "Sterling silver Ethiopian cross pendant. Hand-finished in Addis Ababa.", base_price: "1800.00", category: 1, category_name: "Accessories", image_url: "", status: "AVAILABLE", stock: 8, remaining_slots: 8, allow_juggling: true, is_limited: true, delivery_type: "ABET", delivery_fee: "100.00", attributes: { Material: "Sterling Silver", Chain: "Included" } },
  { id: 6, name: "Tej Honey Wine 750ml", brand: "Axum Meadery", description: "Traditional Ethiopian honey wine. Sweet, floral, naturally fermented.", base_price: "650.00", category: 2, category_name: "Food & Beverage", image_url: "", status: "AVAILABLE", stock: 12, remaining_slots: 12, allow_juggling: true, is_limited: false, delivery_type: "ABET", delivery_fee: "80.00", attributes: { ABV: "12%", Style: "Traditional" } },
];

function JugglerDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [showRelive, setShowRelive] = useState(false);
  const [flippedCardId, setFlippedCardId] = useState(null);
  const [markupPrices, setMarkupPrices] = useState({});
  const [slotCounts, setSlotCounts] = useState({});
  const [nextPage, setNextPage] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchedUrls, setFetchedUrls] = useState(new Set());
  const scrollRef = React.useRef(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState([]);
  const [affordableOnly, setAffordableOnly] = useState(false);
  const [watchlistIds, setWatchlistIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('juggle-watchlist') || '[]'); } catch { return []; }
  });
  const watchlistOnly = searchParams.get('view') === 'watchlist';
  const [notification, setNotification] = useState({ message: '', type: '', visible: false });
  const [reliveTransition, setReliveTransition] = useState('none');

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const toggleWatchlist = (productId) => {
    setWatchlistIds(prev => {
      const next = prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId];
      localStorage.setItem('juggle-watchlist', JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('juggle-watchlist-updated'));
      return next;
    });
  };

  const placeholderColors = [
    '#fce7f3', // pink
    '#ecfdf5', // green
    '#e0f2fe', // blue
    '#1f2937', // dark gray
    '#f3f4f6', // light gray
  ];

  const fetchUserStatus = React.useCallback(async () => {
    try {
      const userData = await refreshUser();
      if (userData?.seconds_until_next_change !== undefined) {
        const newTime = userData.seconds_until_next_change;
        // Logic for "RELIVE" effect
        if (timeLeft <= 2 && newTime > 10) {
          setShowRelive(true);
          setTimeout(() => setShowRelive(false), 2500);
        }
        setTimeLeft(newTime);
      }
    } catch (err) {
      console.error("Error fetching user status", err);
      if (err.response?.status === 401 || err.response?.data?.error === "Not authenticated") {
        navigate('/account');
      }
    }
  }, [navigate, refreshUser, timeLeft]);

  const fetchProductsData = React.useCallback(async (url = '/products/prototype_feed/', isLoadMore = false) => {
    if (isLoadMore) {
      if (loadingMore || fetchedUrls.has(url)) return;
      setLoadingMore(true);
      setFetchedUrls(prev => new Set(prev).add(url));
    }
    try {
      const prodRes = await api.get(url);
      const { results, next } = prodRes.data;
      if (results) {
        if (isLoadMore) {
          setProducts(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newResults = results.filter(p => !existingIds.has(p.id));
            return [...prev, ...newResults];
          });
        } else {
          setProducts(results.length > 0 ? results : MOCK_PRODUCTS);
          setFetchedUrls(new Set(['/products/prototype_feed/']));
        }
        setNextPage(next);
      } else {
        setProducts(prodRes.data.length > 0 ? prodRes.data : MOCK_PRODUCTS);
        setNextPage(null);
      }
    } catch (err) {
      console.error("Error fetching products, using mock data", err);
      if (!isLoadMore) setProducts(MOCK_PRODUCTS);
    } finally {
      if (isLoadMore) setLoadingMore(false);
    }
  }, [loadingMore, fetchedUrls]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories/');
        const cats = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        setCategories(cats);
      } catch (err) {
        console.error("Error fetching categories", err);
      }
    };
    fetchCategories();
  }, []);

  // Initial Data Fetch - parallel
  useEffect(() => {
    Promise.all([fetchUserStatus(), fetchProductsData()]);
  }, []); // Only once!

  // Polling Intervals
  useEffect(() => {
    const statusInterval = setInterval(fetchUserStatus, 1000);
    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = (prev > 0 ? prev - 1 : 0);
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

    return () => {
      clearInterval(statusInterval);
      clearInterval(timerInterval);
    };
  }, [fetchUserStatus]);

  // Infinite Scroll Observer
  useEffect(() => {
    if (!nextPage || loadingMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingMore && nextPage) {
        fetchProductsData(nextPage, true);
      }
    }, { threshold: 0.1, rootMargin: '200px' });

    const currentSentinel = scrollRef.current;
    if (currentSentinel) observer.observe(currentSentinel);

    return () => {
      if (currentSentinel) observer.unobserve(currentSentinel);
    };
  }, [nextPage, loadingMore, fetchProductsData]);

  const formatTime = (seconds) => {
    if (seconds <= 0) return '00:00';
    const days = Math.floor(seconds / 86400);
    const hrs = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (days > 0) return `${days}d ${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    if (hrs > 0) return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleJuggle = async (productId) => {
    const markup = markupPrices[productId];
    const slots = slotCounts[productId] || 1;
    if (!markup) return showNotification("Please enter a markup price", "error");

    try {
      await api.post('/juggle/start_juggle/', {
        product_id: productId,
        markup_price: parseFloat(markup),
        slots: parseInt(slots)
      });
      showNotification(`Successfully juggled ${slots} slot(s)!`, "success");
      // Clear inputs for this product
      setMarkupPrices(prev => ({ ...prev, [productId]: '' }));
      setSlotCounts(prev => ({ ...prev, [productId]: 1 }));
      setFlippedCardId(null); // Flip card back
      // Let the 1s polling handle the product refresh/removal if slots are full
    } catch (err) {
      showNotification(err.response?.data?.error || "Error juggling item", "error");
    }
  };

  // Skeleton card for product grid
  const SkeletonCard = () => (
    <div className="card-flip-container" style={{ perspective: '1000px', height: '480px' }}>
      <div className="card-inner" style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%' }}>
        <div className="card-front card" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', padding: '0', background: 'var(--hub-surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
          <div style={{ height: '240px', background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', position: 'relative' }} />
          <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '1.5rem', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', marginBottom: '0.75rem', animation: 'shimmer 1.5s infinite' }} />
            <div style={{ height: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '0.5rem', animation: 'shimmer 1.5s infinite' }} />
            <div style={{ height: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', width: '60%', animation: 'shimmer 1.5s infinite' }} />
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ height: '1.5rem', width: '80px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', animation: 'shimmer 1.5s infinite' }} />
              <div style={{ height: '1rem', width: '60px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', animation: 'shimmer 1.5s infinite' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <div style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', animation: 'shimmer 1.5s infinite' }} />
              <div style={{ flex: 1, height: '44px', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', animation: 'shimmer 1.5s infinite' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="juggler-hub" style={{ display: 'flex', padding: 0 }}>
        <HubSidebar />
        <div style={{ marginLeft: '220px', flex: 1, padding: '2rem' }}>
          <div className="hub-container">
            {/* Dashboard Stats Skeletons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
              {[1,2,3].map(i => (
                <div key={i} className="hub-card" style={{ padding: '1.5rem', animation: 'shimmer 1.5s infinite', background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)', backgroundSize: '200% 100%' }}>
                  <div style={{ height: '1rem', width: '40%', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', marginBottom: '1rem' }} />
                  <div style={{ height: '3rem', width: '60%', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', marginBottom: '0.5rem' }} />
                  <div style={{ height: '0.8rem', width: '30%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
                </div>
              ))}
            </div>

            {/* Filter Bar Skeleton */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.4)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}>
              <div style={{ flex: 1, minWidth: '200px', height: '40px', background: 'rgba(255,255,255,0.04)', borderRadius: '0.6rem', animation: 'shimmer 1.5s infinite' }} />
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1,2,3,4].map(i => <div key={i} style={{ padding: '5px 12px', borderRadius: '2rem', background: 'rgba(255,255,255,0.04)', animation: 'shimmer 1.5s infinite' }} />)}
              </div>
              <div style={{ width: '120px', height: '36px', background: 'rgba(255,255,255,0.04)', borderRadius: '2rem', animation: 'shimmer 1.5s infinite' }} />
              <div style={{ width: '140px', height: '36px', background: 'rgba(255,255,255,0.04)', borderRadius: '2rem', animation: 'shimmer 1.5s infinite' }} />
              <div style={{ width: '120px', height: '36px', background: 'rgba(255,255,255,0.04)', borderRadius: '2rem', animation: 'shimmer 1.5s infinite' }} />
            </div>

            {/* Product Grid with Skeletons */}
            <div className="grid-products" style={{ paddingBottom: '4rem' }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={`skeleton-${i}`} />)}
            </div>

            {/* Infinite Scroll Sentinel */}
            <div ref={scrollRef} style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div className="neon-pulse" style={{ color: 'var(--neon-blue)', fontSize: '0.8rem', fontWeight: 'bold' }}>SCANNING DEEPER CUBES...</div>
            </div>
          </div>
        </div>
      </div>
);
  }

  const pyr = user.pyramid_data || {};

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPrice =
      priceFilter === 'all' ||
      (priceFilter === 'low' && p.base_price < 1000) ||
      (priceFilter === 'mid' && p.base_price >= 1000 && p.base_price <= 5000) ||
      (priceFilter === 'high' && p.base_price > 5000);

    const matchesBrand = brandFilter === 'all' || p.brand === brandFilter;
    const matchesCategory = categoryFilter === 'all' || String(p.category) === String(categoryFilter);
    const matchesAffordability = !affordableOnly || user.current_cb >= p.base_price;
    const matchesWatchlist = !watchlistOnly || watchlistIds.includes(p.id);

    return matchesSearch && matchesPrice && matchesBrand && matchesCategory && matchesAffordability && matchesWatchlist;
  });

  // Market rows (with skeleton fallback)
  const productCards = products.length > 0
    ? filteredProducts.map((product, idx) => {
        const canJuggle = user.current_cb >= product.base_price;
        const isFlipped = flippedCardId === product.id;
        const isWatched = watchlistIds.includes(product.id);
        const slotsTaken = Math.max(0, (product.stock || product.remaining_slots || 0) - (product.remaining_slots || 0));
        const fillRate = product.stock ? Math.round((slotsTaken / product.stock) * 100) : 0;

        return (
          <React.Fragment key={product.id}>
            <div className={`market-row ${isFlipped ? 'market-row-open' : ''} ${reliveTransition === 'exit' ? 'renew-exit' : (reliveTransition === 'enter' ? 'renew-enter' : '')}`}>
              <div className="market-asset"><button className={`market-watch ${isWatched ? 'market-watch-active' : ''}`} onClick={() => toggleWatchlist(product.id)} aria-label={`${isWatched ? 'Remove' : 'Add'} ${product.name} ${isWatched ? 'from' : 'to'} watchlist`}><Bookmark size={14} fill={isWatched ? 'currentColor' : 'none'} /></button><span className="asset-mark">{product.name.slice(0, 1)}</span><div><strong>{product.name}</strong><small>{product.brand || product.category_name || 'Market asset'}</small></div></div>
              <div className="market-stat"><span>Base price</span><strong>{Number(product.base_price).toLocaleString()} ETB</strong><small>Same-item avg —</small></div>
              <div className="market-stat"><span>Fill rate</span><strong>{fillRate}%</strong><div className="row-progress"><i style={{ width: `${fillRate}%` }} /></div></div>
              <div className="market-stat"><span>Slots</span><strong>{product.remaining_slots ?? 0}<small> / {product.stock ?? '—'}</small></strong><small>{product.remaining_slots > 0 ? 'Available' : 'Full'}</small></div>
              <div className="market-status"><span className={canJuggle && product.remaining_slots > 0 ? 'status-live' : 'status-muted'}><i /> {product.remaining_slots <= 0 ? 'Full' : canJuggle ? 'Ready' : 'Low power'}</span><button className="market-action" onClick={() => setFlippedCardId(isFlipped ? null : product.id)} disabled={!canJuggle || product.remaining_slots <= 0}>{isFlipped ? 'Close' : 'Set price'}</button></div>
            </div>
            {isFlipped && <div className="market-order-panel">
              <div><span className="hub-label">Open position</span><h3>{product.name}</h3><p>Set a listing price above the base price and reserve your slots.</p></div>
              <label>Listing price<input type="number" value={markupPrices[product.id] || ''} onChange={(e) => setMarkupPrices(prev => ({ ...prev, [product.id]: e.target.value }))} placeholder={`Above ${product.base_price} ETB`} /></label>
              <label>Slots<select value={slotCounts[product.id] || 1} onChange={(e) => setSlotCounts(prev => ({ ...prev, [product.id]: Math.min(product.remaining_slots, Math.max(1, parseInt(e.target.value) || 1)) }))}>{Array.from({ length: Math.min(product.remaining_slots || 1, 10) }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} slot{i ? 's' : ''}</option>)}</select></label>
              <div className="order-power"><span>Power required</span><strong>{((parseFloat(product.base_price)) * (slotCounts[product.id] || 1)).toFixed(0)} ETB</strong><button className="market-action market-action-primary" onClick={() => handleJuggle(product.id)} disabled={!markupPrices[product.id] || Number(markupPrices[product.id]) <= Number(product.base_price)}>Confirm listing</button></div>
            </div>}
          </React.Fragment>
        );
      })
    : Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={`skeleton-${i}`} />);

  const visiblePrices = filteredProducts.map(product => Number(product.base_price) || 0).filter(Boolean);
  const feedAveragePrice = visiblePrices.length
    ? visiblePrices.reduce((sum, price) => sum + price, 0) / visiblePrices.length
    : 0;
  const affordableCount = filteredProducts.filter(product => user.current_cb >= product.base_price).length;
  const nextTierTarget = user.pyramid_tier === 100 ? 5 : 10;
  const tierProgress = Math.min(100, (user.deals_completed / nextTierTarget) * 100);
  const marketSeries = visiblePrices.slice(0, 7);
  const seriesMin = marketSeries.length ? Math.min(...marketSeries) : 0;
  const seriesMax = marketSeries.length ? Math.max(...marketSeries) : 1;
  const chartPoints = marketSeries.map((price, index) => {
    const x = marketSeries.length === 1 ? 8 : (index / (marketSeries.length - 1)) * 84 + 8;
    const y = 76 - ((price - seriesMin) / Math.max(1, seriesMax - seriesMin)) * 48;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="juggler-hub" style={{ display: 'flex', padding: 0 }}>
      <HubSidebar />
      <div className="hub-main" style={{ marginLeft: '220px', flex: 1, padding: '2rem' }}>
        <div className="hub-container">
          <section className="hub-market-header">
            <div>
              <div className="hub-eyebrow"><span className="live-dot" /> JUGGLE MARKET · LIVE</div>
              <h1>Keep the market moving.</h1>
              <p>Set your price, reserve your slots, and watch every cycle change the opportunity.</p>
            </div>
            <div className="hub-cycle"><span>Next cycle</span><strong>{formatTime(timeLeft)}</strong><small>Power refreshes automatically</small></div>
          </section>

          <section className="hub-kpi-grid" aria-label="Market overview">
            <div className="hub-kpi hub-kpi-accent"><span>Available power</span><strong>{Math.floor(user.current_cb).toLocaleString()} <small>ETB</small></strong><em><Zap size={13} /> {pyr.pulse_active ? 'Active pulse' : 'Idle power'}</em></div>
            <div className="hub-kpi"><span>Protected balance</span><strong>{Number(user.actual_balance || 0).toLocaleString()} <small>ETB</small></strong><em><ShieldCheck size={13} /> Safe balance</em></div>
            <div className="hub-kpi"><span>Current tier</span><strong>{user.pyramid_tier}<small> tier</small></strong><em>{user.deals_completed} completed deals</em></div>
            <div className="hub-kpi"><span>Market opportunities</span><strong>{affordableCount}<small> ready</small></strong><em>{filteredProducts.length} products in feed</em></div>
          </section>

          <section className="hub-market-grid">
            <div className="hub-chart-card">
              <div className="hub-card-heading"><div><span className="hub-label">Market pulse</span><h2>Feed price curve</h2></div><span className="hub-live-chip"><i /> Live feed</span></div>
              <div className="hub-chart-meta"><div><strong>{feedAveragePrice ? `${Math.round(feedAveragePrice).toLocaleString()} ETB` : '—'}</strong><span>Average base price</span></div><div><strong>{filteredProducts.length}</strong><span>Tracked items</span></div><div><strong>{pyr.phase ? `#${pyr.phase + 1}` : '—'}</strong><span>Market cycle</span></div></div>
              <div className="hub-chart-wrap">
                {marketSeries.length > 1 ? <svg viewBox="0 0 100 90" role="img" aria-label="Current feed price curve" preserveAspectRatio="none"><defs><linearGradient id="hubArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#72f6c1" stopOpacity=".3" /><stop offset="100%" stopColor="#72f6c1" stopOpacity="0" /></linearGradient></defs><path className="hub-chart-area" d={`M ${chartPoints} L 92,86 L 8,86 Z`} /><polyline className="hub-chart-line" points={chartPoints} /><line className="hub-chart-baseline" x1="8" y1="76" x2="92" y2="76" /></svg> : <div className="hub-chart-empty">Feed data will draw here as products enter the market.</div>}
                <div className="hub-chart-axis"><span>Low</span><span>Current feed</span><span>High</span></div>
              </div>
              <p className="hub-chart-note">This is the current product feed range. Same-item average pricing appears once multiple jugglers list the item.</p>
            </div>
            <div className="hub-signal-card">
              <div className="hub-card-heading"><div><span className="hub-label">Your position</span><h2>Juggler signals</h2></div><Activity size={18} color="var(--hub-accent)" /></div>
              <div className="hub-signal-row"><span>Cycle state</span><strong className="signal-positive">{pyr.pulse_active ? 'Active' : 'Quiet'}</strong></div>
              <div className="hub-signal-row"><span>Power rank</span><strong>Base {pyr.user_rank || '—'}</strong></div>
              <div className="hub-signal-row"><span>Next tier</span><strong>{user.pyramid_tier < 1000 ? `${nextTierTarget} deals` : 'Max tier'}</strong></div>
              <div className="hub-progress"><div><span>Tier progress</span><strong>{Math.round(tierProgress)}%</strong></div><div className="hub-progress-track"><i style={{ width: `${tierProgress}%` }} /></div></div>
              <div className="hub-signal-foot"><Crown size={15} /> {user.pyramid_tier < 1000 ? `${Math.max(0, nextTierTarget - user.deals_completed)} deals to unlock` : 'Maximum tier unlocked'}</div>
            </div>
          </section>

          <div className="hub-section-heading"><div><span className="hub-label">Opportunity board</span><h2>Find your next juggle</h2></div><span className="hub-count">{filteredProducts.length} available</span></div>

          {/* INLINE INTENSE FILTERS */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            padding: '0.75rem 1rem',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: '1rem',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
          }}>
            {/* Search */}
            <div style={{ position: 'relative', minWidth: '200px', flex: '1 1 200px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)' }} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '0.6rem',
                  padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                  color: 'white',
                  outline: 'none',
                  fontSize: '0.8rem',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--neon-blue)'; e.target.style.boxShadow = '0 0 8px rgba(96,165,250,0.15)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.08)' }} />

            {/* Price Filter Pills */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { key: 'all', label: 'All' },
                { key: 'low', label: '<1k' },
                { key: 'mid', label: '1k-5k' },
                { key: 'high', label: '>5k' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setPriceFilter(key)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '2rem',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    background: priceFilter === key
                      ? 'linear-gradient(135deg, var(--hub-accent), #b8ffe0)'
                      : 'rgba(255,255,255,0.04)',
                    color: priceFilter === key ? 'white' : 'rgba(255,255,255,0.5)',
                    border: priceFilter === key ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: priceFilter === key ? '0 0 12px rgba(168,85,247,0.3)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.08)' }} />

            {/* Brand Dropdown */}
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '2rem',
                padding: '5px 12px',
                color: brandFilter !== 'all' ? 'var(--hub-accent)' : 'rgba(255,255,255,0.5)',
                fontSize: '0.7rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {['all', ...new Set(products.map(p => p.brand))].map(brand => (
                <option key={brand} value={brand} style={{ background: '#0a0a0a', color: 'white' }}>
                  {brand === 'all' ? 'All Brands' : brand}
                </option>
              ))}
            </select>

            {/* Divider */}
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.08)' }} />

            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '2rem',
                padding: '5px 12px',
                color: categoryFilter !== 'all' ? 'var(--neon-green)' : 'rgba(255,255,255,0.5)',
                fontSize: '0.7rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <option value="all" style={{ background: '#0a0a0a', color: 'white' }}>All Categories</option>
              {(Array.isArray(categories) ? categories : []).filter(c => c && !c.parent).map(cat => (
                <option key={cat.id} value={cat.id} style={{ background: '#0a0a0a', color: 'white' }}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* Divider */}
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.08)' }} />

            {/* Affordable Toggle */}
            <button
              onClick={() => setAffordableOnly(!affordableOnly)}
              style={{
                padding: '5px 12px',
                borderRadius: '2rem',
                fontSize: '0.7rem',
                fontWeight: 600,
                background: affordableOnly
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'rgba(255,255,255,0.04)',
                color: affordableOnly ? 'white' : 'rgba(255,255,255,0.5)',
                border: affordableOnly ? 'none' : '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                transition: 'all 0.25s',
                boxShadow: affordableOnly ? '0 0 12px rgba(16,185,129,0.3)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Zap size={12} />
              Affordable
            </button>

            {/* Count badge */}
            <span style={{
              marginLeft: 'auto',
              fontSize: '0.65rem',
              color: 'rgba(255,255,255,0.25)',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}>
              {filteredProducts.length}/{products.length}
            </span>
          </div>


          <div className="market-table" id="opportunities">
            <div className="market-table-head"><span>Asset</span><span>Pricing</span><span>Fill rate</span><span>Slots</span><span>Status</span></div>
            {productCards}
          </div>

          {/* Infinite Scroll Sentinel */}
        <div ref={scrollRef} style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          {loadingMore && <div className="neon-pulse" style={{ color: 'var(--neon-blue)', fontSize: '0.8rem', fontWeight: 'bold' }}>SCANNING DEEPER CUBES...</div>}
        </div>
      </div>
      </div>

      {/* RELIVE EFFECT */}
      {showRelive && (
        <div className="relive-overlay">
          <div className="relive-flash"></div>
          <div className="relive-circle"></div>
          <div className="relive-ring"></div>
          <div className="relive-ring-2"></div>
          <div className="relive-text">RELIVE</div>
        </div>
      )}

      {/* CUSTOM NOTIFICATION TOAST */}
      {notification.visible && (
        <div className={`notification-toast ${notification.type}`}>
          {notification.type === 'success' ? (
            <CheckCircle size={20} style={{ color: 'var(--neon-green)' }} />
          ) : (
            <XCircle size={20} style={{ color: '#ef4444' }} />
          )}
          <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{notification.message}</span>
        </div>
      )}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
 
export default JugglerDashboard;

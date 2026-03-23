import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingBag, ShieldCheck, Zap, Info, Pin, Layers, Activity, Crown, Search, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import HubSidebar from './HubSidebar';

const API_BASE = 'http://localhost:8000/api';

function JugglerDashboard() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [nextPowerUp, setNextPowerUp] = useState(0);
  const [showRelive, setShowRelive] = useState(false);
  const [prevTimeLeft, setPrevTimeLeft] = useState(300);
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
  const [affordableOnly, setAffordableOnly] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '', visible: false });

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 4000);
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
      const userRes = await axios.get(`${API_BASE}/users/me/`);
      setUser(userRes.data);
      if (userRes.data.seconds_until_next_change !== undefined) {
        const newTime = userRes.data.seconds_until_next_change;
        // Logic for "RELIVE" effect
        setPrevTimeLeft(prev => {
          if (prev <= 2 && newTime > 10) {
            setShowRelive(true);
            setTimeout(() => setShowRelive(false), 2500);
          }
          return newTime;
        });
        setTimeLeft(newTime);
      }
      if (userRes.data.pyramid_data?.next_winning_phase_seconds !== undefined) {
        setNextPowerUp(userRes.data.pyramid_data.next_winning_phase_seconds);
      }
    } catch (err) {
      console.error("Error fetching user status", err);
    }
  }, []); // Stable status fetcher

  const fetchProductsData = React.useCallback(async (url = `${API_BASE}/products/prototype_feed/`, isLoadMore = false) => {
    if (isLoadMore) {
      if (loadingMore || fetchedUrls.has(url)) return;
      setLoadingMore(true);
      setFetchedUrls(prev => new Set(prev).add(url));
    }
    try {
      const prodRes = await axios.get(url);
      const { results, next } = prodRes.data;
      if (results) {
        if (isLoadMore) {
          setProducts(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newResults = results.filter(p => !existingIds.has(p.id));
            return [...prev, ...newResults];
          });
        } else {
          setProducts(results);
          setFetchedUrls(new Set([`${API_BASE}/products/prototype_feed/`]));
        }
        setNextPage(next);
      } else {
        setProducts(prodRes.data);
        setNextPage(null);
      }
    } catch (err) {
      console.error("Error fetching products", err);
    } finally {
      if (isLoadMore) setLoadingMore(false);
    }
  }, [loadingMore, fetchedUrls]);

  // Initial Data Fetch
  useEffect(() => {
    fetchUserStatus();
    fetchProductsData();
  }, []); // Only once!

  // Polling Intervals
  useEffect(() => {
    const statusInterval = setInterval(fetchUserStatus, 1000);
    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setNextPowerUp((prev) => (prev > 0 ? prev - 1 : 0));
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
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleJuggle = async (productId) => {
    const markup = markupPrices[productId];
    const slots = slotCounts[productId] || 1;
    if (!markup) return showNotification("Please enter a markup price", "error");

    try {
      await axios.post(`${API_BASE}/juggle/start_juggle/`, {
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

  if (!user) {
    return (
      <div className="juggler-hub" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center' }}>
        <h1 style={{
          background: 'linear-gradient(to right, var(--neon-blue), var(--neon-purple))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontSize: '3rem',
          marginBottom: '1rem',
          animation: 'pulse 2s infinite'
        }}>
          Initializing Hub...
        </h1>
        <p className="text-muted" style={{ fontSize: '1.2rem' }}>Loading your Virtual Power</p>
      </div>
    );
  }

  const pyr = user.pyramid_data || {};

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPrice =
      priceFilter === 'all' ||
      (priceFilter === 'low' && p.base_price < 1000) ||
      (priceFilter === 'mid' && p.base_price >= 1000 && p.base_price <= 5000) ||
      (priceFilter === 'high' && p.base_price > 5000);

    const matchesBrand = brandFilter === 'all' || p.brand === brandFilter;
    const matchesAffordability = !affordableOnly || user.current_cb >= p.base_price;

    return matchesSearch && matchesPrice && matchesBrand && matchesAffordability;
  });

  return (
    <div className="juggler-hub" style={{ display: 'flex', padding: 0 }}>
      <HubSidebar />
      <div style={{ marginLeft: '220px', flex: 1, padding: '2rem' }}>
        <div className="hub-container">


          {/* Dashboard Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
            <div className="hub-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--neon-green)' }}>
              <div>
                <p className="text-muted" style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actual Balance (Safe)</p>
                <h2 style={{ color: 'var(--neon-green)', fontSize: '2.5rem', margin: '0.5rem 0' }}>{user.actual_balance} ETB</h2>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}><ShieldCheck size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Never risked, never touched.</p>
              </div>
            </div>

            <div className="hub-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '4px solid var(--neon-purple)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p className="text-muted" style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Balance</p>
                  <h2 style={{ color: 'var(--neon-purple)', fontSize: '2.5rem', margin: '0.5rem 0' }}>{Math.floor(user.current_cb)} ETB</h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--neon-gold)', margin: 0, fontWeight: 'bold' }}>
                    RESET: {formatTime(timeLeft)}
                  </p>
                  {pyr.is_winner && <Crown size={20} className="neon-pulse" style={{ color: 'var(--neon-gold)', marginTop: '4px' }} />}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--hub-text-muted)', textTransform: 'uppercase' }}>
                  <Layers size={14} />
                  CUBE {pyr.phase + 1}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--hub-text-muted)', textTransform: 'uppercase' }}>
                  <Pin size={14} />
                  BASE {pyr.user_rank}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: pyr.pulse_active ? 'var(--neon-blue)' : 'var(--hub-text-muted)', textTransform: 'uppercase' }}>
                  <Activity size={14} />
                  {pyr.pulse_active ? 'ACTIVE PULSE' : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      RESTING PULSE
                      <span style={{ color: 'var(--neon-gold)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Zap size={12} /> JUGGLE IN: {formatTime(nextPowerUp)}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

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
                      ? 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))'
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
                color: brandFilter !== 'all' ? 'var(--neon-purple)' : 'rgba(255,255,255,0.5)',
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


          <div className="grid-products" style={{ paddingBottom: '4rem' }}>
            {filteredProducts.map((product, idx) => {
              const canJuggle = user.current_cb >= product.base_price;
              const bgColor = placeholderColors[idx % placeholderColors.length];
              const isDark = bgColor === '#1f2937';
              const isFlipped = flippedCardId === product.id;

              return (
                <div key={product.id} className="card-flip-container" style={{ perspective: '1000px', height: '480px' }}>
                  <div className={`card-inner ${isFlipped ? 'flipped' : ''}`} style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: 'transform 0.6s', transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%' }}>

                    {/* FRONT OF CARD */}
                    <div className="card-front card" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', padding: '0', background: 'var(--hub-surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                      <div style={{
                        height: '240px',
                        background: bgColor,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        flexShrink: 0
                      }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2L15 8L22 9L17 14L18 21L12 17.5L6 21L7 14L2 9L9 8L12 2Z" opacity="0.5" />
                        </svg>
                      </div>

                      <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', color: 'var(--hub-text-main)' }}>{product.name}</h3>
                        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--hub-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.description}</p>

                        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: '1.2rem', fontWeight: '800', color: canJuggle ? 'var(--neon-green)' : 'var(--hub-text-main)' }}>
                            ETB {product.base_price}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--hub-text-muted)' }}>
                            {product.remaining_slots} / {product.stock} Slots
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                          <button className="btn-icon" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--hub-text-main)' }}>
                            <Pin size={18} />
                          </button>
                          <button
                            className="hub-btn hub-btn-neon"
                            style={{ flex: 1, margin: 0 }}
                            onClick={() => setFlippedCardId(product.id)}
                            disabled={!canJuggle || product.remaining_slots <= 0}
                          >
                            {product.remaining_slots <= 0 ? 'Full' : 'Juggle'}
                          </button>
                        </div>
                        {!canJuggle && product.remaining_slots > 0 &&
                          <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem', textAlign: 'center' }}>Insufficient Virtual Power</p>
                        }
                        {product.remaining_slots <= 0 &&
                          <p style={{ color: 'var(--neon-gold)', fontSize: '0.75rem', marginTop: '0.5rem', textAlign: 'center' }}>Prototype Maxed Out</p>
                        }
                      </div>
                    </div>

                    {/* BACK OF CARD */}
                    <div className="card-back card" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', padding: '1.5rem', background: 'var(--hub-card-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid var(--neon-purple)', display: 'flex', flexDirection: 'column', transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', boxShadow: 'inset 0 0 10px rgba(192, 132, 252, 0.1)' }}>
                      <h3 style={{ fontSize: '1.25rem', color: 'var(--neon-gold)', marginBottom: '0.5rem' }}>Scarcity Auction</h3>
                      <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>Set your markup and occupy multiple slots.</p>

                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                          <label style={{ fontSize: '0.7rem', color: 'var(--hub-text-muted)', textTransform: 'uppercase' }}>Target Selling Price (ETB)</label>
                          <input
                            type="number"
                            value={markupPrices[product.id] || ''}
                            onChange={(e) => setMarkupPrices(prev => ({ ...prev, [product.id]: e.target.value }))}
                            placeholder={`> ${product.base_price}`}
                            style={{ background: 'transparent', border: 'none', borderBottom: '2px solid var(--neon-purple)', color: 'white', fontSize: '1.2rem', padding: '0.4rem 0', outline: 'none', fontWeight: 'bold', width: '100%' }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <label style={{ fontSize: '0.7rem', color: 'var(--hub-text-muted)', textTransform: 'uppercase' }}>Slots to Claim</label>
                            <span style={{ fontSize: '0.7rem', color: 'var(--neon-gold)' }}>Available: {product.remaining_slots}</span>
                          </div>
                          <input
                            type="number"
                            min="1"
                            max={product.remaining_slots}
                            value={slotCounts[product.id] || 1}
                            onChange={(e) => setSlotCounts(prev => ({ ...prev, [product.id]: Math.min(product.remaining_slots, Math.max(1, parseInt(e.target.value) || 1)) }))}
                            style={{ background: 'transparent', border: 'none', borderBottom: '2px solid var(--neon-gold)', color: 'white', fontSize: '1.2rem', padding: '0.4rem 0', outline: 'none', fontWeight: 'bold', width: '100%' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--hub-text-muted)' }}>Total Required Power:</span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--neon-green)', fontWeight: 'bold' }}>{((parseFloat(product.base_price)) * (slotCounts[product.id] || 1)).toFixed(0)} ETB</span>
                      </div>

                      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button
                          className="hub-btn hub-btn-neon"
                          style={{ width: '100%' }}
                          onClick={() => handleJuggle(product.id)}
                          disabled={!markupPrices[product.id] || Number(markupPrices[product.id]) <= Number(product.base_price)}
                        >
                          Confirm Juggle
                        </button>
                        <button
                          className="hub-btn"
                          style={{ width: '100%', borderColor: 'rgba(255,255,255,0.2)', color: 'var(--hub-text-muted)' }}
                          onClick={() => setFlippedCardId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
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
    </div>
  );
}

export default JugglerDashboard;

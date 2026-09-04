import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, User, ShoppingBag, Package, X, Zap, LogOut, Shield } from 'lucide-react';

const COLORS = [
  { name: 'Black', hex: '#111' },
  { name: 'White', hex: '#fff' },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Gold', hex: '#eab308' },
  { name: 'Pink', hex: '#ec4899' },
];

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

function Navbar({
  searchTerm, onSearchChange,
  sortOrder, onSortChange,
  categories, selectedCategory, onCategoryChange,
  selectedColors, onColorToggle,
  selectedSize, onSizeChange,
  priceRange, onPriceRangeChange,
  juggleOnly, onJuggleOnlyToggle
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasFilters = typeof onSearchChange === 'function';
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [cartCount, setCartCount] = useState(0);
  const [userData, setUserData] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const fetchCartCount = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/cart/');
      const data = await res.json();
      setCartCount(data.length);
    } catch (err) {
      console.error("Error fetching cart count", err);
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/users/me/', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
      } else {
        setUserData(null);
      }
    } catch (err) {
      console.error("Error fetching user", err);
      setUserData(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:8000/api/users/logout_user/', { 
        method: 'POST',
        credentials: 'include'
      });
      setUserData(null);
      window.location.href = '/shop'; // Redirect to Buyers Hub
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  useEffect(() => {
    fetchCartCount();
    fetchUser();
    // Refresh count periodically or on event
    const interval = setInterval(fetchCartCount, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      // Show navbar when scrolling up OR near the top
      if (currentY < lastScrollY.current || currentY < 80) {
        setVisible(true);
      } else if (currentY > lastScrollY.current && currentY > 80) {
        setVisible(false);
        setFiltersOpen(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const activeFilterCount = [
    (selectedColors || []).length > 0,
    selectedSize && selectedSize !== 'all',
    priceRange && (priceRange[0] > 0 || priceRange[1] < 50000),
    juggleOnly,
    selectedCategory && selectedCategory !== 'All',
  ].filter(Boolean).length;

  return (
    <>
      {/* Spacer so content doesn't jump under fixed nav */}
      <div style={{ height: '64px', marginBottom: '1rem' }} />
      <nav style={{
        background: 'white',
        borderRadius: '2rem',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: filtersOpen ? '0' : 0,
        boxShadow: visible ? '0 4px 24px rgba(0,0,0,0.08)' : '0 4px 20px rgba(0,0,0,0.03)',
        position: 'fixed',
        top: visible ? '0.75rem' : '-80px',
        left: '2rem',
        right: '2rem',
        zIndex: 100,
        overflow: 'visible',
        transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
      }}>
        {/* Top Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-0.05em', cursor: 'pointer' }}>
              GOBeZ
            </div>
          </Link>

          {/* Search Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--accent-muted)',
            borderRadius: '2rem',
            padding: '0.5rem 1rem',
            width: '400px',
            maxWidth: '50vw'
          }}>
            <Search size={18} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Search premium drops..."
              value={hasFilters ? (searchTerm || '') : undefined}
              onChange={hasFilters ? (e) => onSearchChange(e.target.value) : undefined}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                marginLeft: '0.5rem',
                flex: 1,
                minWidth: 0,
                fontSize: '0.9rem',
                fontFamily: 'inherit'
              }}
            />
            {hasFilters ? (
              <div
                onClick={() => setFiltersOpen(!filtersOpen)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', flexShrink: 0,
                  paddingLeft: '0.5rem', borderLeft: '1px solid #e5e5e5',
                  color: filtersOpen ? '#7c3aed' : 'inherit',
                  transition: 'color 0.2s',
                  position: 'relative',
                }}
              >
                {filtersOpen ? <X size={14} /> : <SlidersHorizontal size={14} />}
                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{filtersOpen ? 'Close' : 'Filters'}</span>
                {activeFilterCount > 0 && !filtersOpen && (
                  <span style={{
                    position: 'absolute', top: '-8px', right: '-8px',
                    background: '#7c3aed', color: 'white', fontSize: '0.55rem', fontWeight: 'bold',
                    borderRadius: '50%', width: '14px', height: '14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>{activeFilterCount}</span>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', paddingLeft: '0.5rem', borderLeft: '1px solid #e5e5e5' }}>
                <SlidersHorizontal size={14} />
                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Filters</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Link to="/juggler" style={{ textDecoration: 'none' }}>
              <button className="btn-black" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
                JUGGLE
              </button>
            </Link>
            <Link to="/seller" style={{ color: 'inherit' }}>
              <Package size={22} style={{ cursor: 'pointer' }} title="Seller Dashboard" />
            </Link>
            {userData?.is_staff && (
              <Link to="/admin" style={{ color: 'var(--neon-purple)' }}>
                <Shield size={22} style={{ cursor: 'pointer' }} title="Admin Dashboard" />
              </Link>
            )}
            <Link to="/cart" style={{ color: 'inherit', position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ShoppingBag size={22} />
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-5px', right: '-5px',
                  background: '#ff4d4f', color: 'white', fontSize: '0.65rem', fontWeight: 'bold',
                  borderRadius: '50%', width: '16px', height: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>{cartCount}</span>
              )}
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link to="/account" style={{ color: 'inherit', display: 'flex', alignItems: 'center' }}>
                <User size={22} style={{ cursor: 'pointer' }} title="My Account" />
              </Link>
              {userData ? (
                <span 
                  onClick={() => setShowLogoutConfirm(true)}
                  style={{ fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', color: '#ff4d4f' }}
                >
                  Logout
                </span>
              ) : (
                <Link to="/account" style={{ textDecoration: 'none', color: 'var(--neon-purple)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Dense Filter Panel — drops down centered */}
        {filtersOpen && hasFilters && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '680px',
            maxWidth: '90vw',
            background: 'white',
            borderRadius: '1rem',
            boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            padding: '1.25rem 1.5rem',
            zIndex: 999,
            marginTop: '0.5rem',
            border: '1px solid #f0f0f0',
          }}>
            {/* Row 1: Sort + Category + Juggle Only */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sort</span>
              <select
                value={sortOrder || 'newest'}
                onChange={(e) => onSortChange(e.target.value)}
                style={{
                  padding: '4px 10px', borderRadius: '2rem', border: '1px solid #e5e5e5',
                  background: 'white', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', outline: 'none', color: '#333'
                }}
              >
                <option value="newest">Newest</option>
                <option value="price-low">Price ↑</option>
                <option value="price-high">Price ↓</option>
              </select>

              <div style={{ width: '1px', height: '18px', background: '#eee' }} />

              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</span>
              <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                {(categories || []).map(cat => (
                  <button
                    key={cat}
                    onClick={() => onCategoryChange(cat)}
                    style={{
                      padding: '3px 10px', borderRadius: '2rem',
                      border: selectedCategory === cat ? '1.5px solid #7c3aed' : '1px solid #e5e5e5',
                      background: selectedCategory === cat ? '#7c3aed' : 'white',
                      color: selectedCategory === cat ? 'white' : '#666',
                      cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600,
                      transition: 'all 0.15s', whiteSpace: 'nowrap'
                    }}
                  >{cat}</button>
                ))}
              </div>

              <div style={{ marginLeft: 'auto' }}>
                <button
                  onClick={onJuggleOnlyToggle}
                  style={{
                    padding: '4px 12px', borderRadius: '2rem', fontSize: '0.72rem', fontWeight: 700,
                    background: juggleOnly ? 'linear-gradient(135deg, #7c3aed, #6366f1)' : 'white',
                    color: juggleOnly ? 'white' : '#7c3aed',
                    border: juggleOnly ? 'none' : '1.5px solid #7c3aed',
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: juggleOnly ? '0 2px 10px rgba(124,58,237,0.3)' : 'none',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                >
                  <Zap size={12} /> Juggle Only
                </button>
              </div>
            </div>

            {/* Row 2: Colors + Size */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {/* Colors */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Color</span>
                <div style={{ display: 'flex', gap: '5px' }}>
                  {COLORS.map(c => {
                    const isSelected = (selectedColors || []).includes(c.name);
                    return (
                      <div
                        key={c.name}
                        onClick={() => onColorToggle && onColorToggle(c.name)}
                        title={c.name}
                        style={{
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: c.hex,
                          border: isSelected ? '2.5px solid #7c3aed' : (c.name === 'White' ? '1px solid #ddd' : '1px solid transparent'),
                          cursor: 'pointer', transition: 'all 0.15s',
                          boxShadow: isSelected ? '0 0 6px rgba(124,58,237,0.4)' : 'none',
                          transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div style={{ width: '1px', height: '18px', background: '#eee' }} />

              {/* Size */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Size</span>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {['all', ...SIZES].map(s => (
                    <button
                      key={s}
                      onClick={() => onSizeChange && onSizeChange(s)}
                      style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600,
                        background: (selectedSize || 'all') === s ? '#111' : 'white',
                        color: (selectedSize || 'all') === s ? 'white' : '#888',
                        border: (selectedSize || 'all') === s ? '1px solid #111' : '1px solid #e5e5e5',
                        cursor: 'pointer', transition: 'all 0.15s',
                        minWidth: '28px', textAlign: 'center',
                      }}
                    >{s === 'all' ? 'All' : s}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 3: Price Range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Price</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input
                  type="number"
                  placeholder="Min"
                  value={priceRange ? priceRange[0] || '' : ''}
                  onChange={(e) => onPriceRangeChange && onPriceRangeChange([parseInt(e.target.value) || 0, priceRange ? priceRange[1] : 50000])}
                  style={{
                    width: '72px', padding: '4px 8px', borderRadius: '6px',
                    border: '1px solid #e5e5e5', fontSize: '0.75rem', outline: 'none',
                    textAlign: 'center', fontWeight: 600,
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: '#bbb' }}>—</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={priceRange ? (priceRange[1] < 50000 ? priceRange[1] : '') : ''}
                  onChange={(e) => onPriceRangeChange && onPriceRangeChange([priceRange ? priceRange[0] : 0, parseInt(e.target.value) || 50000])}
                  style={{
                    width: '72px', padding: '4px 8px', borderRadius: '6px',
                    border: '1px solid #e5e5e5', fontSize: '0.75rem', outline: 'none',
                    textAlign: 'center', fontWeight: 600,
                  }}
                />
                <span style={{ fontSize: '0.68rem', color: '#aaa', fontWeight: 500 }}>ETB</span>
              </div>

              {/* Quick price pills */}
              <div style={{ display: 'flex', gap: '3px', marginLeft: '0.5rem' }}>
                {[
                  { label: '<500', min: 0, max: 500 },
                  { label: '500-2k', min: 500, max: 2000 },
                  { label: '2k-5k', min: 2000, max: 5000 },
                  { label: '5k+', min: 5000, max: 50000 },
                ].map(p => {
                  const isActive = priceRange && priceRange[0] === p.min && priceRange[1] === p.max;
                  return (
                    <button
                      key={p.label}
                      onClick={() => onPriceRangeChange && onPriceRangeChange(isActive ? [0, 50000] : [p.min, p.max])}
                      style={{
                        padding: '3px 9px', borderRadius: '2rem', fontSize: '0.67rem', fontWeight: 600,
                        background: isActive ? '#111' : 'white',
                        color: isActive ? 'white' : '#888',
                        border: isActive ? '1px solid #111' : '1px solid #e5e5e5',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >{p.label}</button>
                  );
                })}
              </div>

              {/* Clear All */}
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    onCategoryChange && onCategoryChange('All');
                    onColorToggle && COLORS.forEach(c => { if ((selectedColors || []).includes(c.name)) onColorToggle(c.name); });
                    onSizeChange && onSizeChange('all');
                    onPriceRangeChange && onPriceRangeChange([0, 50000]);
                    onJuggleOnlyToggle && juggleOnly && onJuggleOnlyToggle();
                  }}
                  style={{
                    marginLeft: 'auto', padding: '3px 10px', borderRadius: '2rem',
                    fontSize: '0.68rem', fontWeight: 600, color: '#ef4444',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >Clear All</button>
              )}
            </div>
          </div>
        )}
      </nav>
      {/* MODAL: Logout Confirmation */}
      {showLogoutConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '3rem', border: '2px solid var(--neon-purple)', boxShadow: '0 0 30px rgba(168, 85, 247, 0.2)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '1rem', background: 'rgba(255,77,79,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(255,77,79,0.2)' }}>
              <LogOut size={32} color="#ff4d4f" />
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Signing Out?</h2>
            <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '2.5rem' }}>Are you sure you want to end your current session? You'll need to sign back in to access your vault.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button onClick={() => setShowLogoutConfirm(false)} className="btn-checkout" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>CANCEL</button>
              <button onClick={handleLogout} className="btn-checkout" style={{ background: '#ff4d4f', color: '#fff', fontSize: '0.8rem' }}>LOGOUT</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;

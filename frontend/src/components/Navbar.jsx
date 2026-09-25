import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, User, ShoppingBag, Package, X, Zap, LogOut, Shield, AlertCircle, Bell, Award, MessageCircle } from 'lucide-react';
import api from '../api';
import { useAuth } from '../AuthContext';

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
  const navigate = useNavigate();
  const { user: userData, authStatus, logout: ctxLogout, refreshUser } = useAuth();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasFilters = typeof onSearchChange === 'function';
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [cartCount, setCartCount] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showBecomeJuggler, setShowBecomeJuggler] = useState(false);
  const [becomingJuggler, setBecomingJuggler] = useState(false);
  const [jugglerError, setJugglerError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  const fetchCartCount = async () => {
    try {
      const res = await api.get('/cart/');
      const items = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setCartCount(items.length);
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        console.error("Error fetching cart count", err);
      }
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/');
      const newNotifications = res.data?.notifications || [];
      const newUnreadCount = res.data?.unread_count || 0;
      
      // Check for new notifications and show browser push
      if (unreadCount > 0 && newUnreadCount > unreadCount) {
        const latestUnread = newNotifications.find(n => !n.is_read);
        if (latestUnread && Notification.permission === 'granted') {
          new Notification(latestUnread.title, {
            body: latestUnread.message,
            icon: '/favicon.ico'
          });
        }
      }
      
      setNotifications(newNotifications);
      setUnreadCount(newUnreadCount);
    } catch (err) {
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        console.error("Error fetching notifications", err);
      }
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await api.post('/notifications/mark_read/', { id });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking notification", err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/mark_all_read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all notifications", err);
    }
  };

  const handleBecomeJuggler = async () => {
    setBecomingJuggler(true);
    setJugglerError('');
    try {
      const res = await api.post('/users/become_juggler/');
      if (res.data.is_juggler) {
        await refreshUser();
        setShowBecomeJuggler(false);
        navigate('/juggler');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to become juggler';
      setJugglerError(msg);
    } finally {
      setBecomingJuggler(false);
    }
  };

  const handleJuggleClick = (e) => {
    e.preventDefault();
    if (userData?.is_juggler) {
      navigate('/juggler');
    } else {
      setShowBecomeJuggler(true);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/users/logout_user/');
      ctxLogout();
      navigate('/shop');
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  useEffect(() => {
    if (authStatus !== 'authenticated') return undefined;
    fetchCartCount();
    fetchNotifications();
    requestNotificationPermission();
    const handleCartUpdated = () => fetchCartCount();
    window.addEventListener('cart-updated', handleCartUpdated);
    const interval = setInterval(fetchCartCount, 5000);
    const notifInterval = setInterval(fetchNotifications, 30000);
    return () => {
      window.removeEventListener('cart-updated', handleCartUpdated);
      clearInterval(interval);
      clearInterval(notifInterval);
    };
  }, [authStatus]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
            <button className="btn-black" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }} onClick={handleJuggleClick}>
              JUGGLE
            </button>
            <Link to="/leaderboard" style={{ color: 'inherit' }}>
              <Award size={22} style={{ cursor: 'pointer' }} title="Leaderboard" />
            </Link>
            <Link to="/chat" style={{ color: 'inherit' }}>
              <MessageCircle size={22} style={{ cursor: 'pointer' }} title="Messages" />
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

            <div ref={notifRef} style={{ position: 'relative' }}>
              <div
                onClick={() => setShowNotifications(!showNotifications)}
                style={{ color: 'inherit', position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <Bell size={22} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '-5px', right: '-5px',
                    background: '#7c3aed', color: 'white', fontSize: '0.65rem', fontWeight: 'bold',
                    borderRadius: '50%', width: '16px', height: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>{unreadCount}</span>
                )}
              </div>

              {showNotifications && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, width: '360px', maxHeight: '480px',
                  background: 'white', borderRadius: '1rem', boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                  border: '1px solid #f0f0f0', overflow: 'hidden', zIndex: 999, marginTop: '0.5rem'
                }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '3rem', textAlign: 'center', color: '#999', fontSize: '0.9rem' }}>
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div
                          key={notif.id}
                          onClick={() => markNotificationRead(notif.id)}
                          style={{
                            padding: '1rem 1.25rem', borderBottom: '1px solid #f8f8f8', cursor: 'pointer',
                            background: notif.is_read ? 'white' : 'rgba(124,58,237,0.03)',
                            transition: 'background 0.15s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <div style={{
                              width: '8px', height: '8px', borderRadius: '50%', marginTop: '6px', flexShrink: 0,
                              background: notif.is_read ? '#ddd' : '#7c3aed'
                            }} />
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: '0.85rem', fontWeight: '600', margin: '0 0 0.25rem', color: '#333' }}>{notif.title}</p>
                              <p style={{ fontSize: '0.8rem', color: '#666', margin: 0, lineHeight: '1.4' }}>{notif.message}</p>
                              <p style={{ fontSize: '0.7rem', color: '#aaa', margin: '0.5rem 0 0' }}>
                                {new Date(notif.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div style={{ padding: '0.75rem', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
                      <Link to="/account?tab=notifications" onClick={() => setShowNotifications(false)} style={{ color: '#7c3aed', fontSize: '0.8rem', fontWeight: '600', textDecoration: 'none' }}>
                        View all notifications
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link to="/account" style={{ color: 'inherit', display: 'flex', alignItems: 'center' }}>
                <User size={22} style={{ cursor: 'pointer' }} title="My Account" />
              </Link>
              {authStatus === 'loading' ? null : authStatus === 'authenticated' ? (
                <span
                  id="navbar-logout-btn"
                  onClick={() => setShowLogoutConfirm(true)}
                  style={{ fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', color: '#ff4d4f' }}
                >
                  Logout
                </span>
              ) : (
                <Link id="navbar-login-link" to="/account" style={{ textDecoration: 'none', color: 'var(--neon-purple)', fontSize: '0.75rem', fontWeight: 'bold' }}>
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
      {/* MODAL: Become Juggler */}
      {showBecomeJuggler && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '420px', width: '100%', textAlign: 'center', padding: '2.5rem', border: '2px solid var(--neon-purple)', boxShadow: '0 0 30px rgba(168, 85, 247, 0.2)' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '1rem', background: 'rgba(192, 132, 252, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '2px solid var(--neon-purple)', boxShadow: '0 0 20px rgba(192, 132, 252, 0.2)' }}>
              <Zap size={36} color="var(--neon-purple)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Become a Juggler</h2>
            <p className="text-muted" style={{ fontSize: '0.95rem', marginBottom: '1.5rem', maxWidth: '320px', margin: '0 auto 1.5rem' }}>
              Unlock the Juggler Hub to start juggling products, earn from price markups, and climb the pyramid tiers.
            </p>
            
            <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>Access Fee</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--neon-green)' }}>ETB 10.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>Your Balance</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: userData?.actual_balance >= 10 ? 'var(--neon-green)' : '#ef4444' }}>
                  ETB {userData?.actual_balance || 0}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid #eee' }}>
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>Remaining</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: userData?.actual_balance >= 10 ? 'var(--neon-green)' : '#ef4444' }}>
                  ETB {(userData?.actual_balance || 0) - 10}
                </span>
              </div>
            </div>

            {jugglerError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.75rem', padding: '0.75rem', marginBottom: '1.5rem', color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <AlertCircle size={16} />
                {jugglerError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button onClick={() => setShowBecomeJuggler(false)} className="btn-checkout" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.85rem', color: 'var(--text-primary)' }}>CANCEL</button>
              <button onClick={handleBecomeJuggler} className="btn-checkout" style={{ background: userData?.actual_balance >= 10 ? '#000' : '#666', color: '#fff', fontSize: '0.85rem' }} disabled={becomingJuggler || (userData?.actual_balance || 0) < 10}>
                {becomingJuggler ? 'PROCESSING...' : 'PAY ETB 10 & UNLOCK'}
              </button>
            </div>
          </div>
        </div>
      )}
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

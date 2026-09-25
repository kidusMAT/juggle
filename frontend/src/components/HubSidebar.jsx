import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Zap, Layers, Radio, ArrowUpRight, Bell, Bookmark, UserRound, Activity, Plus } from 'lucide-react';
import { useAuth } from '../AuthContext';
import api from '../api';

function HubSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [watchlistCount, setWatchlistCount] = useState(() => {
    try { return JSON.parse(localStorage.getItem('juggle-watchlist') || '[]').length; } catch { return 0; }
  });
  const displayName = user?.username || user?.business_name || 'Juggler';
  const initials = displayName.slice(0, 2).toUpperCase();
  const marketState = user?.pyramid_data?.pulse_active ? 'High activity' : 'Market live';
  useEffect(() => {
    let mounted = true;
    api.get('/notifications/').then(({ data }) => {
      if (mounted) {
        const items = data?.notifications || [];
        setNotifications(items);
        setUnreadNotifications(items.filter(item => !item.is_read).length);
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  const markNotificationRead = async (notification) => {
    try { await api.post('/notifications/mark_read/', { id: notification.id }); } catch { /* keep local state responsive */ }
    setNotifications(prev => prev.map(item => item.id === notification.id ? { ...item, is_read: true } : item));
    setUnreadNotifications(prev => Math.max(0, prev - (notification.is_read ? 0 : 1)));
  };
  useEffect(() => {
    const syncWatchlist = () => {
      try { setWatchlistCount(JSON.parse(localStorage.getItem('juggle-watchlist') || '[]').length); } catch { setWatchlistCount(0); }
    };
    window.addEventListener('juggle-watchlist-updated', syncWatchlist);
    return () => window.removeEventListener('juggle-watchlist-updated', syncWatchlist);
  }, []);
  return (
    <aside className="hub-sidebar" style={{ width: '220px', flexShrink: 0, background: 'rgba(0,0,0,.72)', borderRight: '1px solid rgba(255,255,255,.08)', display: 'flex', flexDirection: 'column', padding: '1.35rem 1rem', position: 'fixed', left: 0, top: 0, height: '100vh', zIndex: 100, backdropFilter: 'blur(24px)', overflowY: 'auto', overflowX: 'hidden' }}>
      <div className="hub-sidebar-brand"><div className="hub-brand-mark"><span /><span /><span /></div><div><h2>Juggle</h2><p>Juggler terminal</p></div></div>
      <div className="hub-sidebar-live"><span><i /> Network live</span><strong><Radio size={13} /> Cycle active</strong></div>
      <Link to="/account" className="hub-sidebar-profile"><div className="hub-profile-avatar">{initials}</div><div><strong>{displayName}</strong><small>{user?.pyramid_tier ? `Tier ${user.pyramid_tier}` : 'Juggler account'}</small></div><ArrowUpRight size={14} /></Link>
      <nav className="hub-sidebar-nav" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        <span className="hub-sidebar-label">Workspace</span>
        <SidebarLink to="/juggler" icon={LayoutDashboard} label="Market overview" active={pathname === '/juggler'} />
        <SidebarLink to="/active-juggles" icon={Zap} label="Active juggles" active={pathname === '/active-juggles'} />
        <SidebarLink to="/pyramid" icon={Layers} label="View pyramid" active={pathname === '/pyramid'} />
        <span className="hub-sidebar-label hub-sidebar-label-spaced">Tools</span>
        <button className="hub-sidebar-tool" onClick={() => navigate('/juggler?view=watchlist')}><Bookmark size={16} /><span>Watchlist</span><b>{watchlistCount}</b></button>
        <button className="hub-sidebar-tool" onClick={() => setShowNotifications(prev => !prev)}><Bell size={16} /><span>Notifications</span><b>{unreadNotifications}</b></button>
        {showNotifications && <div className="hub-sidebar-notifications"><div className="hub-notifications-head"><strong>Notifications</strong><button onClick={() => setShowNotifications(false)}>×</button></div>{notifications.length === 0 ? <p>No notifications yet.</p> : notifications.slice(0, 4).map(item => <button key={item.id} className={`hub-notification-item ${item.is_read ? '' : 'is-unread'}`} onClick={() => markNotificationRead(item)}><strong>{item.title}</strong><small>{item.message}</small></button>)}</div>}
        <div className="hub-sidebar-pulse"><div><span><Activity size={13} /> Market pulse</span><strong>{marketState}</strong></div><small>Signals appear as the feed moves.</small></div>
      </nav>
      <div className="hub-sidebar-bottom" style={{ borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: '1rem' }}>
        <Link to="/juggler#opportunities" className="hub-sidebar-start"><Plus size={16} /> Start a new juggle</Link>
        <div className="hub-sidebar-power"><span>Juggling power</span><strong>Live account</strong><div><i style={{ width: '68%' }} /></div><small>Refreshes with each cycle</small></div>
        <Link to="/shop" style={{ textDecoration: 'none' }}><div className="hub-sidebar-market-link"><ShoppingBag size={17} /> Browse marketplace <ArrowUpRight size={15} style={{ marginLeft: 'auto' }} /></div></Link>
      </div>
    </aside>
  );
}

function SidebarLink({ to, icon, label, active }) {
  return <Link to={to} style={{ textDecoration: 'none' }}><div className={`hub-sidebar-link ${active ? 'hub-sidebar-link-active' : ''}`}>
    {React.createElement(icon, { size: 18 })}<span>{label}</span>{active && <i className="hub-sidebar-active-dot" />}
  </div></Link>;
}

export default HubSidebar;

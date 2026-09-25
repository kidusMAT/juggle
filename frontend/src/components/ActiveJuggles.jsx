import React, { useState, useEffect } from 'react';
import api, { API_BASE } from '../api';
import { Package, ShieldCheck, Zap, Info, Pin, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import HubSidebar from './HubSidebar';
import { useAuth } from '../AuthContext';

function ActiveJuggles() {
  const navigate = useNavigate();
  const [juggles, setJuggles] = useState([]);
  const { user, refreshUser } = useAuth();
  const [timeLeft, setTimeLeft] = useState(300);
  const [showRelive, setShowRelive] = useState(false);
  const [prevTimeLeft, setPrevTimeLeft] = useState(300);
  const [notification, setNotification] = useState({ message: '', type: '', visible: false });
  const [reliveTransition, setReliveTransition] = useState('none');

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await refreshUser();
        if (userData?.seconds_until_next_change !== undefined) {
          const newTime = userData.seconds_until_next_change;
          // Detect phase reset: timer jumped back up from near-zero
          if (prevTimeLeft <= 2 && newTime > 10) {
            setShowRelive(true);
            setTimeout(() => setShowRelive(false), 2500);
          }
          setPrevTimeLeft(newTime);
          setTimeLeft(newTime);
        }
        const jugglesRes = await api.get('/juggle/my_juggles/');
        setJuggles(jugglesRes.data);
      } catch (err) {
        console.error("Error fetching data", err);
        if (err.response?.status === 401 || err.response?.data?.error === "Not authenticated") {
          navigate('/account');
        }
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    
    // Timer is just for UI visualization of CB refresh, keep it for consistency
    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = (prev > 0 ? (prev > 300 ? 300 : prev - 1) : 0);
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
      clearInterval(interval);
      clearInterval(timerInterval);
    };
  }, [navigate, prevTimeLeft, refreshUser]);

  const handleCancel = async (sessionId) => {
    try {
      if (!window.confirm("Are you sure you want to cancel this deal? Your reserved virtual power will be released.")) return;
      await api.post(`/juggle/${sessionId}/cancel_juggle/`, {});
      showNotification("Deal cancelled successfully", "success");
      // Re-fetch to update UI immediately
      const jugglesRes = await api.get('/juggle/my_juggles/');
      setJuggles(jugglesRes.data);
    } catch (err) {
      console.error("Error cancelling juggle", err);
      showNotification(err.response?.data?.error || "Failed to cancel deal", "error");
    }
  };

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
          Loading Active Juggles...
        </h1>
      </div>
    );
  }

  return (
    <div className="juggler-hub" style={{ display: 'flex', padding: 0 }}>
      <HubSidebar />
      <div className="hub-main" style={{ marginLeft: '220px', flex: 1, padding: '2rem' }}>
        <div className="hub-container">
          <section className="network-header active-header"><div><div className="hub-eyebrow"><span className="live-dot" /> LIVE POSITIONS · {juggles.length}</div><h1>Your active juggles.</h1><p>Monitor every listing, its power commitment, and the next cycle refresh.</p></div><div className="hub-cycle"><span>Power refresh</span><strong>{formatTime(timeLeft)}</strong><small>{Math.floor(user.current_cb).toLocaleString()} ETB available</small></div></section>
          <section className="network-kpi-grid active-kpi-grid"><div className="hub-kpi hub-kpi-accent"><span>Open positions</span><strong>{juggles.length}<small> live</small></strong><em>Currently listed</em></div><div className="hub-kpi"><span>Committed power</span><strong>{juggles.reduce((sum, item) => sum + (Number(item.product?.base_price) * Number(item.amount || 1)), 0).toLocaleString()} <small>ETB</small></strong><em>Reserved across listings</em></div><div className="hub-kpi"><span>Completed deals</span><strong>{user.deals_completed || 0}</strong><em>Lifetime activity</em></div><div className="hub-kpi"><span>Cycle status</span><strong className="active-kpi-text">{timeLeft < 60 ? 'Closing' : 'Active'}</strong><em>Auto-refresh enabled</em></div></section>

          <div className="active-position-table">
            {juggles.length === 0 ? (
              <div className="active-empty"><div className="asset-mark">—</div><h2>No active positions</h2><p>Choose an item from the opportunity board to start moving product through the market.</p><Link to="/juggler#opportunities" className="market-action market-action-primary">Find an opportunity</Link>
              </div>
            ) : (
              juggles.map((juggle, idx) => {
                const product = juggle.product;
                const isUnderpowered = user.pyramid_data && user.pyramid_data.raw_cb < product.base_price;

                return (
                  <div key={juggle.id} className={`active-position-row ${isUnderpowered ? 'position-underpowered' : ''} ${reliveTransition === 'exit' ? 'renew-exit' : (reliveTransition === 'enter' ? 'renew-enter' : '')}`}><div className="market-asset"><span className="asset-mark">{product.name.slice(0, 1)}</span><div><strong>{product.name}</strong><small>{product.brand || 'Market asset'}</small></div></div><div className="market-stat"><span>Your listing</span><strong>{Number(juggle.markup_price).toLocaleString()} ETB</strong><small>Base {Number(product.base_price).toLocaleString()} ETB</small></div><div className="market-stat"><span>Power</span><strong>{(Number(product.base_price) * Number(juggle.amount || 1)).toLocaleString()} ETB</strong><small>{juggle.amount || 1} slot(s)</small></div><div className="market-stat"><span>Cycle</span><strong className="active-time"><Clock size={13} /> {formatTime(timeLeft)}</strong><small>{isUnderpowered ? 'Needs power' : 'Live listing'}</small></div><div className="active-row-actions"><span className={isUnderpowered ? 'status-warning' : 'status-live'}><i /> {isUnderpowered ? 'Underpowered' : 'Active'}</span><button className="market-action market-action-danger" onClick={() => handleCancel(juggle.id)}>Cancel</button></div></div>
                );
              })
            )}
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

export default ActiveJuggles;

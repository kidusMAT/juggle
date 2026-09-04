import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, ShieldCheck, Zap, Info, Pin, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import HubSidebar from './HubSidebar';

const API_BASE = 'http://localhost:8000/api';

function ActiveJuggles() {
  const navigate = useNavigate();
  const [juggles, setJuggles] = useState([]);
  const [user, setUser] = useState(null);
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
        const userRes = await axios.get(`${API_BASE}/users/me/`, { withCredentials: true });
        setUser(userRes.data);
        if (userRes.data.seconds_until_next_change !== undefined) {
          const newTime = userRes.data.seconds_until_next_change;
          // Detect phase reset: timer jumped back up from near-zero
          if (prevTimeLeft <= 2 && newTime > 10) {
            setShowRelive(true);
            setTimeout(() => setShowRelive(false), 2500);
          }
          setPrevTimeLeft(newTime);
          setTimeLeft(newTime);
        }
        const jugglesRes = await axios.get(`${API_BASE}/juggle/my_juggles/`, { withCredentials: true });
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
  }, []);

  const handleCancel = async (sessionId) => {
    try {
      if (!window.confirm("Are you sure you want to cancel this deal? Your reserved virtual power will be released.")) return;
      await axios.post(`${API_BASE}/juggle/${sessionId}/cancel_juggle/`, {}, { withCredentials: true });
      showNotification("Deal cancelled successfully", "success");
      // Re-fetch to update UI immediately
      const jugglesRes = await axios.get(`${API_BASE}/juggle/my_juggles/`, { withCredentials: true });
      setJuggles(jugglesRes.data);
    } catch (err) {
      console.error("Error cancelling juggle", err);
      showNotification(err.response?.data?.error || "Failed to cancel deal", "error");
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateTimeRemaining = (expiresAt) => {
    const expires = new Date(expiresAt).getTime();
    const now = new Date().getTime();
    const diff = expires - now;
    if (diff <= 0) return "Expired";
    
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
      <div style={{ marginLeft: '220px', flex: 1, padding: '2rem' }}>
        <div className="hub-container">
          

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1rem 1.5rem', background: 'var(--hub-card-bg)', borderRadius: '1rem', border: '1px solid var(--hub-border)' }}>
            <div>
              <p className="text-muted" style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Power</p>
              <h2 style={{ color: 'var(--neon-purple)', fontSize: '1.5rem' }}>{Math.floor(user.current_cb)} ETB</h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="text-muted" style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Next Power Reset</p>
              <h2 style={{ color: 'var(--neon-gold)', fontSize: '1.5rem' }}>{formatTime(timeLeft)}</h2>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem', paddingBottom: '4rem' }}>
            {juggles.length === 0 ? (
              <div className="hub-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem' }}>
                <p className="text-muted" style={{ marginBottom: '1rem' }}>No active juggles found.</p>
                <Link to="/">
                  <button className="hub-btn hub-btn-neon">Go to Dashboard</button>
                </Link>
              </div>
            ) : (
              juggles.map((juggle, idx) => {
                const product = juggle.product;
                const isUnderpowered = user.pyramid_data.raw_cb < product.base_price;
                const bgColor = placeholderColors[idx % placeholderColors.length];
                const isDark = bgColor === '#1f2937';

                return (
                  <div key={juggle.id} className={`card card-alive ${reliveTransition === 'exit' ? 'renew-exit' : (reliveTransition === 'enter' ? 'renew-enter' : '')}`} style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--hub-surface)', border: '1px solid var(--neon-purple)', boxShadow: '0 0 15px rgba(192, 132, 252, 0.1)', opacity: isUnderpowered ? 0.8 : 1 }}>
                    <div style={{ 
                      height: '240px', 
                      background: bgColor,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                    }}>
                      <div className={`badge-timer ${isUnderpowered ? 'badge-live-gold' : 'badge-live'}`} style={{ position: 'absolute', top: '1rem', right: '1rem', background: isUnderpowered ? 'rgba(251, 191, 36, 0.2)' : 'var(--hub-card-bg)', border: `1px solid ${isUnderpowered ? 'var(--neon-gold)' : 'var(--neon-purple)'}`, color: isUnderpowered ? 'var(--neon-gold)' : 'white' }}>
                        <Clock size={12} style={{ color: isUnderpowered ? 'var(--neon-gold)' : 'var(--neon-purple)' }}/> {formatTime(timeLeft)}
                      </div>
                      {isUnderpowered ? (
                        <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'var(--neon-gold)', color: 'black', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.7rem', fontWeight: 'bold', boxShadow: '0 0 10px rgba(255, 171, 0, 0.5)' }}>
                          <span className="live-dot-gold"></span> HIDDEN: LOW POWER
                        </div>
                      ) : (
                        <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'var(--neon-green)', color: 'black', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.7rem', fontWeight: 'bold' }}>
                          <span className="live-dot"></span> LIVE ON SITE A
                        </div>
                      )}
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L15 8L22 9L17 14L18 21L12 17.5L6 21L7 14L2 9L9 8L12 2Z" opacity="0.5"/>
                      </svg>
                    </div>

                    <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', color: 'var(--hub-text-main)' }}>{product.name}</h3>
                      <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.5rem', color: 'var(--hub-text-muted)' }}>{product.description}</p>
                      
                      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--hub-text-muted)' }}>Base Power:</span>
                          <span style={{ color: 'var(--hub-text-main)' }}>{product.base_price} ETB</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 'bold' }}>
                          <span style={{ color: 'var(--neon-green)' }}>Your Listing:</span>
                          <span style={{ color: 'var(--neon-green)' }}>{juggle.markup_price} ETB</span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                        <button className="hub-btn" style={{ flex: 1, background: isUnderpowered ? 'rgba(255, 171, 0, 0.1)' : 'rgba(34, 197, 94, 0.1)', borderColor: isUnderpowered ? 'var(--neon-gold)' : 'var(--neon-green)', color: isUnderpowered ? 'var(--neon-gold)' : 'var(--neon-green)', fontSize: '0.8rem' }} disabled>
                          {isUnderpowered ? 'Underpowered' : 'Competing'}
                        </button>
                        <button 
                          className="hub-btn" 
                          style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444', fontSize: '0.8rem' }}
                          onClick={() => handleCancel(juggle.id)}
                        >
                          Cancel Deal
                        </button>
                      </div>
                    </div>
                  </div>
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

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../api';
import HubSidebar from './HubSidebar';
import PyramidVisualizer from './PyramidVisualizer';
import { useAuth } from '../AuthContext';

function PyramidPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        await refreshUser();
      } catch (err) {
        console.error("Error fetching user data", err);
        if (err.response?.status === 401 || err.response?.data?.error === "Not authenticated") {
          navigate('/account');
        }
      }
    };
    fetchUser();
    const interval = setInterval(fetchUser, 1000);
    return () => clearInterval(interval);
  }, [navigate, refreshUser]);

  if (!user) return null;

  const pyr = user.pyramid_data || {};

  return (
    <div className="juggler-hub" style={{ display: 'flex', padding: 0 }}>
      <HubSidebar />
      <div className="hub-main" style={{ marginLeft: '220px', flex: 1, padding: '2rem' }}>
        <div className="hub-container">
          <header className="network-header">
            <div>
              <div className="hub-eyebrow"><span className="live-dot" /> NETWORK POSITION · LIVE</div>
              <h1>Your place in the Juggle network.</h1>
              <p>Track your rank, power allocation, and the next position you can reach as the cycle moves.</p>
            </div>
            <div className="hub-cycle"><span>Current cycle</span><strong>#{(pyr.phase || 0) + 1}</strong><small>Position data refreshes live</small></div>
          </header>

          <section className="network-kpi-grid">
            <div className="hub-kpi hub-kpi-accent"><span>Your rank</span><strong>#{pyr.user_rank || '—'}</strong><em>Current network position</em></div>
            <div className="hub-kpi"><span>Power allocation</span><strong>{Math.round(pyr.current_cb || pyr.individual_cb || 0).toLocaleString()} <small>CB</small></strong><em>Based on your position</em></div>
            <div className="hub-kpi"><span>Safe balance</span><strong>{Math.round(pyr.total_safe_balance || 0).toLocaleString()} <small>ETB</small></strong><em>Protected network pool</em></div>
            <div className="hub-kpi"><span>Active threshold</span><strong>{pyr.current_threshold || '—'} <small>positions</small></strong><em>Positions currently active</em></div>
          </section>

          <PyramidVisualizer 
            pyramidData={pyr} 
            currentPhase={pyr.phase} 
            totalSafeBalance={pyr.total_safe_balance}
          />
        </div>
      </div>
    </div>
  );
}

export default PyramidPage;

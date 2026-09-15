import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_BASE } from '../api';
import HubSidebar from './HubSidebar';
import PyramidVisualizer from './PyramidVisualizer';

function PyramidPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/users/me/');
        setUser(res.data);
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
  }, []);

  if (!user) return null;

  const pyr = user.pyramid_data || {};

  return (
    <div className="juggler-hub" style={{ display: 'flex', padding: 0 }}>
      <HubSidebar />
      <div style={{ marginLeft: '220px', flex: 1, padding: '2rem' }}>
        <div className="hub-container">
          <header style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: 'var(--neon-purple)' }}>Pyramid Strategy</h2>
            <p className="text-muted">Analyze your standing and prepare for the next power-up.</p>
          </header>
          
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

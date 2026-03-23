import React, { useState, useEffect } from 'react';
import axios from 'axios';
import HubSidebar from './HubSidebar';
import PyramidVisualizer from './PyramidVisualizer';

const API_BASE = 'http://localhost:8000/api';

function PyramidPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(`${API_BASE}/users/me/`);
        setUser(res.data);
      } catch (err) {
        console.error("Error fetching user data", err);
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

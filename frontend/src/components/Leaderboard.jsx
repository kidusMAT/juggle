import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Navbar from './Navbar';
import { Trophy, TrendingUp, Zap, DollarSign, Award, Crown } from 'lucide-react';

export default function Leaderboard() {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [totalJugglers, setTotalJugglers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get('/users/leaderboard/');
      setLeaderboard(res.data.leaderboard);
      setTotalJugglers(res.data.total_jugglers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeaderboard = leaderboard.filter(j => {
    if (filter === 'top10') return j.rank <= 10;
    if (filter === 'elite') return j.rank <= 25;
    return true;
  });

  const getRankStyle = (rank) => {
    if (rank === 1) return { background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#000', boxShadow: '0 0 30px rgba(255, 215, 0, 0.5)' };
    if (rank === 2) return { background: 'linear-gradient(135deg, #C0C0C0, #A8A8A8)', color: '#000', boxShadow: '0 0 20px rgba(192, 192, 192, 0.5)' };
    if (rank === 3) return { background: 'linear-gradient(135deg, #CD7F32, #B8860B)', color: '#000', boxShadow: '0 0 20px rgba(205, 127, 50, 0.5)' };
    return { background: 'var(--bg-card)', color: 'inherit' };
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      <Navbar />
      
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #FFD700, #FFA500)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 0 40px rgba(255, 215, 0, 0.4)' }}>
            <Crown size={40} color="#000" />
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-0.05em', background: 'linear-gradient(135deg, #FFD700, #FFA500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Juggler Leaderboard
          </h1>
          <p className="text-muted">Top performers in The Juggle economy</p>
          <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--neon-green)' }}>
            {totalJugglers} Active Jugglers
          </div>
        </header>

        {/* Filters */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
          {['all', 'top10', 'elite'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.5rem 1.5rem',
                borderRadius: '2rem',
                border: '1px solid rgba(132, 252, 194, 0.3)',
                background: filter === f ? 'var(--neon-green)' : 'transparent',
                color: filter === f ? '#000' : 'inherit',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              {f === 'all' ? 'All Ranks' : f === 'top10' ? 'Top 10' : 'Elite 25'}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p className="text-muted">Loading leaderboard...</p>
          </div>
        ) : (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Top 3 Podium */}
            {leaderboard.length >= 3 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '1rem', marginBottom: '3rem', padding: '0 1rem' }}>
                {/* 2nd Place */}
                <PodiumCard 
                  juggler={leaderboard[1]} 
                  height={180}
                  style={{ order: 1 }}
                />
                {/* 1st Place */}
                <PodiumCard 
                  juggler={leaderboard[0]} 
                  height={220}
                  style={{ order: 2 }}
                  isWinner
                />
                {/* 3rd Place */}
                <PodiumCard 
                  juggler={leaderboard[2]} 
                  height={160}
                  style={{ order: 3 }}
                />
              </div>
            )}

            {/* Rest of Leaderboard */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredLeaderboard.slice(3).map((juggler) => (
                <div
                  key={juggler.id}
                  className="card"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr auto',
                    alignItems: 'center',
                    gap: '1.5rem',
                    padding: '1.25rem 1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => navigate(`/juggler/${juggler.id}`)}
                >
                  <div style={{
                    width: '45px',
                    height: '45px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: juggler.rank <= 10 ? 'var(--neon-green)' : 'rgba(0,0,0,0.05)',
                    color: juggler.rank <= 10 ? '#000' : '#888',
                    fontWeight: '900',
                    fontSize: '1rem'
                  }}>
                    #{juggler.rank}
                  </div>

                  <div>
                    <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{juggler.username}</div>
                    <div style={{ fontSize: '0.8rem', color: juggler.badge.color }}>
                      {juggler.badge.emoji} {juggler.badge.name}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: '900', fontSize: '1rem' }}>{juggler.deals_completed}</div>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>Deals</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: '900', fontSize: '1rem', color: 'var(--neon-purple)' }}>{Math.floor(juggler.cb_power)}</div>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>CB</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredLeaderboard.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p className="text-muted">No jugglers found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PodiumCard({ juggler, height, isWinner, style }) {
  return (
    <div
      className="card"
      style={{
        width: '160px',
        padding: 0,
        overflow: 'hidden',
        transition: 'all 0.3s',
        ...style
      }}
    >
      {/* Avatar */}
      <div style={{
        padding: '1.5rem',
        textAlign: 'center',
        background: isWinner ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 165, 0, 0.1))' : 'transparent'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: juggler.badge.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          fontSize: '1.5rem',
          boxShadow: isWinner ? `0 0 30px ${juggler.badge.color}50` : 'none'
        }}>
          {juggler.badge.emoji}
        </div>
        <div style={{ fontWeight: '700', marginTop: '0.75rem', fontSize: '0.9rem' }}>{juggler.username}</div>
        <div style={{ fontSize: '0.7rem', color: juggler.badge.color }}>{juggler.badge.name}</div>
      </div>

      {/* Stats Bar */}
      <div style={{
        height: `${height}px`,
        background: isWinner ? 'linear-gradient(180deg, #FFD700, #FFA500)' : juggler.rank === 2 ? 'linear-gradient(180deg, #C0C0C0, #A8A8A8)' : 'linear-gradient(180deg, #CD7F32, #B8860B)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#000',
        fontWeight: '900'
      }}>
        <div style={{ fontSize: '2rem' }}>#{juggler.rank}</div>
        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{juggler.deals_completed} Deals</div>
      </div>
    </div>
  );
}

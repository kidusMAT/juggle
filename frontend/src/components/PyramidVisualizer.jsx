import React, { useState } from 'react';
import { Crown, Zap, User, Clock, Info } from 'lucide-react';

const PyramidVisualizer = ({ pyramidData, currentPhase, totalSafeBalance = 10000 }) => {
  // Balanced Pool Logic: Individual CB = Total Pool / Survivors
  const pool = totalSafeBalance || 10000;
  
  const tiers = pyramidData?.tiers || [
    { phase: 7, survivors: 1, value: pool / 1, label: "EXECUTIVE" },
    { phase: 6, survivors: 2, value: pool / 2, label: "DIRECTOR" },
    { phase: 5, survivors: 4, value: pool / 4, label: "MANAGER" },
    { phase: 4, survivors: 8, value: pool / 8, label: "SUPERVISOR" },
    { phase: 3, survivors: 12, value: pool / 12, label: "TEAM LEAD" },
    { phase: 2, survivors: 25, value: pool / 25, label: "SENIOR" },
    { phase: 1, survivors: 50, value: pool / 50, label: "JUNIOR" },
    { phase: 0, survivors: 100, value: pool / 100, label: "BASE" },
  ];

  const boxSize = pyramidData?.box_size || 100;

  const [selectedRank, setSelectedRank] = useState(null);
  const userRank = pyramidData?.user_rank || 0;
  
  // Current survival threshold for the ACTIVE cube
  const currentThreshold = tiers.find(t => t.phase === currentPhase)?.survivors || 10;

  return (
    <div className="pyramid-container" style={{ 
      padding: '2.5rem', 
      background: 'rgba(0,0,0,0.6)', 
      borderRadius: '2rem', 
      border: '2px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(20px)',
      marginTop: '2rem',
      maxWidth: '1200px',
      margin: '2rem auto'
    }}>
      <h3 style={{ color: '#fff', marginBottom: '1rem', fontSize: '2.2rem', textAlign: 'center', fontWeight: '900', letterSpacing: '0.1em' }}>
        PYRAMID <span style={{ color: 'var(--neon-purple)' }}>SYSTEM</span>
      </h3>

      {/* Rank Projection Info */}
      <div style={{ height: '60px', marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {selectedRank ? (
           <div className="neon-border" style={{ 
             background: 'rgba(168, 85, 247, 0.1)', 
             padding: '8px 24px', 
             borderRadius: '30px', 
             display: 'flex', 
             alignItems: 'center', 
             gap: '12px',
             color: 'white',
             fontSize: '0.9rem',
             border: '1px solid var(--neon-purple)'
           }}>
             <Clock size={16} color="var(--neon-purple)" />
             <span>PROJECTED ARRIVAL AT <strong style={{ color: 'var(--neon-purple)' }}>RANK {selectedRank.rank}</strong>:</span>
             <strong style={{ color: 'var(--neon-green)' }}>{selectedRank.time}</strong>
             <Info size={14} style={{ opacity: 0.5, cursor: 'help' }} title="Based on 40-minute rotation cycles" />
           </div>
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>CLICK ANY BASE TO CALCULATE ARRIVAL TIME</p>
        )}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        {tiers.map((tier, idx) => {
          const isCurrentPhase = tier.phase === currentPhase;
          const blockCount = tier.survivors;
          
          // Logic for block sizing to fit the row
          const blockSize = tier.phase >= 5 ? 24 : (tier.phase >= 3 ? 12 : 6);
          const gapSize = tier.phase >= 5 ? 6 : 2;

          return (
            <div 
              key={tier.phase}
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <div style={{ 
                width: '100%', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'baseline',
                padding: '0 2rem',
                opacity: isCurrentPhase ? 1 : 0.4
              }}>
                <span style={{ color: 'var(--neon-purple)', fontWeight: '900', fontSize: '0.7rem', letterSpacing: '0.1em' }}>
                  CUBE {tier.phase + 1} // {tier.label}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', fontWeight: 'bold' }}>
                  ACTIVE THRESHOLD: TOP {tier.survivors}
                </span>
              </div>

              <div 
                style={{
                  width: '100%',
                  background: isCurrentPhase ? 'rgba(168, 85, 247, 0.05)' : 'rgba(255,255,255,0.02)',
                  border: isCurrentPhase ? `1px solid rgba(168, 85, 247, 0.3)` : `1px solid rgba(255,255,255,0.05)`,
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: `${gapSize}px`,
                  transition: 'all 0.4s ease'
                }}
              >
                {/* Generate blocks for this tier */}
                {Array.from({ length: blockCount }).map((_, bIdx) => {
                  const rank = bIdx + 1;
                  const isActive = rank <= currentThreshold;
                  const isUser = rank === userRank;

                  return (
                    <div 
                      key={rank}
                      title={`RANK ${rank} - ${isActive ? 'ACTIVE' : 'IDLE'}`}
                      onClick={() => {
                        const diff = (userRank - rank + boxSize) % boxSize;
                        const totalMinutes = diff * 40;
                        const days = Math.floor(totalMinutes / 1440);
                        const hours = Math.floor((totalMinutes % 1440) / 60);
                        const mins = totalMinutes % 60;
                        
                        let timeStr = "";
                        if (days > 0) timeStr += `${days}d `;
                        if (hours > 0) timeStr += `${hours}h `;
                        if (mins > 0 || timeStr === "") timeStr += `${mins}m`;
                        
                        setSelectedRank({ rank, time: timeStr });
                      }}
                      style={{
                        width: `${blockSize}px`,
                        height: `${blockSize}px`,
                        background: isUser ? 'var(--neon-green)' : (isActive ? 'var(--neon-purple)' : 'rgba(255,255,255,0.1)'),
                        borderRadius: blockSize > 6 ? '4px' : '1px',
                        boxShadow: isUser ? '0 0 10px var(--neon-green)' : (isActive && isCurrentPhase ? '0 0 8px var(--neon-purple)' : 'none'),
                        transition: 'transform 0.2s ease',
                        cursor: 'pointer',
                        transform: selectedRank?.rank === rank ? 'scale(1.8)' : 'scale(1)',
                        zIndex: selectedRank?.rank === rank ? 10 : 1,
                        border: selectedRank?.rank === rank ? '2px solid white' : 'none'
                      }}
                      onMouseEnter={(e) => { if (selectedRank?.rank !== rank) e.target.style.transform = 'scale(1.5)' }}
                      onMouseLeave={(e) => { if (selectedRank?.rank !== rank) e.target.style.transform = 'scale(1)' }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '3rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', gap: '2rem', padding: '1rem 2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <div style={{ width: '12px', height: '12px', background: 'var(--neon-purple)', borderRadius: '2px' }} />
             <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>ACTIVE BASES</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <div style={{ width: '12px', height: '12px', background: 'var(--neon-green)', borderRadius: '2px' }} />
             <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>YOU [BASE {userRank}]</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <div style={{ width: '12px', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }} />
             <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>IDLE BASES</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PyramidVisualizer;

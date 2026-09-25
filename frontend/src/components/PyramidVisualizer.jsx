import React, { useState } from 'react';
import { Clock, Info, ArrowUpRight, ShieldCheck } from 'lucide-react';

const PyramidVisualizer = ({ pyramidData, currentPhase, totalSafeBalance = 10000 }) => {
  const pool = totalSafeBalance || 10000;
  const tiers = pyramidData?.tiers || [
    { phase: 7, survivors: 1, value: pool / 1, label: 'EXECUTIVE' },
    { phase: 6, survivors: 2, value: pool / 2, label: 'DIRECTOR' },
    { phase: 5, survivors: 4, value: pool / 4, label: 'MANAGER' },
    { phase: 4, survivors: 8, value: pool / 8, label: 'SUPERVISOR' },
    { phase: 3, survivors: 12, value: pool / 12, label: 'TEAM LEAD' },
    { phase: 2, survivors: 25, value: pool / 25, label: 'SENIOR' },
    { phase: 1, survivors: 50, value: pool / 50, label: 'JUNIOR' },
    { phase: 0, survivors: 100, value: pool / 100, label: 'BASE' },
  ];
  const boxSize = pyramidData?.box_size || 100;
  const userRank = pyramidData?.user_rank || 0;
  const foundTier = tiers.find(tier => tier.phase === currentPhase) || tiers[tiers.length - 1];
  const currentThreshold = foundTier?.survivors || 10;
  const [selectedRank, setSelectedRank] = useState(null);

  const selectRank = (rank) => {
    const diff = (userRank - rank + boxSize) % boxSize;
    const totalMinutes = diff * 40;
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const mins = totalMinutes % 60;
    let time = '';
    if (days) time += `${days}d `;
    if (hours) time += `${hours}h `;
    if (mins || !time) time += `${mins}m`;
    setSelectedRank({ rank, time });
  };

  return (
    <section className="network-panel">
      <div className="network-panel-head">
        <div><span className="hub-label">Power ladder</span><h2>Network positions</h2><p>Each cycle reallocates power across the active positions.</p></div>
        <div className="network-info-chip"><ShieldCheck size={14} /> Protected pool <strong>{Math.round(pool).toLocaleString()} ETB</strong></div>
      </div>
      {selectedRank ? (
        <div className="rank-insight"><Clock size={16} /><span>Projected arrival at <strong>rank {selectedRank.rank}</strong></span><strong className="insight-time">{selectedRank.time}</strong><button onClick={() => setSelectedRank(null)} aria-label="Close rank projection">×</button><Info size={14} /></div>
      ) : (
        <div className="rank-helper"><ArrowUpRight size={14} /> Select any active position to estimate its arrival time.</div>
      )}
      <div className="network-ladder">
        {tiers.map((tier) => {
          const isCurrentPhase = tier.phase === currentPhase;
          const isNext = tier.phase === currentPhase + 1;
          const blockCount = tier.survivors;
          const blockSize = tier.phase >= 5 ? 22 : tier.phase >= 3 ? 12 : 7;
          const gapSize = tier.phase >= 5 ? 6 : 3;
          return (
            <div className={`network-tier ${isCurrentPhase ? 'network-tier-current' : ''} ${isNext ? 'network-tier-next' : ''}`} key={tier.phase}>
              <div className="network-tier-meta"><div><span>{tier.label}</span><small>Phase {tier.phase + 1}</small></div><strong>{Math.round(tier.value).toLocaleString()} <small>CB / position</small></strong><em>{tier.survivors} {tier.survivors === 1 ? 'position' : 'positions'}</em></div>
              <div className="network-tier-track">
                {Array.from({ length: blockCount }).map((_, index) => {
                  const rank = index + 1;
                  const isActive = rank <= currentThreshold;
                  const isUser = rank === userRank;
                  const isSelected = selectedRank?.rank === rank;
                  return <button key={rank} aria-label={`Rank ${rank}, ${isActive ? 'active' : 'idle'}`} onClick={() => selectRank(rank)} className={`network-node ${isActive ? 'node-active' : ''} ${isUser ? 'node-user' : ''} ${isSelected ? 'node-selected' : ''}`} style={{ width: blockSize, height: blockSize, marginRight: gapSize }} title={`Rank ${rank}`} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="network-legend"><span><i className="legend-active" /> Active positions</span><span><i className="legend-user" /> Your position</span><span><i className="legend-idle" /> Idle positions</span></div>
    </section>
  );
};

export default PyramidVisualizer;

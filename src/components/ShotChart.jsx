import { useState, useRef } from 'react';
import './ShotChart.css';

function ShotChart({ shots = [], homeName = 'Home', awayName = 'Away', homeAbbr = 'HOU', awayAbbr = 'BOS' }) {
  const [filterType, setFilterType] = useState('ALL');
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [selectedPlayer, setSelectedPlayer] = useState('ALL');
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0 });
  const svgRef = useRef(null);

  // Derive unique player names from real shots
  const players = Array.from(new Set(shots.map((s) => s.player).filter(Boolean)));

  const filteredShots = shots.filter((s) => {
    if (filterType === 'MADE' && !s.made) return false;
    if (filterType === 'MISSED' && s.made) return false;
    if (filterType === '3PT' && !s.type?.includes('3PT')) return false;

    if (selectedTeam !== 'ALL') {
      const matchHome = selectedTeam === homeAbbr && (s.team === 'HOME' || s.team === homeAbbr);
      const matchAway = selectedTeam === awayAbbr && (s.team === 'AWAY' || s.team === awayAbbr);
      if (!matchHome && !matchAway) return false;
    }

    if (selectedPlayer !== 'ALL' && s.player !== selectedPlayer) return false;
    return true;
  });

  const handleMouseEnter = (shot) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = rect.width / 500;
    const scaleY = rect.height / 470;
    setTooltipPos({
      left: shot.x * scaleX + 10,
      top: Math.max(10, shot.y * scaleY - 35)
    });
    setActiveTooltip(shot);
  };

  const handleMouseLeave = () => {
    setActiveTooltip(null);
  };

  const madeCount = shots.filter((s) => s.made).length;
  const missedCount = shots.filter((s) => !s.made).length;

  // Real calculations if shots are present, otherwise blank
  const hasShots = shots.length > 0;
  const calcZone = (condition) => {
    if (!hasShots) return { pct: '—', label: '—' };
    const zoneShots = shots.filter(condition);
    if (zoneShots.length === 0) return { pct: '—', label: '0/0' };
    const zoneMade = zoneShots.filter((s) => s.made).length;
    const pct = ((zoneMade / zoneShots.length) * 100).toFixed(1) + '%';
    return { pct, label: `${zoneMade}/${zoneShots.length}` };
  };

  const raZone = calcZone((s) => Math.hypot(s.x - 250, s.y - 56) <= 50);
  const paintZone = calcZone((s) => Math.abs(s.x - 250) <= 80 && s.y <= 200 && Math.hypot(s.x - 250, s.y - 56) > 50);
  const midZone = calcZone((s) => !s.type?.includes('3PT') && (Math.abs(s.x - 250) > 80 || s.y > 200));
  const threeZone = calcZone((s) => s.type?.includes('3PT'));

  return (
    <div className="shot-chart-wrapper">
      {/* Filters & Team/Player Selectors */}
      <div className="glass-panel shot-chart-controls">
        <div className="shot-filter-group">
          <span style={{ color: 'var(--court-text-muted)', fontWeight: 600 }}>Filter:</span>
          <button
            className={`shot-filter-pill ${filterType === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterType('ALL')}
          >
            All ({shots.length})
          </button>
          <button
            className={`shot-filter-pill ${filterType === 'MADE' ? 'active' : ''}`}
            onClick={() => setFilterType('MADE')}
            style={filterType === 'MADE' ? {} : { color: '#00E676' }}
          >
            ● Made ({madeCount})
          </button>
          <button
            className={`shot-filter-pill ${filterType === 'MISSED' ? 'active' : ''}`}
            onClick={() => setFilterType('MISSED')}
            style={filterType === 'MISSED' ? {} : { color: '#FF3B30' }}
          >
            ✕ Missed ({missedCount})
          </button>
          <button
            className={`shot-filter-pill ${filterType === '3PT' ? 'active' : ''}`}
            onClick={() => setFilterType('3PT')}
          >
            3-Pointers
          </button>
        </div>

        <div className="shot-select-group">
          <select
            className="shot-select"
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
          >
            <option value="ALL">Both Teams</option>
            <option value={awayAbbr}>{awayName}</option>
            <option value={homeAbbr}>{homeName}</option>
          </select>

          <select
            className="shot-select"
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            disabled={players.length === 0}
          >
            <option value="ALL">{players.length === 0 ? 'No players available' : 'All Players'}</option>
            {players.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Court Graphic & Markers */}
      <div className="glass-panel shot-court-container">
        <div className="court-svg-box">
          <svg
            ref={svgRef}
            viewBox="0 0 500 470"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Hardwood Base */}
            <rect x="0" y="0" width="500" height="470" className="court-floor" rx="12" />

            {/* Half Court Outer Boundary */}
            <rect x="10" y="10" width="480" height="450" fill="none" stroke="#25324A" strokeWidth="3" rx="8" />

            {/* The Paint / Key */}
            <rect x="170" y="10" width="160" height="190" className="court-paint" stroke="#364461" strokeWidth="2.5" />

            {/* Free Throw Circle */}
            <circle cx="250" cy="200" r="60" className="court-line" strokeDasharray="6 6" />
            <path d="M 190,200 A 60 60 0 0 0 310,200" className="court-line" />

            {/* Restricted Area Arc */}
            <path d="M 210,50 A 40 40 0 0 0 290,50" className="court-restricted" stroke="#364461" strokeWidth="2" />
            <line x1="210" y1="10" x2="210" y2="50" stroke="#364461" strokeWidth="2" />
            <line x1="290" y1="10" x2="290" y2="50" stroke="#364461" strokeWidth="2" />

            {/* Backboard and Rim */}
            <line x1="220" y1="40" x2="280" y2="40" stroke="#FF5722" strokeWidth="4" />
            <line x1="250" y1="40" x2="250" y2="48" stroke="#FFFFFF" strokeWidth="2.5" />
            <circle cx="250" cy="56" r="9" stroke="#FFB800" strokeWidth="3" fill="none" />

            {/* 3-Point Arc */}
            <line x1="40" y1="10" x2="40" y2="140" className="court-line" />
            <line x1="460" y1="10" x2="460" y2="140" className="court-line" />
            <path d="M 40,140 A 235 235 0 0 0 460,140" className="court-line" stroke="#3D4E6F" />

            {/* Center Court Top Arc */}
            <path d="M 190,460 A 60 60 0 0 1 310,460" className="court-line" />

            {/* Interactive Shot Markers */}
            <g id="shot-markers">
              {filteredShots.map((shot) => {
                if (shot.made) {
                  return (
                    <g
                      key={shot.id}
                      className="shot-marker animate-shot-pop"
                      onMouseEnter={() => handleMouseEnter(shot)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <circle
                        cx={shot.x}
                        cy={shot.y}
                        r="7"
                        fill="#00E676"
                        stroke="#080B11"
                        strokeWidth="2"
                      />
                      <circle
                        cx={shot.x}
                        cy={shot.y}
                        r="2.5"
                        fill="#FFFFFF"
                      />
                    </g>
                  );
                } else {
                  const size = 5.5;
                  return (
                    <g
                      key={shot.id}
                      className="shot-marker animate-shot-pop"
                      onMouseEnter={() => handleMouseEnter(shot)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <line
                        x1={shot.x - size}
                        y1={shot.y - size}
                        x2={shot.x + size}
                        y2={shot.y + size}
                        stroke="#FF3B30"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <line
                        x1={shot.x + size}
                        y1={shot.y - size}
                        x2={shot.x - size}
                        y2={shot.y + size}
                        stroke="#FF3B30"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </g>
                  );
                }
              })}
            </g>
          </svg>

          {/* Hover Tooltip */}
          {activeTooltip && (
            <div
              className="shot-tooltip"
              style={{ left: `${tooltipPos.left}px`, top: `${tooltipPos.top}px` }}
            >
              <div className="shot-tooltip-player">{activeTooltip.player}</div>
              <div className="shot-tooltip-detail">
                {activeTooltip.dist || '—'} {activeTooltip.type || 'Shot'} • Q{activeTooltip.q || '—'} {activeTooltip.time || '—'}
              </div>
              <div className={`shot-tooltip-result ${activeTooltip.made ? 'made' : 'missed'}`}>
                {activeTooltip.made ? `MADE (+${activeTooltip.pts || 2} PTS)` : 'MISSED SHOT'}
              </div>
            </div>
          )}
        </div>

        {!hasShots && (
          <p style={{ marginTop: 12, color: 'var(--court-text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
            Shot chart coordinates will plot live once game begins.
          </p>
        )}

        {/* Zone Breakdown Stats */}
        <div className="shot-zones-grid">
          <div className="shot-zone-card">
            <span className="shot-zone-name">Restricted Area</span>
            <span className="shot-zone-pct" style={{ color: hasShots ? '#00E676' : 'var(--court-text-muted)' }}>
              {raZone.pct}
            </span>
            <span className="shot-zone-stats">{hasShots ? `${raZone.label} FGM` : '—'}</span>
          </div>
          <div className="shot-zone-card">
            <span className="shot-zone-name">Paint (Non-RA)</span>
            <span className="shot-zone-pct" style={{ color: hasShots ? '#FFB800' : 'var(--court-text-muted)' }}>
              {paintZone.pct}
            </span>
            <span className="shot-zone-stats">{hasShots ? `${paintZone.label} FGM` : '—'}</span>
          </div>
          <div className="shot-zone-card">
            <span className="shot-zone-name">Mid-Range</span>
            <span className="shot-zone-pct" style={{ color: hasShots ? '#CBD5E1' : 'var(--court-text-muted)' }}>
              {midZone.pct}
            </span>
            <span className="shot-zone-stats">{hasShots ? `${midZone.label} FGM` : '—'}</span>
          </div>
          <div className="shot-zone-card">
            <span className="shot-zone-name">Corner &amp; 3PT</span>
            <span className="shot-zone-pct" style={{ color: hasShots ? '#00E676' : 'var(--court-text-muted)' }}>
              {threeZone.pct}
            </span>
            <span className="shot-zone-stats">{hasShots ? `${threeZone.label} 3PM` : '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShotChart;

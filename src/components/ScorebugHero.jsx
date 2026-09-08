import './ScorebugHero.css';

function ScorebugHero({ game, latestPlay, scoreFlashing }) {
  if (!game) return null;

  const isLive = game.status === 'LIVE';
  const isFinal = game.status === 'FINAL';
  const isUpcoming = game.status === 'UPCOMING';

  const homeScore = game.homeScore ?? (isUpcoming ? '—' : 0);
  const awayScore = game.awayScore ?? (isUpcoming ? '—' : 0);

  // Use real quarters from API if provided; otherwise show empty/dash
  const hasQuarterData = Array.isArray(game.awayQuarters) && Array.isArray(game.homeQuarters);
  const awayQ = hasQuarterData ? game.awayQuarters : ['—', '—', '—', '—'];
  const homeQ = hasQuarterData ? game.homeQuarters : ['—', '—', '—', '—'];

  const numHome = Number(homeScore);
  const numAway = Number(awayScore);
  const hasScores = !isUpcoming && !isNaN(numHome) && !isNaN(numAway);

  const diff = numHome - numAway;
  let leadText = 'TIED';
  let leadColor = '#FFB800';
  if (diff > 0) {
    leadText = `${game.homeAbbr || 'HOME'} by ${diff}`;
    leadColor = '#00E676';
  } else if (diff < 0) {
    leadText = `${game.awayAbbr || 'AWAY'} by ${Math.abs(diff)}`;
    leadColor = '#00D2FF';
  }

  const possession = game.possession || null;

  return (
    <div className="glass-panel scorebug-hero">
      {/* Subtle Court Watermark */}
      <svg className="scorebug-watermark" viewBox="0 0 100 100" fill="currentColor">
        <circle cx="50" cy="50" r="45" stroke="#FFFFFF" strokeWidth="4" fill="none" />
        <path d="M 5,50 H 95 M 50,5 V 95" stroke="#FFFFFF" strokeWidth="4" />
      </svg>

      {/* Top Status Row */}
      <div className="scorebug-top-row">
        <div className="scorebug-status-group">
          <span className={`scorebug-status-badge ${isFinal ? 'final' : isUpcoming ? 'upcoming' : ''}`}>
            {isLive && (
              <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
                <span
                  style={{
                    animation: 'pulseGlow 1s infinite',
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: '#FF3B30',
                    opacity: 0.75
                  }}
                />
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF3B30' }} />
              </span>
            )}
            <span>{isLive ? (game.quarter || 'LIVE') : isFinal ? 'FINAL' : 'UPCOMING'}</span>
          </span>

          <div className="scorebug-clock">
            {isLive ? (game.time || '00:00') : isFinal ? 'Final' : (game.quarter || 'Scheduled')}
          </div>

          {isLive && typeof game.shotClock === 'number' && (
            <div className="scorebug-shotclock">
              <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>SHOT</span>
              <span>{game.shotClock}s</span>
            </div>
          )}
        </div>

        <div className="scorebug-broadcast">
          <span className="hidden-mobile">{game.arena || ''}</span>
          <span className="scorebug-tv-badge">NBA Broadcast</span>
        </div>
      </div>

      {/* Center Matchup Row */}
      <div className="scorebug-matchup-grid">
        {/* Away Team */}
        <div className="scorebug-team-side">
          <div
            className="scorebug-team-badge"
            style={{
              background: `${game.awayColor || '#FF5722'}25`,
              borderColor: `${game.awayColor || '#FF5722'}50`,
              color: game.awayColor || '#FF5722'
            }}
          >
            {game.awayAbbr || 'AWAY'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h2 className="scorebug-team-name">{game.away}</h2>
              {possession === 'AWAY' && <span className="scorebug-possession-dot" title="Current Possession" />}
            </div>
            {game.awayRecord && (
              <p className="scorebug-team-record">
                {game.awayRecord} {game.awayConference ? `• ${game.awayConference}` : ''}
              </p>
            )}

            {typeof game.awayTimeouts === 'number' && (
              <div className="scorebug-team-indicators">
                <div className="scorebug-timeouts" title="Timeouts remaining">
                  <span style={{ color: 'var(--court-text-muted)', marginRight: 2 }}>TOL:</span>
                  <span className={`scorebug-to-bar ${game.awayTimeouts < 1 ? 'spent' : ''}`} />
                  <span className={`scorebug-to-bar ${game.awayTimeouts < 2 ? 'spent' : ''}`} />
                  <span className={`scorebug-to-bar ${game.awayTimeouts < 3 ? 'spent' : ''}`} />
                </div>
                {game.awayBonus && <span className="scorebug-bonus-badge">BONUS</span>}
              </div>
            )}
          </div>
        </div>

        {/* Center Tabular Score */}
        <div className="scorebug-center-score">
          <div className={`scorebug-numbers-row ${scoreFlashing ? 'animate-score-flash' : ''}`}>
            <span>{isUpcoming ? '—' : awayScore}</span>
            <span className="scorebug-score-sep">-</span>
            <span>{isUpcoming ? '—' : homeScore}</span>
          </div>
          {hasScores && (
            <span className="scorebug-lead-pill" style={{ color: leadColor, borderColor: `${leadColor}40` }}>
              {leadText}
            </span>
          )}
        </div>

        {/* Home Team */}
        <div className="scorebug-team-side home">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
              {possession === 'HOME' && <span className="scorebug-possession-dot" title="Current Possession" />}
              <h2 className="scorebug-team-name">{game.home}</h2>
            </div>
            {game.homeRecord && (
              <p className="scorebug-team-record">
                {game.homeRecord} {game.homeConference ? `• ${game.homeConference}` : ''}
              </p>
            )}

            {typeof game.homeTimeouts === 'number' && (
              <div className="scorebug-team-indicators">
                {game.homeBonus && <span className="scorebug-bonus-badge">BONUS</span>}
                <div className="scorebug-timeouts" title="Timeouts remaining">
                  <span className={`scorebug-to-bar ${game.homeTimeouts < 1 ? 'spent' : ''}`} />
                  <span className={`scorebug-to-bar ${game.homeTimeouts < 2 ? 'spent' : ''}`} />
                  <span className={`scorebug-to-bar ${game.homeTimeouts < 3 ? 'spent' : ''}`} />
                  <span style={{ color: 'var(--court-text-muted)', marginLeft: 2 }}>TOL</span>
                </div>
              </div>
            )}
          </div>

          <div
            className="scorebug-team-badge"
            style={{
              background: `${game.homeColor || '#FF5722'}25`,
              borderColor: `${game.homeColor || '#FF5722'}50`,
              color: game.homeColor || '#FF5722'
            }}
          >
            {game.homeAbbr || 'HOME'}
          </div>
        </div>
      </div>

      {/* Line Score Table (Quarter by Quarter) */}
      {!isUpcoming && hasScores && (
        <div className="scorebug-linescore-wrapper">
          <table className="scorebug-linescore-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left', paddingLeft: 4 }}>Team</th>
                <th>Q1</th>
                <th>Q2</th>
                <th>Q3</th>
                <th style={{ color: '#FFFFFF' }}>Q4</th>
                <th>OT</th>
                <th style={{ textAlign: 'right', paddingRight: 4, color: '#FFFFFF' }}>T</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="team-cell">{game.awayAbbr || ''} {game.away}</td>
                <td>{awayQ[0]}</td>
                <td>{awayQ[1]}</td>
                <td>{awayQ[2]}</td>
                <td className={hasQuarterData ? 'active-q' : ''}>{awayQ[3]}</td>
                <td style={{ color: 'var(--court-subtle)' }}>-</td>
                <td className="total-cell">{awayScore}</td>
              </tr>
              <tr>
                <td className="team-cell">{game.homeAbbr || ''} {game.home}</td>
                <td>{homeQ[0]}</td>
                <td>{homeQ[1]}</td>
                <td>{homeQ[2]}</td>
                <td className={hasQuarterData ? 'active-q' : ''}>{homeQ[3]}</td>
                <td style={{ color: 'var(--court-subtle)' }}>-</td>
                <td className="total-cell">{homeScore}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Latest Play / Momentum Banner */}
      {latestPlay && latestPlay.text && (
        <div className="scorebug-momentum-banner">
          <div className="scorebug-momentum-text-box">
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--court-accent)',
                animation: 'pulseGlow 1s infinite',
                flexShrink: 0
              }}
            />
            <span className="scorebug-momentum-tag">LATEST PLAY:</span>
            <p className="scorebug-momentum-desc">{latestPlay.text}</p>
          </div>
          <span className="scorebug-momentum-time">{latestPlay.time || ''}</span>
        </div>
      )}
    </div>
  );
}

export default ScorebugHero;

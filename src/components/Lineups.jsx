import './Lineups.css';

function Lineups({ homeTeamName, awayTeamName, homeRoster = [], awayRoster = [], homeColor, awayColor, onSelectPlayer }) {
  // Take first 5 or starters
  const homeFive = Array.isArray(homeRoster) ? homeRoster.slice(0, 5) : [];
  const awayFive = Array.isArray(awayRoster) ? awayRoster.slice(0, 5) : [];

  const renderCard = (p, teamName, color) => {
    const rating = typeof p.rating === 'number' ? p.rating : null;
    let ratingClass = 'rating-mid';
    if (rating !== null) {
      if (rating >= 8.0) ratingClass = 'rating-high';
      else if (rating < 6.8) ratingClass = 'rating-low';
    }

    const pm = typeof p.pm === 'number' ? p.pm : null;

    return (
      <div
        key={p.name}
        className="oncourt-player-card"
        onClick={() => onSelectPlayer && onSelectPlayer(p, teamName)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            className="oncourt-jersey-box"
            style={{
              background: `${color || '#FF5722'}25`,
              color: color || '#FF5722',
              borderColor: `${color || '#FF5722'}50`
            }}
          >
            {p.num || p.number || '—'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="oncourt-player-name">{p.name}</span>
              {rating !== null && (
                <span className={`rating-badge ${ratingClass}`}>{rating.toFixed(1)}</span>
              )}
            </div>
            <span className="oncourt-player-meta">
              {p.pos || 'F'} {p.pf !== undefined ? `• ${p.pf}F` : ''} {p.min ? `• ${p.min}` : ''}
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#FFFFFF' }}>
            {p.pts !== undefined ? `${p.pts} PTS` : '—'}
          </div>
          {pm !== null && (
            <div style={{ fontSize: '0.7rem', color: pm >= 0 ? '#00E676' : '#FF3B30' }}>
              {pm >= 0 ? `+${pm}` : pm}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="lineups-grid">
      {/* Away Team 5 */}
      <div className="glass-panel lineups-panel">
        <div className="lineups-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: awayColor || '#FF5722'
              }}
            />
            <h3>{awayTeamName} • On-Court 5</h3>
          </div>
          <span className="lineups-status-badge">ON FLOOR</span>
        </div>

        <div className="lineups-list">
          {awayFive.length > 0 ? (
            awayFive.map((p) => renderCard(p, awayTeamName, awayColor))
          ) : (
            <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--court-text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
              Lineup data will be available on tip-off.
            </div>
          )}
        </div>
      </div>

      {/* Home Team 5 */}
      <div className="glass-panel lineups-panel">
        <div className="lineups-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: homeColor || '#FF5722'
              }}
            />
            <h3>{homeTeamName} • On-Court 5</h3>
          </div>
          <span className="lineups-status-badge">ON FLOOR</span>
        </div>

        <div className="lineups-list">
          {homeFive.length > 0 ? (
            homeFive.map((p) => renderCard(p, homeTeamName, homeColor))
          ) : (
            <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--court-text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
              Lineup data will be available on tip-off.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Lineups;

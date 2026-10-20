import { useEffect } from 'react';
import './PlayerModal.css';

function PlayerModal({ player, teamName, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!player) return null;

  const initials = player.name
    ? player.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
    : '—';

  const hasRating = typeof player.rating === 'number';
  const rating = hasRating ? player.rating : null;

  const hasPM = typeof player.pm === 'number';
  const plusMinus = hasPM ? player.pm : null;

  const hasFG = player.fga > 0;
  const fgPct = hasFG ? ((player.fgm / player.fga) * 100).toFixed(1) : null;

  let ratingClass = 'rating-mid';
  if (rating !== null) {
    if (rating >= 8.0) ratingClass = 'rating-high';
    else if (rating < 6.8) ratingClass = 'rating-low';
  }

  const pie = typeof player.pie === 'number' ? player.pie.toFixed(1) : null;

  return (
    <div className="player-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="player-modal-title">
      <div className="glass-panel player-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="player-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {player.image ? (
              <img
                src={player.image}
                alt={player.name}
                className="player-avatar"
                style={{ objectFit: 'cover' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="player-avatar">{initials}</div>
            )}
            <div className="player-title-block">
              <h3 id="player-modal-title">{player.name}</h3>
              <div className="player-title-meta">
                {teamName || player.team || 'Player'} • #{player.num || player.number || player.jersey_number || '—'} • {player.pos || player.position || '—'}
              </div>
            </div>
          </div>
          <button className="player-close-btn" onClick={onClose} aria-label="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Top 3 Impact Metrics */}
        <div className="player-metrics-grid">
          <div className="player-metric-card">
            <span className="player-metric-label">Impact Rating</span>
            {rating !== null ? (
              <span className={`rating-badge ${ratingClass} player-metric-value`} style={{ margin: '0 auto', fontSize: '1.05rem', padding: '2px 8px' }}>
                {rating.toFixed(1)}
              </span>
            ) : (
              <span className="player-metric-value" style={{ color: 'var(--court-text-muted)' }}>—</span>
            )}
          </div>

          <div className="player-metric-card">
            <span className="player-metric-label">Live Impact (+/-)</span>
            <span
              className="player-metric-value"
              style={{
                color: plusMinus !== null ? (plusMinus > 0 ? '#00E676' : plusMinus < 0 ? '#FF3B30' : '#8E9BAE') : 'var(--court-text-muted)'
              }}
            >
              {plusMinus !== null ? (plusMinus > 0 ? `+${plusMinus}` : plusMinus) : '—'}
            </span>
          </div>

          <div className="player-metric-card">
            <span className="player-metric-label">PIE Efficiency</span>
            <span className="player-metric-value" style={{ color: pie !== null ? '#FFB800' : 'var(--court-text-muted)' }}>
              {pie !== null ? `${pie}%` : '—'}
            </span>
          </div>
        </div>

        {/* Performance Splits */}
        <div className="player-splits-box">
          <span className="player-splits-title">Game Performance Splits</span>
          <div className="player-splits-grid">
            <div>
              <span className="player-split-lbl">PTS</span>
              <span className="player-split-val">{player.pts ?? (player.ppg !== undefined ? player.ppg : '—')}</span>
            </div>
            <div>
              <span className="player-split-lbl">REB</span>
              <span className="player-split-val">{player.reb ?? (player.rpg !== undefined ? player.rpg : '—')}</span>
            </div>
            <div>
              <span className="player-split-lbl">AST</span>
              <span className="player-split-val">{player.ast ?? (player.apg !== undefined ? player.apg : '—')}</span>
            </div>
            <div>
              <span className="player-split-lbl">MIN</span>
              <span className="player-split-val">{player.min || (player.height ? `${player.height}` : '—')}</span>
            </div>
          </div>
        </div>

        {/* Bio & Draft Specs (BallDontLie NBA API) */}
        {(player.college || player.draft_year || player.height || player.country) && (
          <div className="player-splits-box" style={{ marginTop: '-4px' }}>
            <span className="player-splits-title">Bio & Draft Specs</span>
            <div className="player-splits-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div>
                <span className="player-split-lbl">Height / Weight</span>
                <span className="player-split-val" style={{ fontSize: '0.82rem' }}>
                  {player.height || '—'} {player.weight && player.weight !== '—' ? `• ${player.weight} lbs` : ''}
                </span>
              </div>
              <div>
                <span className="player-split-lbl">College / Origin</span>
                <span className="player-split-val" style={{ fontSize: '0.82rem' }}>
                  {player.college && player.college !== '—' ? player.college : (player.country || '—')}
                </span>
              </div>
              <div>
                <span className="player-split-lbl">Draft</span>
                <span className="player-split-val" style={{ fontSize: '0.82rem' }}>
                  {player.draft_year ? `${player.draft_year} R${player.draft_round || 1} #${player.draft_number || '—'}` : 'Undrafted'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="player-modal-footer">
          <span>
            Field Goals: {player.fgm !== undefined ? player.fgm : '—'}/{player.fga !== undefined ? player.fga : '—'} ({fgPct ? `${fgPct}%` : '—%'})
          </span>
          <span className="player-active-pill">On-Court Active</span>
        </div>
      </div>
    </div>
  );
}

export default PlayerModal;

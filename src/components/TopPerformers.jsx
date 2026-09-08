import './TopPerformers.css';

function TopPerformers({ performers = [], onSelectPlayer }) {
  const hasPerformers = Array.isArray(performers) && performers.length > 0;

  return (
    <div className="glass-panel top-performers-card">
      <div className="top-performers-header">
        <h3>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#FFB800">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span>Top Performers</span>
        </h3>
        <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--court-text-muted)' }}>
          PIE &amp; +/-
        </span>
      </div>

      <div className="top-performers-list">
        {hasPerformers ? (
          performers.map((p) => {
            const initials = p.name
              ? p.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
              : '—';

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
                className="performer-row"
                onClick={() => onSelectPlayer && onSelectPlayer(p, p.team)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    className="performer-avatar"
                    style={{ borderColor: p.color || '#FF5722', color: p.color || '#FF5722' }}
                  >
                    {initials}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="performer-name">{p.name}</span>
                      {rating !== null && (
                        <span className={`rating-badge ${ratingClass}`}>{rating.toFixed(1)}</span>
                      )}
                    </div>
                    <div className="performer-meta">
                      {p.team || ''} {p.pos ? `• ${p.pos}` : ''}
                    </div>
                  </div>
                </div>

                <div className="performer-stats">
                  <div className="performer-pts">{p.pts ?? '—'} PTS</div>
                  <div className="performer-sub">
                    {p.reb !== undefined ? `${p.reb} REB` : ''} {p.ast !== undefined ? `• ${p.ast} AST` : ''} {pm !== null ? (pm >= 0 ? `• +${pm}` : `• ${pm}`) : ''}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--court-text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
            Top performers will appear once game statistics accumulate.
          </div>
        )}
      </div>
    </div>
  );
}

export default TopPerformers;

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useFighterPhoto } from '../../utils/useFighterPhoto';
import './UFC.css';

function UFCFighterDetail() {
  const { fighterId } = useParams();
  const [fighter, setFighter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/ufc/fighters/${encodeURIComponent(fighterId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled && data && !data.error) {
          setFighter(data);
          setLoading(false);
        } else if (!cancelled) {
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [fighterId]);

  const photoUrl = useFighterPhoto(fighter?.name || '');

  if (loading) {
    return (
      <main className="page-layout">
        <section className="page-content">
          <div className="container">
            <div className="empty-state">
              <div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🥊</div>
              <p className="empty-state-text">Loading fighter profile...</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!fighter) {
    return (
      <main className="page-layout">
        <section className="page-content">
          <div className="container">
            <div className="empty-state">
              <div className="empty-state-icon">❌</div>
              <p className="empty-state-text">Fighter not found</p>
              <Link to="/ufc/fighters" style={{ color: 'var(--court-accent)', marginTop: '12px', display: 'inline-block' }}>
                ← Back to UFC Fighters
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const formatPct = (val) => {
    if (val === null || val === undefined) return '--';
    const num = typeof val === 'number' ? val : parseFloat(val);
    return `${Math.round(num * 100)}%`;
  };

  const formatNum = (val) => {
    if (val === null || val === undefined) return '--';
    return Number(val).toFixed(2);
  };

  return (
    <main className="page-layout">
      {/* Hero Header */}
      <section className="ufc-fighter-detail-hero">
        <div className="container">
          <Link
            to="/ufc/fighters"
            style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '20px' }}
          >
            ← Back to UFC Fighters
          </Link>

          <div className="ufc-fighter-hero-content">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={fighter.name}
                className="ufc-fighter-detail-avatar"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="ufc-fighter-detail-avatar-placeholder">🥊</div>
            )}

            <div className="ufc-fighter-title-row" style={{ flex: 1 }}>
              {fighter.nickname && <div className="ufc-fighter-nickname">"{fighter.nickname}"</div>}
              <h1 className="ufc-fighter-main-name">{fighter.name}</h1>

              <div className="ufc-fighter-badges">
                <span className="ufc-pill" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 900 }}>
                  {fighter.record || `${fighter.wins || 0}-${fighter.losses || 0}-${fighter.draws || 0}`}
                </span>
                <span className="ufc-pill">{fighter.division || fighter.weight_class || 'UFC'}</span>
                {fighter.is_champion && <span className="ufc-pill champ">👑 UFC Champion</span>}
                {fighter.status && <span className="ufc-pill">{fighter.status}</span>}
              </div>

              <div style={{ marginTop: '16px' }}>
                <Link
                  to={`/ufc/compare?f1=${fighter.id}`}
                  className="ufc-pill"
                  style={{ background: '#ffffff', color: '#000000', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  ⚔️ Compare With Another Fighter
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="page-content">
        <div className="container">
          {/* Tale of the Tape */}
          <h2 className="section-title" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Tale of the Tape</h2>
          <div className="ufc-tale-tape-grid">
            <div className="ufc-tape-item">
              <div className="ufc-tape-label">Height</div>
              <div className="ufc-tape-val">{fighter.height || '--'}</div>
            </div>
            <div className="ufc-tape-item">
              <div className="ufc-tape-label">Weight</div>
              <div className="ufc-tape-val">{fighter.weight || '--'}</div>
            </div>
            <div className="ufc-tape-item">
              <div className="ufc-tape-label">Reach</div>
              <div className="ufc-tape-val">{fighter.reach || '--'}</div>
            </div>
            <div className="ufc-tape-item">
              <div className="ufc-tape-label">Stance</div>
              <div className="ufc-tape-val">{fighter.stance || 'Orthodox'}</div>
            </div>
            {fighter.age && (
              <div className="ufc-tape-item">
                <div className="ufc-tape-label">Age</div>
                <div className="ufc-tape-val">{fighter.age} yrs</div>
              </div>
            )}
            {fighter.country && (
              <div className="ufc-tape-item">
                <div className="ufc-tape-label">Origin</div>
                <div className="ufc-tape-val">{fighter.country}</div>
              </div>
            )}
          </div>

          {/* Career Striking & Grappling Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '32px' }}>
            {/* Striking Card */}
            <div className="ufc-leaderboard-card">
              <div className="ufc-leaderboard-title">
                <span>🥊 Striking Statistics</span>
              </div>
              <div className="ufc-stat-boxes">
                <div className="ufc-stat-box">
                  <div className="ufc-stat-box-num">{formatNum(fighter.slpm)}</div>
                  <div className="ufc-stat-box-lbl">Strikes Landed/Min</div>
                </div>
                <div className="ufc-stat-box">
                  <div className="ufc-stat-box-num">{formatPct(fighter.str_acc)}</div>
                  <div className="ufc-stat-box-lbl">Strike Accuracy</div>
                </div>
                <div className="ufc-stat-box">
                  <div className="ufc-stat-box-num">{formatNum(fighter.sapm)}</div>
                  <div className="ufc-stat-box-lbl">Strikes Absorbed/Min</div>
                </div>
                <div className="ufc-stat-box">
                  <div className="ufc-stat-box-num">{formatPct(fighter.str_def)}</div>
                  <div className="ufc-stat-box-lbl">Strike Defense</div>
                </div>
              </div>
            </div>

            {/* Grappling Card */}
            <div className="ufc-leaderboard-card">
              <div className="ufc-leaderboard-title">
                <span>🤼 Grappling Statistics</span>
              </div>
              <div className="ufc-stat-boxes">
                <div className="ufc-stat-box">
                  <div className="ufc-stat-box-num">{formatNum(fighter.td_avg)}</div>
                  <div className="ufc-stat-box-lbl">Takedowns / 15m</div>
                </div>
                <div className="ufc-stat-box">
                  <div className="ufc-stat-box-num">{formatPct(fighter.td_acc)}</div>
                  <div className="ufc-stat-box-lbl">Takedown Accuracy</div>
                </div>
                <div className="ufc-stat-box">
                  <div className="ufc-stat-box-num">{formatPct(fighter.td_def)}</div>
                  <div className="ufc-stat-box-lbl">Takedown Defense</div>
                </div>
                <div className="ufc-stat-box">
                  <div className="ufc-stat-box-num">{formatNum(fighter.sub_avg)}</div>
                  <div className="ufc-stat-box-lbl">Submissions / 15m</div>
                </div>
              </div>
            </div>
          </div>

          {/* Fight History */}
          {fighter.fights && fighter.fights.length > 0 && (
            <div style={{ marginTop: '40px' }}>
              <h2 className="section-title" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Fight History</h2>
              <p className="section-subtitle">{fighter.fights.length} career bouts recorded</p>

              <div className="ufc-fight-card" style={{ marginTop: '16px' }}>
                {fighter.fights.map((fight, i) => (
                  <div className="ufc-bout-card" key={i}>
                    <div style={{ width: '60px', fontWeight: 800, color: fight.result === 'win' || fight.result === 'Win' ? '#52c41a' : '#ff4d4f' }}>
                      {fight.result ? fight.result.toUpperCase() : '--'}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>
                        vs. {fight.opponent || fight.fighter2 || 'Opponent'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--court-text-muted)' }}>
                        {fight.event || 'UFC Event'} {fight.date ? `• ${fight.date}` : ''}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e5e5e5' }}>
                        {fight.method || 'Decision'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--court-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {fight.round ? `Round ${fight.round}` : ''} {fight.time || ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default UFCFighterDetail;

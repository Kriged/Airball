import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './NFL.css';

function NFLGameDetail() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/nfl/games/${gameId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d && !d.error) { setGame(d); setLoading(false); } else if (!cancelled) setLoading(false); })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [gameId]);

  if (loading) {
    return (
      <main className="page-layout">
        <section className="page-content"><div className="container">
          <div className="empty-state">
            <div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🏈</div>
            <p className="empty-state-text">Loading game details...</p>
          </div>
        </div></section>
      </main>
    );
  }

  if (!game) {
    return (
      <main className="page-layout">
        <section className="page-content"><div className="container">
          <div className="empty-state">
            <div className="empty-state-icon">❌</div>
            <p className="empty-state-text">Game not found</p>
            <Link to="/nfl/games" style={{ color: 'var(--court-accent)', marginTop: '12px', display: 'inline-block' }}>← Back to NFL Games</Link>
          </div>
        </div></section>
      </main>
    );
  }

  return (
    <main className="page-layout">
      {/* Scoreboard Hero */}
      <section style={{ background: 'linear-gradient(135deg, #013369 0%, #0a1628 100%)', padding: '48px 0 32px', borderBottom: '1px solid var(--court-border)' }}>
        <div className="container">
          <Link to="/nfl/games" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
            ← Back to NFL Games
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px', padding: '20px 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{game.awayAbbr}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{game.away}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: game.awayScore > game.homeScore ? 'var(--court-gold)' : '#FFFFFF', marginTop: '8px' }}>
                {game.awayScore}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span className={`game-status ${game.status.toLowerCase()}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>{game.status}</span>
              <div style={{ fontSize: '0.75rem', color: 'var(--court-text-muted)', marginTop: '8px' }}>{game.quarter}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{game.homeAbbr}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{game.home}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: game.homeScore > game.awayScore ? 'var(--court-gold)' : '#FFFFFF', marginTop: '8px' }}>
                {game.homeScore}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--court-text-muted)' }}>
            {game.arena} • {game.date}
          </div>
        </div>
      </section>

      {/* Game Detail Content */}
      <section className="page-content">
        <div className="container">
          {/* Quarter Line Score */}
          {game.lineScore && game.lineScore.length > 0 && (
            <div style={{ marginBottom: '36px' }}>
              <h2 className="section-title" style={{ fontSize: '1.2rem' }}>Line Score</h2>
              <div className="data-table-wrapper">
                <table className="nfl-line-score data-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Team</th>
                      {game.lineScore[0]?.periods?.map((_, i) => (
                        <th key={i}>Q{i + 1}</th>
                      ))}
                      <th>T</th>
                    </tr>
                  </thead>
                  <tbody>
                    {game.lineScore.map(team => (
                      <tr key={team.abbr}>
                        <td className="team-name-cell">{team.abbr}</td>
                        {team.periods.map((score, i) => (
                          <td key={i}>{score}</td>
                        ))}
                        <td className="total-cell">{team.periods.reduce((a, b) => a + b, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Scoring Plays */}
          {game.scoringSummary && game.scoringSummary.length > 0 && (
            <div>
              <h2 className="section-title" style={{ fontSize: '1.2rem' }}>Scoring Plays</h2>
              <p className="section-subtitle">Drive-by-drive scoring timeline</p>
              <div className="nfl-scoring-timeline">
                {game.scoringSummary.map((play, i) => (
                  <div className="scoring-play" key={i}>
                    <span className="scoring-play-quarter">Q{play.quarter}</span>
                    <div className="scoring-play-info">
                      <div className="scoring-play-team">{play.team} • {play.time}</div>
                      <div className="scoring-play-text">{play.text}</div>
                    </div>
                    <span className="scoring-play-score">{play.awayScore}-{play.homeScore}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback if no detailed data */}
          {(!game.lineScore || game.lineScore.length === 0) && (!game.scoringSummary || game.scoringSummary.length === 0) && (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p className="empty-state-text">Detailed scoring data will be available once the game starts</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default NFLGameDetail;

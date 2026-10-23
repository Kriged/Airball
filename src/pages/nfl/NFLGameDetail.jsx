import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTeamLogos } from '../../utils/useTeamLogos';
import NFLDriveTracker from '../../components/NFLDriveTracker';
import { useTimezone } from '../../context/useTimezone';
import { cachedResponseFetch } from '../../utils/cache';
import './NFL.css';

function NFLGameDetail() {
  const { formatTime, formatDate, formatDateTime } = useTimezone();
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const teamLogos = useTeamLogos('nfl');

  useEffect(() => {
    let cancelled = false;
    cachedResponseFetch(`/api/nfl/games/${gameId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d && !d.error) { setGame(d); setLoading(false); } else if (!cancelled) setLoading(false); })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [gameId]);

  useEffect(() => {
    if (!game || game.status !== 'UPCOMING') return undefined;

    let cancelled = false;
    Promise.all([
      cachedResponseFetch(`/api/nfl/team/${game.awayAbbr}/info`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      cachedResponseFetch(`/api/nfl/team/${game.homeAbbr}/info`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([away, home]) => {
      if (!cancelled) setTeamStats({ away, home });
    });

    return () => { cancelled = true; };
  }, [game]);

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
      <section className="nfl-game-detail-hero">
        <div className="container">
          <Link to="/nfl/games" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
            ← Back to NFL Games
          </Link>
          <div className="nfl-detail-matchup-grid">
            <div className="nfl-detail-team-block">
              {teamLogos[game.awayAbbr] && (
                <div style={{ marginBottom: '8px' }}>
                  <img src={teamLogos[game.awayAbbr]} alt="" style={{ width: '44px', height: '44px', objectFit: 'contain' }} onError={(e) => e.currentTarget.style.display = 'none'} />
                </div>
              )}
              <div className="nfl-detail-team-abbr">{game.awayAbbr}</div>
              <div className="nfl-detail-team-name">{game.away}</div>
              <div className={`nfl-detail-team-score ${game.awayScore > game.homeScore ? 'leader' : ''}`}>
                {game.awayScore}
              </div>
            </div>
            <div className="nfl-detail-status-block">
              <span className={`game-status ${game.status.toLowerCase()}`} style={{ fontSize: '0.82rem', padding: '5px 12px' }}>{game.status}</span>
              <div style={{ fontSize: '0.75rem', color: 'var(--court-text-muted)', marginTop: '6px' }}>
                {game.status === 'UPCOMING' ? formatTime(game, { includeDay: true }) : game.quarter}
              </div>
            </div>
            <div className="nfl-detail-team-block">
              {teamLogos[game.homeAbbr] && (
                <div style={{ marginBottom: '8px' }}>
                  <img src={teamLogos[game.homeAbbr]} alt="" style={{ width: '44px', height: '44px', objectFit: 'contain' }} onError={(e) => e.currentTarget.style.display = 'none'} />
                </div>
              )}
              <div className="nfl-detail-team-abbr">{game.homeAbbr}</div>
              <div className="nfl-detail-team-name">{game.home}</div>
              <div className={`nfl-detail-team-score ${game.homeScore > game.awayScore ? 'leader' : ''}`}>
                {game.homeScore}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--court-text-muted)', marginTop: '8px' }}>
            {game.arena} • {game.status === 'UPCOMING' ? formatDateTime(game, { includeWeekday: true, includeYear: true }) : formatDate(game, { includeWeekday: true, includeYear: true })}
          </div>
        </div>
      </section>

      {/* Game Detail Content */}
      <section className="page-content">
        <div className="container">
          <NFLDriveTracker drive={game.currentDrive} game={game} />

          {/* Upcoming games do not have a useful line score yet. Show both teams' season context instead. */}
          {game.status === 'UPCOMING' && (
            <section className="nfl-season-preview">
              <div className="nfl-season-preview-heading">
                <div>
                  <p>Upcoming matchup</p>
                  <h2>Season Snapshot</h2>
                </div>
                <span>Team form before kickoff</span>
              </div>
              {teamStats ? (
                <div className="nfl-season-comparison">
                  {[
                    { side: 'away', label: 'Away', team: teamStats.away, fallback: game.awayAbbr },
                    { side: 'home', label: 'Home', team: teamStats.home, fallback: game.homeAbbr },
                  ].map(({ side, label, team, fallback }) => (
                    <article className={`nfl-season-team ${side}`} key={side}>
                      <span className="nfl-season-team-label">{label}</span>
                      <h3>{team?.abbr || fallback}</h3>
                      <p className="nfl-season-team-name">{team?.name || (side === 'away' ? game.away : game.home)}</p>
                      <div className="nfl-season-record">
                        <strong>{team ? `${team.wins}-${team.losses}${team.ties > 0 ? `-${team.ties}` : ''}` : '—'}</strong>
                        <span>Record</span>
                      </div>
                      <dl>
                        <div><dt>Win %</dt><dd>{team?.pct || '—'}</dd></div>
                        <div><dt>Streak</dt><dd>{team?.streak || '—'}</dd></div>
                        <div><dt>Points for</dt><dd>{team?.pf ?? '—'}</dd></div>
                        <div><dt>Points against</dt><dd>{team?.pa ?? '—'}</dd></div>
                        <div><dt>Conference</dt><dd>{team?.conference || '—'}</dd></div>
                        <div><dt>Seed</dt><dd>{team?.rank > 0 ? `#${team.rank}` : '—'}</dd></div>
                      </dl>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="nfl-season-preview-loading">Loading both teams’ season stats…</div>
              )}
            </section>
          )}

          {/* Quarter Line Score */}
          {game.status !== 'UPCOMING' && game.lineScore && game.lineScore.length > 0 && (
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
                        <td className="team-name-cell">
                          {teamLogos[team.abbr] && <img src={teamLogos[team.abbr]} alt="" className="table-team-logo" onError={(e) => e.currentTarget.style.display = 'none'} />}
                          {team.abbr}
                        </td>
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
          {game.status !== 'UPCOMING' && (!game.lineScore || game.lineScore.length === 0) && (!game.scoringSummary || game.scoringSummary.length === 0) && (
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

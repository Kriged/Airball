import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './GameDetail.css';

function GameDetail() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [boxScore, setBoxScore] = useState({ home: [], away: [] });
  const [playByPlay, setPlayByPlay] = useState([]);
  const [activeTab, setActiveTab] = useState('boxscore');
  const [activeTeam, setActiveTeam] = useState('away');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Fetch game info from the games list
    fetch('/api/games')
      .then((res) => res.json())
      .then((games) => {
        const found = games.find((g) => String(g.id) === String(gameId));
        if (found) {
          setGame(found);
        } else {
          setError('Game not found');
        }
      })
      .catch(() => setError('Failed to load game info'));

    // Fetch box score
    fetch(`/api/games/${gameId}/boxscore`)
      .then((res) => res.json())
      .then((data) => setBoxScore(data || { home: [], away: [] }))
      .catch(() => {});

    // Fetch play by play
    fetch(`/api/games/${gameId}/playbyplay`)
      .then((res) => res.json())
      .then((data) => {
        setPlayByPlay(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [gameId]);

  if (error) {
    return (
      <main className="page-layout">
        <div className="page-content" style={{ paddingTop: 'calc(var(--nav-height) + 60px)' }}>
          <div className="container">
            <div className="empty-state">
              <div className="empty-state-icon">❌</div>
              <p className="empty-state-text">{error}</p>
              <Link to="/games" className="gd-back-btn" style={{ marginTop: 24, display: 'inline-flex' }}>
                ← Back to Games
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (loading || !game) {
    return (
      <main className="page-layout">
        <div className="page-content" style={{ paddingTop: 'calc(var(--nav-height) + 60px)' }}>
          <div className="container">
            <div className="empty-state">
              <div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🏀</div>
              <p className="empty-state-text">Loading game details...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const isFinished = game.status === 'Final';
  const homeWon = game.homeScore > game.awayScore;
  const awayWon = game.awayScore > game.homeScore;

  const currentRoster = activeTeam === 'home' ? boxScore.home : boxScore.away;
  const currentTeamName = activeTeam === 'home' ? game.home : game.away;
  const otherTeamName = activeTeam === 'home' ? game.away : game.home;

  // Find top performer per team
  const getTopScorer = (roster) => {
    if (!roster || roster.length === 0) return null;
    return roster.reduce((top, p) => (p.pts > (top?.pts || 0) ? p : top), roster[0]);
  };

  const homeTop = getTopScorer(boxScore.home);
  const awayTop = getTopScorer(boxScore.away);

  // Calculate team totals
  const getTeamTotals = (roster) => {
    if (!roster || roster.length === 0) return { pts: 0, reb: 0, ast: 0, fgm: 0, fga: 0 };
    return roster.reduce(
      (acc, p) => ({
        pts: acc.pts + (p.pts || 0),
        reb: acc.reb + (p.reb || 0),
        ast: acc.ast + (p.ast || 0),
        fgm: acc.fgm + (p.fgm || 0),
        fga: acc.fga + (p.fga || 0),
      }),
      { pts: 0, reb: 0, ast: 0, fgm: 0, fga: 0 }
    );
  };

  const homeTotals = getTeamTotals(boxScore.home);
  const awayTotals = getTeamTotals(boxScore.away);

  return (
    <main className="page-layout">
      {/* Scoreboard Header */}
      <section className="gd-header">
        <div className="gd-header-bg" />
        <div className="container gd-header-content">
          <Link to="/games" className="back-link" id="back-to-games">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M16 10H4M4 10L9 5M4 10L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Back to Games</span>
          </Link>

          <div className="gd-date">{game.date} • {game.arena}</div>

          <div className="gd-scoreboard">
            <div className={`gd-team-side ${isFinished && awayWon ? 'winner' : ''}`}>
              <div className="gd-team-name">{game.away}</div>
              <div className={`gd-team-score ${isFinished && awayWon ? 'winning' : ''}`}>
                {isFinished ? game.awayScore : '—'}
              </div>
              {awayTop && isFinished && (
                <div className="gd-top-performer">
                  <span className="gd-performer-name">{awayTop.name}</span>
                  <span className="gd-performer-stat">{awayTop.pts} PTS</span>
                </div>
              )}
            </div>

            <div className="gd-vs-divider">
              <span className={`gd-status-badge ${game.status.toLowerCase()}`}>{game.status}</span>
              <span className="gd-vs-text">VS</span>
            </div>

            <div className={`gd-team-side ${isFinished && homeWon ? 'winner' : ''}`}>
              <div className="gd-team-name">{game.home}</div>
              <div className={`gd-team-score ${isFinished && homeWon ? 'winning' : ''}`}>
                {isFinished ? game.homeScore : '—'}
              </div>
              {homeTop && isFinished && (
                <div className="gd-top-performer">
                  <span className="gd-performer-name">{homeTop.name}</span>
                  <span className="gd-performer-stat">{homeTop.pts} PTS</span>
                </div>
              )}
            </div>
          </div>

          {/* Team Comparison Bars (only for final games) */}
          {isFinished && (homeTotals.fga > 0 || awayTotals.fga > 0) && (
            <div className="gd-comparison">
              <div className="gd-comp-row">
                <span className="gd-comp-val">{awayTotals.pts}</span>
                <div className="gd-comp-bar-wrapper">
                  <div className="gd-comp-label">Points</div>
                  <div className="gd-comp-bars">
                    <div
                      className="gd-comp-bar away"
                      style={{ width: `${Math.min(100, (awayTotals.pts / Math.max(awayTotals.pts, homeTotals.pts, 1)) * 100)}%` }}
                    />
                    <div
                      className="gd-comp-bar home"
                      style={{ width: `${Math.min(100, (homeTotals.pts / Math.max(awayTotals.pts, homeTotals.pts, 1)) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="gd-comp-val">{homeTotals.pts}</span>
              </div>
              <div className="gd-comp-row">
                <span className="gd-comp-val">{awayTotals.reb}</span>
                <div className="gd-comp-bar-wrapper">
                  <div className="gd-comp-label">Rebounds</div>
                  <div className="gd-comp-bars">
                    <div
                      className="gd-comp-bar away"
                      style={{ width: `${Math.min(100, (awayTotals.reb / Math.max(awayTotals.reb, homeTotals.reb, 1)) * 100)}%` }}
                    />
                    <div
                      className="gd-comp-bar home"
                      style={{ width: `${Math.min(100, (homeTotals.reb / Math.max(awayTotals.reb, homeTotals.reb, 1)) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="gd-comp-val">{homeTotals.reb}</span>
              </div>
              <div className="gd-comp-row">
                <span className="gd-comp-val">{awayTotals.ast}</span>
                <div className="gd-comp-bar-wrapper">
                  <div className="gd-comp-label">Assists</div>
                  <div className="gd-comp-bars">
                    <div
                      className="gd-comp-bar away"
                      style={{ width: `${Math.min(100, (awayTotals.ast / Math.max(awayTotals.ast, homeTotals.ast, 1)) * 100)}%` }}
                    />
                    <div
                      className="gd-comp-bar home"
                      style={{ width: `${Math.min(100, (homeTotals.ast / Math.max(awayTotals.ast, homeTotals.ast, 1)) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="gd-comp-val">{homeTotals.ast}</span>
              </div>
              <div className="gd-comp-row">
                <span className="gd-comp-val">
                  {awayTotals.fga > 0 ? ((awayTotals.fgm / awayTotals.fga) * 100).toFixed(1) : '0.0'}%
                </span>
                <div className="gd-comp-bar-wrapper">
                  <div className="gd-comp-label">FG%</div>
                  <div className="gd-comp-bars">
                    <div
                      className="gd-comp-bar away"
                      style={{ width: `${awayTotals.fga > 0 ? (awayTotals.fgm / awayTotals.fga) * 100 : 0}%` }}
                    />
                    <div
                      className="gd-comp-bar home"
                      style={{ width: `${homeTotals.fga > 0 ? (homeTotals.fgm / homeTotals.fga) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <span className="gd-comp-val">
                  {homeTotals.fga > 0 ? ((homeTotals.fgm / homeTotals.fga) * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Tab Navigation */}
      <section className="page-content">
        <div className="container">
          <div className="gd-tabs" id="game-detail-tabs">
            <button
              className={`gd-tab ${activeTab === 'boxscore' ? 'active' : ''}`}
              onClick={() => setActiveTab('boxscore')}
              id="tab-boxscore"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="1" y="1" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="1" y1="6" x2="17" y2="6" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="6" y1="1" x2="6" y2="17" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="12" y1="1" x2="12" y2="17" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              Box Score
            </button>
            <button
              className={`gd-tab ${activeTab === 'playbyplay' ? 'active' : ''}`}
              onClick={() => setActiveTab('playbyplay')}
              id="tab-playbyplay"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 1v16M1 9h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              Play-by-Play
            </button>
          </div>

          {/* Box Score Tab */}
          {activeTab === 'boxscore' && (
            <div className="gd-boxscore animate-fade-in" id="boxscore-panel">
              <div className="gd-team-switcher">
                <button
                  className={`gd-team-btn ${activeTeam === 'away' ? 'active' : ''}`}
                  onClick={() => setActiveTeam('away')}
                >
                  {game.away}
                  {isFinished && <span className="gd-team-btn-score">{game.awayScore}</span>}
                </button>
                <button
                  className={`gd-team-btn ${activeTeam === 'home' ? 'active' : ''}`}
                  onClick={() => setActiveTeam('home')}
                >
                  {game.home}
                  {isFinished && <span className="gd-team-btn-score">{game.homeScore}</span>}
                </button>
              </div>

              {currentRoster.length > 0 ? (
                <div className="gd-table-wrapper">
                  <table className="gd-table" id="boxscore-table">
                    <thead>
                      <tr>
                        <th className="gd-th-player">Player</th>
                        <th>MIN</th>
                        <th>PTS</th>
                        <th>REB</th>
                        <th>AST</th>
                        <th>FGM</th>
                        <th>FGA</th>
                        <th>FG%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRoster.map((player, idx) => {
                        const fgPct = player.fga > 0 ? ((player.fgm / player.fga) * 100).toFixed(1) : '0.0';
                        const isTopScorer = player.name === getTopScorer(currentRoster)?.name;
                        return (
                          <tr key={idx} className={isTopScorer ? 'gd-top-row' : ''}>
                            <td className="gd-td-player">
                              <span className="gd-player-name">{player.name}</span>
                              {isTopScorer && <span className="gd-star-badge">★</span>}
                            </td>
                            <td>{player.min}</td>
                            <td className="gd-pts-cell">{player.pts}</td>
                            <td>{player.reb}</td>
                            <td>{player.ast}</td>
                            <td>{player.fgm}</td>
                            <td>{player.fga}</td>
                            <td>
                              <span className={`gd-fg-pct ${parseFloat(fgPct) >= 50 ? 'hot' : parseFloat(fgPct) < 30 ? 'cold' : ''}`}>
                                {fgPct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="gd-totals-row">
                        <td className="gd-td-player"><strong>Team Totals</strong></td>
                        <td>—</td>
                        <td className="gd-pts-cell">
                          <strong>{activeTeam === 'home' ? homeTotals.pts : awayTotals.pts}</strong>
                        </td>
                        <td><strong>{activeTeam === 'home' ? homeTotals.reb : awayTotals.reb}</strong></td>
                        <td><strong>{activeTeam === 'home' ? homeTotals.ast : awayTotals.ast}</strong></td>
                        <td><strong>{activeTeam === 'home' ? homeTotals.fgm : awayTotals.fgm}</strong></td>
                        <td><strong>{activeTeam === 'home' ? homeTotals.fga : awayTotals.fga}</strong></td>
                        <td>
                          <strong>
                            {(() => {
                              const t = activeTeam === 'home' ? homeTotals : awayTotals;
                              return t.fga > 0 ? ((t.fgm / t.fga) * 100).toFixed(1) + '%' : '0.0%';
                            })()}
                          </strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📊</div>
                  <p className="empty-state-text">
                    {game.status === 'Upcoming'
                      ? 'Box score will be available once the game starts'
                      : 'No box score data available for this game'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Play-by-Play Tab */}
          {activeTab === 'playbyplay' && (
            <div className="gd-pbp animate-fade-in" id="playbyplay-panel">
              {playByPlay.length > 0 ? (
                <div className="gd-pbp-feed">
                  {playByPlay.map((play, idx) => (
                    <div
                      className="gd-pbp-item"
                      key={idx}
                      style={{ animationDelay: `${Math.min(idx * 0.03, 0.6)}s` }}
                    >
                      <div className="gd-pbp-time">
                        <span className="gd-pbp-clock">{play.time}</span>
                      </div>
                      <div className="gd-pbp-connector">
                        <div className="gd-pbp-dot" />
                        <div className="gd-pbp-line" />
                      </div>
                      <div className="gd-pbp-content">
                        <p className="gd-pbp-text">{play.text}</p>
                        <span className="gd-pbp-score">{play.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <p className="empty-state-text">
                    {game.status === 'Upcoming'
                      ? 'Play-by-play data will be available once the game starts'
                      : 'No play-by-play data available for this game'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default GameDetail;

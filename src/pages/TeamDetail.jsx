import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './TeamDetail.css';

function TeamDetail() {
  const { teamAbbr } = useParams();
  const [teamInfo, setTeamInfo] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [roster, setRoster] = useState([]);
  const [activeTab, setActiveTab] = useState('schedule');
  const [loading, setLoading] = useState(true);
  const [schedFilter, setSchedFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    const abbr = teamAbbr.toUpperCase();

    Promise.all([
      fetch(`/api/team/${abbr}/info`).then((r) => r.json()),
      fetch(`/api/team/${abbr}/schedule`).then((r) => r.json()),
      fetch(`/api/team/${abbr}/roster`).then((r) => r.json()),
    ])
      .then(([info, sched, rost]) => {
        setTeamInfo(info);
        setSchedule(sched || []);
        setRoster(rost || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load team data:', err);
        setLoading(false);
      });
  }, [teamAbbr]);

  if (loading || !teamInfo) {
    return (
      <main className="page-layout">
        <div className="page-content" style={{ paddingTop: 'calc(var(--nav-height) + 60px)' }}>
          <div className="container">
            <div className="empty-state">
              <div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🏀</div>
              <p className="empty-state-text">Loading team data...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const accentColor = teamInfo.color || '#e63946';
  const wins = teamInfo.wins || 0;
  const losses = teamInfo.losses || 0;
  const totalGames = wins + losses;
  const winPct = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0';

  // Schedule filtering
  const completedGames = schedule.filter((g) => g.status === 'Final');
  const upcomingGames = schedule.filter((g) => g.status !== 'Final');
  const winsCount = completedGames.filter((g) => g.result === 'W').length;
  const lossesCount = completedGames.filter((g) => g.result === 'L').length;

  const filteredSchedule =
    schedFilter === 'completed' ? completedGames :
    schedFilter === 'upcoming' ? upcomingGames :
    schedule;

  // Streak calculation from recent games
  const recentResults = completedGames.slice(0, 10).map((g) => g.result);

  return (
    <main className="page-layout">
      {/* Team Header */}
      <section className="td-header" style={{ '--team-color': accentColor }}>
        <div className="td-header-bg" />
        <div className="container td-header-content">
          <Link to="/standings" className="back-link" id="back-to-standings">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M16 10H4M4 10L9 5M4 10L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Back to Standings</span>
          </Link>

          <div className="td-team-identity">
            <div className="td-team-abbr" style={{ color: accentColor }}>{teamInfo.abbr}</div>
            <div className="td-team-info-block">
              <h1 className="td-team-name">{teamInfo.name}</h1>
              <div className="td-team-meta">
                {teamInfo.conference && (
                  <span className="td-conf-badge">{teamInfo.conference} Conference</span>
                )}
                {teamInfo.rank && (
                  <span className="td-rank-badge">#{teamInfo.rank} Seed</span>
                )}
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="td-stats-row">
            <div className="td-stat-card">
              <span className="td-stat-value" style={{ color: accentColor }}>{wins}</span>
              <span className="td-stat-label">Wins</span>
            </div>
            <div className="td-stat-card">
              <span className="td-stat-value">{losses}</span>
              <span className="td-stat-label">Losses</span>
            </div>
            <div className="td-stat-card">
              <span className="td-stat-value">{teamInfo.pct || '.000'}</span>
              <span className="td-stat-label">Win %</span>
            </div>
            <div className="td-stat-card">
              <span className="td-stat-value">{teamInfo.gb || '-'}</span>
              <span className="td-stat-label">GB</span>
            </div>
            <div className="td-stat-card">
              <span className={`td-stat-value ${teamInfo.streak?.startsWith('W') ? 'td-win' : 'td-loss'}`}>
                {teamInfo.streak || '-'}
              </span>
              <span className="td-stat-label">Streak</span>
            </div>
            <div className="td-stat-card">
              <span className="td-stat-value">{teamInfo.last10 || '-'}</span>
              <span className="td-stat-label">Last 10</span>
            </div>
          </div>

          {/* Win percentage bar */}
          <div className="td-winbar-wrapper">
            <div className="td-winbar-labels">
              <span>{wins}W</span>
              <span>{winPct}%</span>
              <span>{losses}L</span>
            </div>
            <div className="td-winbar">
              <div
                className="td-winbar-fill"
                style={{ width: `${winPct}%`, background: accentColor }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="page-content">
        <div className="container">
          {/* Tabs */}
          <div className="gd-tabs" id="team-detail-tabs">
            <button
              className={`gd-tab ${activeTab === 'schedule' ? 'active' : ''}`}
              onClick={() => setActiveTab('schedule')}
              id="tab-schedule"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="3" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="2" y1="7" x2="16" y2="7" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="6" y1="1" x2="6" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="12" y1="1" x2="12" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Schedule & Results
            </button>
            <button
              className={`gd-tab ${activeTab === 'roster' ? 'active' : ''}`}
              onClick={() => setActiveTab('roster')}
              id="tab-roster"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Roster
            </button>
          </div>

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="td-schedule animate-fade-in" id="schedule-panel">
              {/* Sub-filters */}
              <div className="td-sched-filters">
                <button
                  className={`td-sched-filter ${schedFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setSchedFilter('all')}
                >All ({schedule.length})</button>
                <button
                  className={`td-sched-filter ${schedFilter === 'completed' ? 'active' : ''}`}
                  onClick={() => setSchedFilter('completed')}
                >Completed ({completedGames.length})</button>
                <button
                  className={`td-sched-filter ${schedFilter === 'upcoming' ? 'active' : ''}`}
                  onClick={() => setSchedFilter('upcoming')}
                >Upcoming ({upcomingGames.length})</button>
              </div>

              {/* Recent form */}
              {recentResults.length > 0 && (
                <div className="td-recent-form">
                  <span className="td-form-label">Recent Form</span>
                  <div className="td-form-pills">
                    {recentResults.map((r, i) => (
                      <span key={i} className={`td-form-pill ${r === 'W' ? 'win' : 'loss'}`}>{r}</span>
                    ))}
                  </div>
                </div>
              )}

              {filteredSchedule.length > 0 ? (
                <div className="td-games-list">
                  {filteredSchedule.map((game) => {
                    const isHome = game.homeAbbr === teamAbbr.toUpperCase();
                    const opponent = isHome ? game.away : game.home;
                    const oppAbbr = isHome ? game.awayAbbr : game.homeAbbr;
                    const teamScore = isHome ? game.homeScore : game.awayScore;
                    const oppScore = isHome ? game.awayScore : game.homeScore;

                    return (
                      <Link
                        to={`/games/${game.id}`}
                        className="td-game-row"
                        key={game.id}
                        id={`team-game-${game.id}`}
                      >
                        <div className="td-game-date">{game.date}</div>
                        <div className="td-game-location">{isHome ? 'vs' : '@'}</div>
                        <div className="td-game-opponent">
                          <span className="td-opp-abbr">{oppAbbr}</span>
                          <span className="td-opp-name">{opponent}</span>
                        </div>
                        {game.status === 'Final' ? (
                          <>
                            <div className="td-game-score">
                              <span className={game.result === 'W' ? 'td-win' : 'td-loss'}>{teamScore}</span>
                              <span className="td-score-sep">-</span>
                              <span>{oppScore}</span>
                            </div>
                            <div className={`td-game-result ${game.result === 'W' ? 'win' : 'loss'}`}>
                              {game.result}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="td-game-score">
                              <span className="td-upcoming-text">—</span>
                            </div>
                            <div className="td-game-result upcoming">TBD</div>
                          </>
                        )}
                        <div className="td-game-arena">{game.arena}</div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📅</div>
                  <p className="empty-state-text">No games found</p>
                </div>
              )}
            </div>
          )}

          {/* Roster Tab */}
          {activeTab === 'roster' && (
            <div className="td-roster animate-fade-in" id="roster-panel">
              {roster.length > 0 ? (
                <div className="gd-table-wrapper">
                  <table className="gd-table" id="roster-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'center' }}>#</th>
                        <th style={{ textAlign: 'left' }}>Player</th>
                        <th>POS</th>
                        <th>HT</th>
                        <th>WT</th>
                        <th>AGE</th>
                        <th>EXP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map((player, idx) => (
                        <tr key={player.id || idx}>
                          <td style={{ textAlign: 'center' }}>
                            <span className="td-jersey" style={{ color: accentColor }}>{player.number || '—'}</span>
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            <span className="gd-player-name">{player.name}</span>
                          </td>
                          <td>
                            <span className="td-pos-badge">{player.pos}</span>
                          </td>
                          <td>{player.height || '—'}</td>
                          <td>{player.weight ? `${player.weight}` : '—'}</td>
                          <td>{player.age || '—'}</td>
                          <td>{player.experience > 0 ? `${player.experience} yr${player.experience !== 1 ? 's' : ''}` : 'R'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">👥</div>
                  <p className="empty-state-text">No roster data available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default TeamDetail;

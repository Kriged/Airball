import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCached, setCached, getSportCacheKey } from '../../utils/cache';
import './NFL.css';

const SPORT = 'nfl';

function NFLHome() {
  const cacheKey = getSportCacheKey(SPORT, 'today_games');
  const cached = getCached(cacheKey, 30000);
  const [games, setGames] = useState(cached && Array.isArray(cached.data) ? cached.data : []);
  const [standings, setStandings] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchGames = async () => {
      try {
        const res = await fetch('/api/nfl/games/today');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data)) {
          setGames(data);
          setCached(cacheKey, data);
        }
      } catch { /* network error */ }
    };
    fetchGames();
    const interval = setInterval(fetchGames, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [cacheKey]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/nfl/standings')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d) setStandings(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const liveGames = games.filter(g => g.status === 'LIVE');
  const recentGames = games.filter(g => g.status === 'FINAL').slice(0, 6);
  const upcomingGames = games.filter(g => g.status === 'UPCOMING').slice(0, 6);
  const displayGames = liveGames.length > 0 ? liveGames : (recentGames.length > 0 ? recentGames : upcomingGames);

  return (
    <main className="page-layout">
      {/* Hero Banner */}
      <section className="home-hero" style={{ '--sport-accent': '#013369', '--sport-glow': 'rgba(1, 51, 105, 0.3)' }}>
        <div className="container">
          <div className="hero-content animate-fade-in-up">
            <div className="hero-eyebrow">
              <span className="hero-live-dot" />
              <span>NFL LIVE SCORES</span>
            </div>
            <h1 className="hero-title gradient-text" style={{ background: 'linear-gradient(135deg, #FFFFFF 0%, #E2E8F0 50%, #4A9EE8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              NFL Match Center
            </h1>
            <p className="hero-subtitle">Real-time scores, standings, and analytics</p>
          </div>
        </div>
      </section>

      {/* Score Cards */}
      <section className="page-content">
        <div className="container">
          <h2 className="section-title">{liveGames.length > 0 ? '🔴 Live Games' : (recentGames.length > 0 ? 'Recent Results' : 'Upcoming Games')}</h2>
          <p className="section-subtitle">{liveGames.length > 0 ? 'Games in progress right now' : (recentGames.length > 0 ? 'Latest NFL scores' : 'Next week\'s NFL schedule')}</p>

          {displayGames.length > 0 ? (
            <div className="data-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {displayGames.map(game => (
                <Link to={`/nfl/games/${game.id}`} key={game.id} className="nfl-score-card" id={`nfl-game-${game.id}`}>
                  <div className="nfl-score-card-teams">
                    <div className="nfl-score-card-team">
                      <span className="nfl-score-card-abbr">{game.awayAbbr}</span>
                      {(game.status === 'FINAL' || game.status === 'LIVE') && (
                        <span className={`nfl-score-card-score ${game.awayScore > game.homeScore ? 'winner' : ''}`}>
                          {game.awayScore}
                        </span>
                      )}
                    </div>
                    <span className="nfl-score-card-vs">@</span>
                    <div className="nfl-score-card-team">
                      <span className="nfl-score-card-abbr">{game.homeAbbr}</span>
                      {(game.status === 'FINAL' || game.status === 'LIVE') && (
                        <span className={`nfl-score-card-score ${game.homeScore > game.awayScore ? 'winner' : ''}`}>
                          {game.homeScore}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="nfl-score-card-status">
                    <span className={`game-status ${game.status.toLowerCase()}`}>{game.status}</span>
                    {game.status === 'LIVE' && <span> • {game.quarter}</span>}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🏈</div>
              <p className="empty-state-text">No NFL games scheduled right now</p>
            </div>
          )}

          {/* Mini Standings */}
          {standings && (
            <div style={{ marginTop: '48px' }}>
              <h2 className="section-title">Standings Snapshot</h2>
              <p className="section-subtitle">Conference leaders at a glance</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {['AFC', 'NFC'].map(conf => (
                  <div key={conf} className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--court-gold)', marginBottom: '12px', letterSpacing: '0.04em' }}>{conf}</h3>
                    {(standings[conf] || []).slice(0, 5).map(team => (
                      <Link to={`/nfl/teams/${team.abbr}`} key={team.abbr}
                        style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--court-border)', fontSize: '0.82rem', color: '#FFFFFF', textDecoration: 'none' }}>
                        <span style={{ fontWeight: 700 }}>{team.team}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--court-text-muted)' }}>{team.wins}-{team.losses}{team.ties > 0 ? `-${team.ties}` : ''}</span>
                      </Link>
                    ))}
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

export default NFLHome;

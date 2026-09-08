import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCached } from '../utils/cache';
import ScorebugHero from '../components/ScorebugHero';
import ShotChart from '../components/ShotChart';
import Lineups from '../components/Lineups';
import FourFactors from '../components/FourFactors';
import PlayerModal from '../components/PlayerModal';
import './GameDetail.css';

function GameDetail() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [boxScore, setBoxScore] = useState({ home: [], away: [] });
  const [playByPlay, setPlayByPlay] = useState([]);
  const [activeTab, setActiveTab] = useState('tabBoxScore');
  const [boxScoreTeam, setBoxScoreTeam] = useState('away');
  const [pbpFilter, setPbpFilter] = useState('ALL');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerModalTeam, setPlayerModalTeam] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchGamePromise = async () => {
      const cachedGames = getCached('games_list');
      const foundInList = cachedGames?.data?.find((g) => String(g.id) === String(gameId));
      if (foundInList) return foundInList;

      const cachedToday = getCached('today_games');
      const foundInToday = cachedToday?.data?.find((g) => String(g.id) === String(gameId));
      if (foundInToday) return foundInToday;

      try {
        const res = await fetch(`/api/games/${gameId}`);
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Targeted game fetch failed, falling back:', err);
      }

      const listRes = await fetch('/api/games');
      if (!listRes.ok) throw new Error(`HTTP error ${listRes.status}`);
      const games = await listRes.json();
      const found = games.find((g) => String(g.id) === String(gameId));
      if (!found) throw new Error('Game not found');
      return found;
    };

    Promise.all([
      fetchGamePromise(),
      fetch(`/api/games/${gameId}/boxscore`)
        .then((res) => (res.ok ? res.json() : { home: [], away: [] }))
        .catch(() => ({ home: [], away: [] })),
      fetch(`/api/games/${gameId}/playbyplay`)
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
    ])
      .then(([foundGame, boxData, pbpData]) => {
        if (cancelled) return;
        setGame(foundGame);
        setBoxScore(boxData || { home: [], away: [] });
        setPlayByPlay(pbpData || []);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load game details:', err);
        setError(err.message || 'Failed to load game info');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  if (error) {
    return (
      <main className="gd-page">
        <div className="container">
          <div className="empty-state">
            <div className="empty-state-icon">❌</div>
            <p className="empty-state-text">{error}</p>
            <Link to="/games" className="gd-back-nav" style={{ marginTop: 24, display: 'inline-flex' }}>
              ← Back to Games
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loading || !game) {
    return (
      <main className="gd-page">
        <div className="container">
          <div className="empty-state">
            <div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🏀</div>
            <p className="empty-state-text">Loading game details &amp; match center...</p>
          </div>
        </div>
      </main>
    );
  }

  const latestPlay = playByPlay[0];
  const currentRoster = boxScoreTeam === 'home' ? boxScore.home : boxScore.away;
  const currentTeamName = boxScoreTeam === 'home' ? game.home : game.away;

  const handlePlayerClick = (p, team) => {
    setSelectedPlayer(p);
    setPlayerModalTeam(team || currentTeamName);
  };

  return (
    <main className="gd-page">
      <div className="container gd-container">
        {/* Back navigation */}
        <Link to="/games" className="gd-back-nav" id="back-to-games">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M16 10H4M4 10L9 5M4 10L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Back to Games</span>
        </Link>

        {/* Hero Scorebug Broadcast Header */}
        <ScorebugHero game={game} latestPlay={latestPlay} />

        {/* Match Center Tabs */}
        <div className="gd-tabs-nav" id="game-detail-tabs">
          <button
            className={`gd-tab-btn ${activeTab === 'tabBoxScore' ? 'active' : ''}`}
            onClick={() => setActiveTab('tabBoxScore')}
            id="tab-boxscore"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            <span>Box Score (+/-)</span>
          </button>

          <button
            className={`gd-tab-btn ${activeTab === 'tabShotChart' ? 'active' : ''}`}
            onClick={() => setActiveTab('tabShotChart')}
            id="tab-shot-chart"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3v18M3 12h18" />
            </svg>
            <span>Shot Chart &amp; Heatmap</span>
          </button>

          <button
            className={`gd-tab-btn ${activeTab === 'tabPBP' ? 'active' : ''}`}
            onClick={() => setActiveTab('tabPBP')}
            id="tab-playbyplay"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Play-by-Play</span>
          </button>

          <button
            className={`gd-tab-btn ${activeTab === 'tabLineups' ? 'active' : ''}`}
            onClick={() => setActiveTab('tabLineups')}
            id="tab-lineups"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Lineups &amp; On-Court</span>
          </button>

          <button
            className={`gd-tab-btn ${activeTab === 'tabAdvanced' ? 'active' : ''}`}
            onClick={() => setActiveTab('tabAdvanced')}
            id="tab-advanced"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <span>Four Factors &amp; Metrics</span>
          </button>
        </div>

        {/* Tab 1: Box Score */}
        {activeTab === 'tabBoxScore' && (
          <div className="gd-content-wrapper animate-fade-in" id="boxscore-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div className="boxscore-team-toggle">
                <button
                  className={`boxscore-team-btn ${boxScoreTeam === 'away' ? 'active' : ''}`}
                  onClick={() => setBoxScoreTeam('away')}
                >
                  {game.away} Box Score
                </button>
                <button
                  className={`boxscore-team-btn ${boxScoreTeam === 'home' ? 'active' : ''}`}
                  onClick={() => setBoxScoreTeam('home')}
                >
                  {game.home} Box Score
                </button>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--court-text-muted)', fontFamily: 'var(--font-mono)' }}>
                Impact Rating Model Active
              </span>
            </div>

            {currentRoster.length > 0 ? (
              <div className="glass-panel boxscore-table-card">
                <table className="boxscore-table" id="boxscore-table">
                  <thead>
                    <tr>
                      <th className="boxscore-player-cell">Player</th>
                      <th>Rating</th>
                      <th>MIN</th>
                      <th style={{ color: '#FFFFFF' }}>PTS</th>
                      <th>REB</th>
                      <th>AST</th>
                      <th>FGM</th>
                      <th>FGA</th>
                      <th>FG%</th>
                      <th style={{ color: '#FFFFFF', paddingRight: 12 }}>+/-</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRoster.map((player, idx) => {
                      const rating = typeof player.rating === 'number' ? player.rating : null;
                      let ratingClass = 'rating-mid';
                      if (rating !== null) {
                        if (rating >= 8.0) ratingClass = 'rating-high';
                        else if (rating < 6.8) ratingClass = 'rating-low';
                      }

                      const pm = typeof player.pm === 'number' ? player.pm : null;
                      const fgPct = player.fga > 0 ? ((player.fgm / player.fga) * 100).toFixed(1) : '0.0';

                      return (
                        <tr
                          key={`${player.name}-${idx}`}
                          onClick={() => handlePlayerClick(player, currentTeamName)}
                        >
                          <td className="boxscore-player-cell">
                            <span className="boxscore-player-name">{player.name}</span>
                            <span className="boxscore-player-pos">#{player.num || idx + 1}</span>
                          </td>
                          <td>
                            {rating !== null ? (
                              <span className={`rating-badge ${ratingClass}`}>{rating.toFixed(1)}</span>
                            ) : (
                              <span style={{ color: 'var(--court-text-muted)' }}>—</span>
                            )}
                          </td>
                          <td>{player.min || '0:00'}</td>
                          <td style={{ fontWeight: 800, color: '#FFFFFF' }}>{player.pts ?? 0}</td>
                          <td>{player.reb ?? 0}</td>
                          <td>{player.ast ?? 0}</td>
                          <td>{player.fgm ?? 0}</td>
                          <td>{player.fga ?? 0}</td>
                          <td>
                            <span style={{ color: parseFloat(fgPct) >= 50 ? '#00E676' : parseFloat(fgPct) < 30 ? '#FF3B30' : 'inherit' }}>
                              {fgPct}%
                            </span>
                          </td>
                          <td style={{ fontWeight: 800, paddingRight: 12, color: pm !== null ? (pm >= 0 ? '#00E676' : '#FF3B30') : 'var(--court-text-muted)' }}>
                            {pm !== null ? (pm >= 0 ? `+${pm}` : pm) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <p className="empty-state-text">
                  {game.status === 'UPCOMING'
                    ? 'Box score will be available once the game starts'
                    : 'No box score data available for this game'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Shot Chart */}
        {activeTab === 'tabShotChart' && (
          <div className="gd-content-wrapper animate-fade-in">
            <ShotChart
              homeName={game.home}
              awayName={game.away}
              homeAbbr={game.homeAbbr}
              awayAbbr={game.awayAbbr}
            />
          </div>
        )}

        {/* Tab 3: Play-by-Play */}
        {activeTab === 'tabPBP' && (
          <div className="gd-content-wrapper animate-fade-in" id="playbyplay-panel">
            {playByPlay.length > 0 ? (
              <div className="pbp-view-wrapper">
                <div className="glass-panel pbp-filters-bar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--court-text-muted)', fontWeight: 600 }}>Period:</span>
                    {['ALL', '4', '3', '2', '1'].map((q) => (
                      <button
                        key={q}
                        className={`pbp-q-btn ${pbpFilter === q ? 'active' : ''}`}
                        onClick={() => setPbpFilter(q)}
                      >
                        {q === 'ALL' ? 'All' : `Q${q}`}
                      </button>
                    ))}
                  </div>
                  <span style={{ color: '#00E676', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    Game Feed ({playByPlay.length} plays)
                  </span>
                </div>

                <div className="glass-panel pbp-timeline-box">
                  {playByPlay
                    .filter((item) => pbpFilter === 'ALL' || (item.q && String(item.q) === pbpFilter))
                    .map((item, idx) => (
                      <div key={`${item.time}-${idx}`} className="pbp-event-card highlight">
                        <div className="pbp-time-col">
                          <span className="pbp-time-clock">{item.time}</span>
                        </div>
                        <span className="pbp-type-tag two">PLAY</span>
                        <div className="pbp-desc-col">
                          <div className="pbp-desc-header">
                            <span className="pbp-score-label">{item.score}</span>
                          </div>
                          <p className="pbp-desc-text">{item.text}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <p className="empty-state-text">No play-by-play data logged yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Lineups */}
        {activeTab === 'tabLineups' && (
          <div className="gd-content-wrapper animate-fade-in">
            <Lineups
              homeTeamName={game.home}
              awayTeamName={game.away}
              homeRoster={boxScore.home}
              awayRoster={boxScore.away}
              homeColor={game.homeColor}
              awayColor={game.awayColor}
              onSelectPlayer={handlePlayerClick}
            />
          </div>
        )}

        {/* Tab 5: Four Factors */}
        {activeTab === 'tabAdvanced' && (
          <div className="gd-content-wrapper animate-fade-in">
            <FourFactors
              awayName={game.away}
              homeName={game.home}
              stats={game.stats}
            />
          </div>
        )}
      </div>

      {/* Player Profile Modal */}
      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          teamName={playerModalTeam}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </main>
  );
}

export default GameDetail;

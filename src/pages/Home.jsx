import { useState, useEffect, useRef } from 'react';
import { getCached, setCached } from '../utils/cache';
import { courtAudio } from '../utils/audio';
import ScorebugHero from '../components/ScorebugHero';
import ShotChart from '../components/ShotChart';
import Lineups from '../components/Lineups';
import FourFactors from '../components/FourFactors';
import TopPerformers from '../components/TopPerformers';
import MiniStandings from '../components/MiniStandings';
import PlayerModal from '../components/PlayerModal';
import './Home.css';

const TODAY_GAMES_CACHE = 'today_games';

function Home() {
  const cached = getCached(TODAY_GAMES_CACHE, 30000);
  const [games, setGames] = useState(cached && Array.isArray(cached.data) ? cached.data : []);
  const [activeGameId, setActiveGameId] = useState(games[0]?.id || null);
  const [activeTab, setActiveTab] = useState('tabShotChart');
  const [dateFilter, setDateFilter] = useState('TODAY');
  const [quickFilter, setQuickFilter] = useState('ALL');
  const [pbpFilter, setPbpFilter] = useState('ALL');
  const [boxScoreTeam, setBoxScoreTeam] = useState('HOME');
  const [liveStandings, setLiveStandings] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerModalTeam, setPlayerModalTeam] = useState('');
  const [scoreFlashing, setScoreFlashing] = useState(false);
  const [antiSpoilerDelay, setAntiSpoilerDelay] = useState(0);

  // Play-by-play state - populated from live API only
  const [pbpList, setPbpList] = useState([]);

  const activeGame = games.find((g) => g.id === activeGameId) || games[0] || null;

  // Fetch games from backend API
  useEffect(() => {
    let cancelled = false;
    const fetchApiGames = async () => {
      try {
        const res = await fetch('/api/games/today');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data)) {
          setGames(data);
          setCached(TODAY_GAMES_CACHE, data);
          if (data.length > 0) {
            setActiveGameId((prev) => (prev && data.some((g) => g.id === prev) ? prev : data[0].id));
          }
        }
      } catch {
        // No games available or network failure
      }
    };

    fetchApiGames();
    const interval = setInterval(fetchApiGames, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Fetch Standings
  useEffect(() => {
    let cancelled = false;
    fetch('/api/standings')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setLiveStandings(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch Play-by-play and Boxscore if real game selected
  useEffect(() => {
    if (!activeGameId) {
      return;
    }
    let cancelled = false;

    Promise.all([
      fetch(`/api/games/${activeGameId}/playbyplay`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(`/api/games/${activeGameId}/boxscore`)
        .then((r) => (r.ok ? r.json() : { home: [], away: [] }))
        .catch(() => ({ home: [], away: [] }))
    ]).then(([pbpRes, boxRes]) => {
      if (cancelled) return;
      if (Array.isArray(pbpRes)) {
        setPbpList(pbpRes);
      }
      if (boxRes && (boxRes.home?.length > 0 || boxRes.away?.length > 0)) {
        setGames((prev) =>
          prev.map((g) => (g.id === activeGameId ? { ...g, boxScore: boxRes } : g))
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeGameId]);

  // Flash & chime audio when real live scores change
  const prevScoresRef = useRef({ home: null, away: null });
  useEffect(() => {
    if (!activeGame || activeGame.status !== 'LIVE') return;
    const prev = prevScoresRef.current;
    if (prev.home !== null && prev.away !== null) {
      if (activeGame.homeScore > prev.home || activeGame.awayScore > prev.away) {
        const timer = setTimeout(() => setScoreFlashing(true), 0);
        const ptsDiff = (activeGame.homeScore - prev.home) || (activeGame.awayScore - prev.away);
        if (ptsDiff === 3) courtAudio.play('three');
        else courtAudio.play('swish');
        const clearTimer = setTimeout(() => setScoreFlashing(false), 800);
        return () => {
          clearTimeout(timer);
          clearTimeout(clearTimer);
        };
      }
    }
    prevScoresRef.current = { home: activeGame.homeScore, away: activeGame.awayScore };
  }, [activeGame]);

  // Filter games for carousel
  const filteredGames = games.filter((g) => {
    if (quickFilter === 'LIVE') return g.status === 'LIVE';
    if (quickFilter === 'EAST') return g.awayConference === 'EAST' || g.homeConference === 'EAST';
    if (quickFilter === 'WEST') return g.awayConference === 'WEST' || g.homeConference === 'WEST';
    return true;
  });

  const latestPlay = pbpList[0];

  // Derive active boxscore roster from real API data
  const rawRoster =
    boxScoreTeam === 'HOME'
      ? activeGame?.boxScore?.home || []
      : activeGame?.boxScore?.away || [];

  const hasStarters = rawRoster.some((p) => p.starter);
  const starters = hasStarters ? rawRoster.filter((p) => p.starter) : rawRoster.slice(0, 5);
  const bench = hasStarters ? rawRoster.filter((p) => !p.starter) : rawRoster.slice(5);

  // Derive real top performers from active game boxscore
  const allGamePlayers = [
    ...(activeGame?.boxScore?.home?.map((p) => ({ ...p, team: activeGame.homeAbbr, color: activeGame.homeColor })) || []),
    ...(activeGame?.boxScore?.away?.map((p) => ({ ...p, team: activeGame.awayAbbr, color: activeGame.awayColor })) || [])
  ];
  const topPerformers = allGamePlayers
    .filter((p) => (p.pts || 0) > 0)
    .sort((a, b) => (b.pts || 0) - (a.pts || 0))
    .slice(0, 5);

  const handlePlayerClick = (p, teamName) => {
    setSelectedPlayer(p);
    setPlayerModalTeam(teamName || (boxScoreTeam === 'HOME' ? activeGame?.home : activeGame?.away));
  };

  return (
    <main className="home-page">
      {/* Sub-Nav Filter & Date Bar */}
      <nav className="court-subnav">
        <div className="container court-subnav-inner">
          {/* Date Selector */}
          <div className="date-carousel">
            <button
              className={`date-btn ${dateFilter === 'YESTERDAY' ? 'active' : ''}`}
              onClick={() => setDateFilter('YESTERDAY')}
            >
              Yesterday
            </button>
            <button
              className={`date-btn ${dateFilter === 'TODAY' ? 'active' : ''}`}
              onClick={() => setDateFilter('TODAY')}
            >
              <span className="live-pulse-dot" />
              <span>TODAY</span>
            </button>
            <button
              className={`date-btn ${dateFilter === 'TOMORROW' ? 'active' : ''}`}
              onClick={() => setDateFilter('TOMORROW')}
            >
              Tomorrow
            </button>
          </div>

          {/* Quick Filter Pills */}
          <div className="filter-pills">
            <button
              className={`filter-pill ${quickFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setQuickFilter('ALL')}
            >
              All ({games.length})
            </button>
            <button
              className={`filter-pill ${quickFilter === 'LIVE' ? 'active' : ''}`}
              onClick={() => setQuickFilter('LIVE')}
            >
              Live ({games.filter((g) => g.status === 'LIVE').length})
            </button>
            <button
              className={`filter-pill ${quickFilter === 'EAST' ? 'active' : ''}`}
              onClick={() => setQuickFilter('EAST')}
            >
              Eastern
            </button>
            <button
              className={`filter-pill ${quickFilter === 'WEST' ? 'active' : ''}`}
              onClick={() => setQuickFilter('WEST')}
            >
              Western
            </button>
          </div>
        </div>
      </nav>

      {/* Scoreboard Matchups Carousel Bar */}
      <section className="scoreboard-bar">
        <div className="container">
          <div className="scoreboard-bar-header">
            <span style={{ fontWeight: 800, color: 'var(--court-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              NBA Regular Season • Matchups
            </span>
            <span style={{ color: 'var(--court-text-muted)', fontSize: '0.7rem' }}>
              Select a game to enter live Match Center
            </span>
          </div>

          <div className="scoreboard-list">
            {filteredGames.length > 0 ? (
              filteredGames.map((g) => {
                const isActive = g.id === activeGameId;
                const isGameLive = g.status === 'LIVE';

                return (
                  <div
                    key={g.id}
                    className={`match-card ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveGameId(g.id)}
                    id={`match-card-${g.id}`}
                  >
                    <div className="match-card-top">
                      <span>{g.awayConference || 'EAST'} vs {g.homeConference || 'WEST'}</span>
                      {isGameLive ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#FF6B6B' }}>
                          <span className="live-pulse-dot" style={{ width: 5, height: 5, background: '#FF3B30' }} />
                          <span>{g.time || 'Q4'}</span>
                        </span>
                      ) : (
                        <span style={{ color: g.status === 'FINAL' ? 'var(--court-text-muted)' : '#FFB800' }}>
                          {g.status === 'FINAL' ? 'FINAL' : (g.quarter || 'Upcoming')}
                        </span>
                      )}
                    </div>

                    {/* Away Team */}
                    <div className="match-card-row">
                      <div className="match-card-team">
                        <span className="match-card-abbr">{g.awayAbbr}</span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
                          {g.away}
                        </span>
                      </div>
                      <span className={`match-card-score ${g.awayScore >= g.homeScore && g.status !== 'UPCOMING' ? 'winner' : ''}`}>
                        {g.status === 'UPCOMING' ? '—' : g.awayScore}
                      </span>
                    </div>

                    {/* Home Team */}
                    <div className="match-card-row">
                      <div className="match-card-team">
                        <span className="match-card-abbr">{g.homeAbbr}</span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
                          {g.home}
                        </span>
                      </div>
                      <span className={`match-card-score ${g.homeScore >= g.awayScore && g.status !== 'UPCOMING' ? 'winner' : ''}`}>
                        {g.status === 'UPCOMING' ? '—' : g.homeScore}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '24px 16px', color: 'var(--court-text-muted)', fontSize: '0.85rem' }}>
                No NBA games scheduled for this filter. Games will populate live as the season begins.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Workspace (Match Center 8 Cols / Sidebar 4 Cols) */}
      <section className="match-center-main container">
        <div className="match-center-grid">
          {/* Left 8 Columns */}
          <div className="match-center-left">
            {/* Broadcast Overlay Hero Scorebug */}
            {activeGame ? (
              <ScorebugHero
                game={activeGame}
                latestPlay={latestPlay}
                scoreFlashing={scoreFlashing}
              />
            ) : (
              <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8 }}>Airball Match Center</h2>
                <p style={{ color: 'var(--court-text-muted)', fontSize: '0.85rem' }}>
                  No games currently active. Matchups, live trackers, and shot charts will activate at game time.
                </p>
              </div>
            )}

            {/* Match Center Navigation Tabs */}
            <div className="center-tabs-nav">
              <button
                className={`center-tab-btn ${activeTab === 'tabShotChart' ? 'active' : ''}`}
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
                className={`center-tab-btn ${activeTab === 'tabBoxScore' ? 'active' : ''}`}
                onClick={() => setActiveTab('tabBoxScore')}
                id="tab-box-score"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
                <span>Box Score (+/-)</span>
              </button>

              <button
                className={`center-tab-btn ${activeTab === 'tabPBP' ? 'active' : ''}`}
                onClick={() => setActiveTab('tabPBP')}
                id="tab-pbp"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Play-by-Play</span>
                {activeGame?.status === 'LIVE' && (
                  <span className="live-pulse-dot" style={{ width: 6, height: 6, background: '#00E676' }} />
                )}
              </button>

              <button
                className={`center-tab-btn ${activeTab === 'tabLineups' ? 'active' : ''}`}
                onClick={() => setActiveTab('tabLineups')}
                id="tab-lineups"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Lineups &amp; On-Court</span>
              </button>

              <button
                className={`center-tab-btn ${activeTab === 'tabAdvanced' ? 'active' : ''}`}
                onClick={() => setActiveTab('tabAdvanced')}
                id="tab-advanced"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                <span>Four Factors &amp; Metrics</span>
              </button>
            </div>

            {/* TAB 1: SHOT CHART */}
            {activeTab === 'tabShotChart' && activeGame && (
              <ShotChart
                homeName={activeGame.home}
                awayName={activeGame.away}
                homeAbbr={activeGame.homeAbbr}
                awayAbbr={activeGame.awayAbbr}
                shots={activeGame.shots || []}
              />
            )}

            {/* TAB 2: BOX SCORE */}
            {activeTab === 'tabBoxScore' && (
              <div className="boxscore-view-wrapper">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div className="boxscore-team-toggle">
                    <button
                      className={`boxscore-team-btn ${boxScoreTeam === 'HOME' ? 'active' : ''}`}
                      onClick={() => setBoxScoreTeam('HOME')}
                    >
                      {activeGame?.home || 'Home'} Box Score
                    </button>
                    <button
                      className={`boxscore-team-btn ${boxScoreTeam === 'AWAY' ? 'active' : ''}`}
                      onClick={() => setBoxScoreTeam('AWAY')}
                    >
                      {activeGame?.away || 'Away'} Box Score
                    </button>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--court-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Impact Player Ratings
                  </span>
                </div>

                {rawRoster.length > 0 ? (
                  <div className="glass-panel boxscore-table-card">
                    <table className="boxscore-table">
                      <thead>
                        <tr>
                          <th className="boxscore-player-cell">Player</th>
                          <th>Rating</th>
                          <th>MIN</th>
                          <th style={{ color: '#FFFFFF' }}>PTS</th>
                          <th>REB</th>
                          <th>AST</th>
                          <th>STL</th>
                          <th>BLK</th>
                          <th>FG</th>
                          <th>3PT</th>
                          <th>FT</th>
                          <th>PF</th>
                          <th style={{ color: '#FFFFFF', paddingRight: 12 }}>+/-</th>
                        </tr>
                      </thead>
                      <tbody>
                        {starters.length > 0 && (
                          <tr className="section-divider-row">
                            <td colSpan="13">Starters</td>
                          </tr>
                        )}
                        {starters.map((p) => {
                          const rating = typeof p.rating === 'number' ? p.rating : null;
                          let ratingClass = 'rating-mid';
                          if (rating !== null) {
                            if (rating >= 8.0) ratingClass = 'rating-high';
                            else if (rating < 6.8) ratingClass = 'rating-low';
                          }

                          const pm = typeof p.pm === 'number' ? p.pm : null;

                          return (
                            <tr
                              key={p.name}
                              onClick={() => handlePlayerClick(p, boxScoreTeam === 'HOME' ? activeGame?.home : activeGame?.away)}
                            >
                              <td className="boxscore-player-cell">
                                <span className="boxscore-player-name">{p.name}</span>
                                <span className="boxscore-player-pos">#{p.num || '—'} {p.pos ? `• ${p.pos}` : ''}</span>
                              </td>
                              <td>
                                {rating !== null ? (
                                  <span className={`rating-badge ${ratingClass}`}>{rating.toFixed(1)}</span>
                                ) : (
                                  <span style={{ color: 'var(--court-text-muted)' }}>—</span>
                                )}
                              </td>
                              <td>{p.min || '0:00'}</td>
                              <td style={{ fontWeight: 800, color: '#FFFFFF' }}>{p.pts ?? 0}</td>
                              <td>{p.reb ?? 0}</td>
                              <td>{p.ast ?? 0}</td>
                              <td>{p.stl ?? 0}</td>
                              <td>{p.blk ?? 0}</td>
                              <td>{p.fgm ?? 0}-{p.fga ?? 0}</td>
                              <td>{p.fg3m ?? 0}-{p.fg3a ?? 0}</td>
                              <td>{p.ftm ?? 0}-{p.fta ?? 0}</td>
                              <td style={{ color: '#FFB800' }}>{p.pf ?? 0}</td>
                              <td style={{ fontWeight: 800, paddingRight: 12, color: pm !== null ? (pm >= 0 ? '#00E676' : '#FF3B30') : 'var(--court-text-muted)' }}>
                                {pm !== null ? (pm >= 0 ? `+${pm}` : pm) : '—'}
                              </td>
                            </tr>
                          );
                        })}

                        {bench.length > 0 && (
                          <tr className="section-divider-row">
                            <td colSpan="13">Bench Reserves</td>
                          </tr>
                        )}
                        {bench.map((p) => {
                          const rating = typeof p.rating === 'number' ? p.rating : null;
                          let ratingClass = 'rating-mid';
                          if (rating !== null) {
                            if (rating >= 8.0) ratingClass = 'rating-high';
                            else if (rating < 6.8) ratingClass = 'rating-low';
                          }

                          const pm = typeof p.pm === 'number' ? p.pm : null;

                          return (
                            <tr
                              key={p.name}
                              onClick={() => handlePlayerClick(p, boxScoreTeam === 'HOME' ? activeGame?.home : activeGame?.away)}
                            >
                              <td className="boxscore-player-cell">
                                <span className="boxscore-player-name">{p.name}</span>
                                <span className="boxscore-player-pos">#{p.num || '—'} {p.pos ? `• ${p.pos}` : ''}</span>
                              </td>
                              <td>
                                {rating !== null ? (
                                  <span className={`rating-badge ${ratingClass}`}>{rating.toFixed(1)}</span>
                                ) : (
                                  <span style={{ color: 'var(--court-text-muted)' }}>—</span>
                                )}
                              </td>
                              <td>{p.min || '0:00'}</td>
                              <td style={{ fontWeight: 800, color: '#FFFFFF' }}>{p.pts ?? 0}</td>
                              <td>{p.reb ?? 0}</td>
                              <td>{p.ast ?? 0}</td>
                              <td>{p.stl ?? 0}</td>
                              <td>{p.blk ?? 0}</td>
                              <td>{p.fgm ?? 0}-{p.fga ?? 0}</td>
                              <td>{p.fg3m ?? 0}-{p.fg3a ?? 0}</td>
                              <td>{p.ftm ?? 0}-{p.fta ?? 0}</td>
                              <td style={{ color: '#FFB800' }}>{p.pf ?? 0}</td>
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
                  <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', marginTop: 12, borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>📊</div>
                    <p style={{ color: 'var(--court-text-muted)', fontSize: '0.9rem', marginBottom: 6 }}>
                      {activeGame?.status === 'UPCOMING'
                        ? 'Box score will be available once the game begins.'
                        : 'No box score statistics available yet for this game.'}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--court-text-muted)', opacity: 0.7 }}>
                      Real-time player stats and shooting numbers will populate automatically at tip-off.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PLAY-BY-PLAY */}
            {activeTab === 'tabPBP' && (
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="live-pulse-dot" style={{ width: 6, height: 6, background: '#00E676' }} />
                    <span style={{ color: '#00E676', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>Live Feed</span>
                  </div>
                </div>

                {pbpList.length > 0 ? (
                  <div className="glass-panel pbp-timeline-box">
                    {pbpList
                      .filter((item) => pbpFilter === 'ALL' || String(item.q) === pbpFilter)
                      .map((item) => {
                        let tagClass = 'play';
                        if (item.type === '3PT') tagClass = 'three';
                        else if (item.type === '2PT') tagClass = 'two';
                        else if (item.type === 'FOUL') tagClass = 'foul';
                        else if (item.type === 'TIMEOUT') tagClass = 'timeout';

                        return (
                          <div
                            key={item.id || item.time + item.text}
                            className={`pbp-event-card ${item.highlight ? 'highlight' : ''}`}
                          >
                            <div className="pbp-time-col">
                              <span className="pbp-time-qtr">Q{item.q || 4}</span>
                              <span className="pbp-time-clock">{item.time}</span>
                            </div>

                            <span className={`pbp-type-tag ${tagClass}`}>{item.type || 'PLAY'}</span>

                            <div className="pbp-desc-col">
                              <div className="pbp-desc-header">
                                <span
                                  className="pbp-team-label"
                                  style={{ color: item.team === activeGame?.homeAbbr ? 'var(--court-gold)' : 'var(--court-green)' }}
                                >
                                  {item.team}
                                </span>
                                <span className="pbp-score-label">{item.score}</span>
                              </div>
                              <p className="pbp-desc-text">{item.text}</p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', marginTop: 12, borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>📋</div>
                    <p style={{ color: 'var(--court-text-muted)', fontSize: '0.9rem', marginBottom: 6 }}>
                      {activeGame?.status === 'UPCOMING'
                        ? 'Live play-by-play feed will start once the game tips off.'
                        : 'No play-by-play events recorded yet.'}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--court-text-muted)', opacity: 0.7 }}>
                      Real-time events will stream live as the action unfolds on the court.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: LINEUPS */}
            {activeTab === 'tabLineups' && (
              <Lineups
                homeTeamName={activeGame?.home || 'Home Team'}
                awayTeamName={activeGame?.away || 'Away Team'}
                homeRoster={activeGame?.boxScore?.home || []}
                awayRoster={activeGame?.boxScore?.away || []}
                homeColor={activeGame?.homeColor}
                awayColor={activeGame?.awayColor}
                onSelectPlayer={handlePlayerClick}
              />
            )}

            {/* TAB 5: FOUR FACTORS */}
            {activeTab === 'tabAdvanced' && (
              <FourFactors
                awayName={activeGame?.away || 'Away Team'}
                homeName={activeGame?.home || 'Home Team'}
                stats={activeGame?.stats || null}
              />
            )}
          </div>

          {/* Right 4 Columns */}
          <div className="match-center-right">
            {/* Top Performers Spotlight */}
            <TopPerformers performers={topPerformers} onSelectPlayer={handlePlayerClick} />

            {/* Conference Standings Mini Widget */}
            <MiniStandings liveStandings={liveStandings} />

            {/* Stream Sync / Anti-Spoiler Delay Banner */}
            <div className="glass-highlight anti-spoiler-quick-card">
              <div className="anti-spoiler-header">
                <span className="anti-spoiler-title">
                  <span className="live-pulse-dot" style={{ width: 6, height: 6 }} />
                  <span>Anti-Spoiler Delay</span>
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#FFB800', fontWeight: 800 }}>
                  {antiSpoilerDelay === 0 ? '0s (Live)' : `+${antiSpoilerDelay}s Delay`}
                </span>
              </div>
              <p style={{ color: 'var(--court-text-muted)', fontSize: '0.7rem', lineHeight: 1.4, marginBottom: 8 }}>
                Sync live notifications and score updates to match your cable or NBA League Pass broadcast feed.
              </p>
              <input
                type="range"
                min="0"
                max="60"
                step="5"
                value={antiSpoilerDelay}
                onChange={(e) => setAntiSpoilerDelay(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--court-accent)', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Player Detail Profile Modal */}
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

export default Home;

import { useState, useEffect } from 'react';
import './Home.css';

// ============================================================
// API Integration Layer
// Replace these functions with real API calls when ready.
// Expected shape for each game is documented below.
// ============================================================

/**
 * Fetches the list of today's games from the API.
 * Each game object should conform to the shape defined in `initialGames`.
 *
 * @returns {Promise<Array>} Array of game objects
 *
 * Game shape:
 * {
 *   id: string,
 *   home: string,           // Team name
 *   away: string,
 *   homeAbbr: string,       // 3-letter abbreviation
 *   awayAbbr: string,
 *   homeScore: number,
 *   awayScore: number,
 *   homeColor: string,      // Hex color
 *   awayColor: string,
 *   quarter: string,        // e.g. '4th Qtr', 'Final', '7:30 PM'
 *   time: string,           // e.g. '02:15', '00:00', 'Upcoming'
 *   status: 'LIVE' | 'FINAL' | 'UPCOMING',
 *   arena: string,
 *   stats: {
 *     fgPct:      { home: number, away: number },
 *     fg3Pct:     { home: number, away: number },
 *     rebounds:   { home: number, away: number },
 *     assists:    { home: number, away: number },
 *     turnovers:  { home: number, away: number },
 *   },
 *   playByPlay: Array<{ time: string, text: string, score: string }>,
 *   boxScore: {
 *     home: Array<{ name: string, min: string, pts: number, reb: number, ast: number, fgm: number, fga: number }>,
 *     away: Array<{ name: string, min: string, pts: number, reb: number, ast: number, fgm: number, fga: number }>,
 *   }
 * }
 */
async function fetchGames() {
  try {
    const res = await fetch('/api/games/today');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error("fetchGames failed:", e);
    return null;
  }
}

/**
 * Fetches live play-by-play for a specific game.
 * @param {string} gameId
 * @returns {Promise<Array>} Array of play objects
 */
async function fetchPlayByPlay(gameId) {
  try {
    const res = await fetch(`/api/games/${gameId}/playbyplay`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error("fetchPlayByPlay failed:", e);
    return null;
  }
}

/**
 * Fetches the box score for a specific game.
 * @param {string} gameId
 * @returns {Promise<Object>} { home: [...], away: [...] }
 */
async function fetchBoxScore(gameId) {
  try {
    const res = await fetch(`/api/games/${gameId}/boxscore`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error("fetchBoxScore failed:", e);
    return null;
  }
}

function Home() {
  const [games, setGames] = useState([]);
  const [activeGameId, setActiveGameId] = useState('mock_1');
  const [activeTab, setActiveTab] = useState('pbp');

  const activeGame = games.find((g) => g.id === activeGameId) || games[0];

  // Fetch games scoreboard periodically
  useEffect(() => {
    const poll = async () => {
      const apiGames = await fetchGames();
      if (apiGames && apiGames.length > 0) {
        setGames(apiGames);
        // If activeGameId is not in the fetched list, set it to the first game
        setActiveGameId(prevId => {
          if (!apiGames.some(g => g.id === prevId)) {
            return apiGames[0].id;
          }
          return prevId;
        });
      }
    };
    poll();
    const interval = setInterval(poll, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  // Fetch Play-by-Play & Box Score for the Active Game
  useEffect(() => {
    if (!activeGameId) return;

    const loadDetails = async () => {
      const [pbp, box] = await Promise.all([
        fetchPlayByPlay(activeGameId),
        fetchBoxScore(activeGameId)
      ]);

      setGames(prevGames => prevGames.map(g => {
        if (g.id === activeGameId) {
          return {
            ...g,
            playByPlay: pbp || g.playByPlay,
            boxScore: box || g.boxScore
          };
        }
        return g;
      }));
    };

    loadDetails();

    const activeGameObj = games.find(g => g.id === activeGameId);
    if (activeGameObj && activeGameObj.status === \'LIVE\') {
      const interval = setInterval(loadDetails, 10000);
      return () => clearInterval(interval);
    }
  }, [activeGameId]);

  // Client-side simulation ticker (only runs for mock games when playing)
  useEffect(() => {
    if (!isPlaying || !activeGameId.startsWith('mock_')) return;

    const interval = setInterval(() => {
      setGames((prevGames) => {
        return prevGames.map((game) => {
          if (game.status !== 'LIVE') return game;

          const [minsStr, secsStr] = game.time.split(':');
          let mins = parseInt(minsStr, 10);
          let secs = parseInt(secsStr, 10);
          let totalSecs = mins * 60 + secs;

          const timeDec = Math.floor(Math.random() * 15) + 8;
          totalSecs -= timeDec;

          let nextTime = '';
          let nextQuarter = game.quarter;
          let nextStatus = game.status;
          let nextPlayByPlay = [...game.playByPlay];
          let nextHomeScore = game.homeScore;
          let nextAwayScore = game.awayScore;
          let nextStats = { ...game.stats };
          let nextBoxScore = {
            home: game.boxScore.home.map(p => ({ ...p })),
            away: game.boxScore.away.map(p => ({ ...p })),
          };

          if (totalSecs <= 0) {
            if (game.quarter === '4th Qtr') {
              nextTime = '00:00';
              nextQuarter = 'Final';
              nextStatus = 'FINAL';
              const endText = `Game Over. ${
                nextHomeScore > nextAwayScore ? game.home : game.away
              } wins!`;
              nextPlayByPlay = [
                { time: '00:00', text: endText, score: `${nextHomeScore}-${nextAwayScore}` },
                ...nextPlayByPlay,
              ];
            } else if (game.quarter === '3rd Qtr') {
              nextTime = '12:00';
              nextQuarter = '4th Qtr';
              nextPlayByPlay = [
                { time: '12:00', text: 'Start of 4th Quarter.', score: `${nextHomeScore}-${nextAwayScore}` },
                ...nextPlayByPlay,
              ];
            }
          } else {
            const m = Math.floor(totalSecs / 60);
            const s = totalSecs % 60;
            nextTime = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

            const isHomeActive = Math.random() > 0.5;
            const activeRoster = isHomeActive ? homePlayers[game.home] : awayPlayers[game.away];
            const oppRoster = isHomeActive ? awayPlayers[game.away] : homePlayers[game.home];

            if (activeRoster && oppRoster) {
              const player = activeRoster[Math.floor(Math.random() * activeRoster.length)];
              const oppPlayer = oppRoster[Math.floor(Math.random() * oppRoster.length)];

              const roll = Math.floor(Math.random() * 5);
              let playText = '';
              let scoreTag = `${nextHomeScore}-${nextAwayScore}`;
              let scoredPts = 0;

              if (roll === 0) {
                scoredPts = 2;
                if (isHomeActive) nextHomeScore += 2;
                else nextAwayScore += 2;
                scoreTag = `${nextHomeScore}-${nextAwayScore}`;

                const assistsChance = Math.random() > 0.6;
                if (assistsChance) {
                  const astPlayer = activeRoster.filter((p) => p !== player)[
                    Math.floor(Math.random() * (activeRoster.length - 1))
                  ];
                  playText = `${player} scores a driving layup (assisted by ${astPlayer}).`;
                  if (isHomeActive) nextStats.assists.home += 1;
                  else nextStats.assists.away += 1;
                  // Update assister box score
                  const side = isHomeActive ? 'home' : 'away';
                  const astIdx = nextBoxScore[side].findIndex(p => p.name === astPlayer);
                  if (astIdx >= 0) nextBoxScore[side][astIdx].ast += 1;
                } else {
                  playText = `${player} hits a driving floating jump shot.`;
                }
              } else if (roll === 1) {
                scoredPts = 3;
                if (isHomeActive) nextHomeScore += 3;
                else nextAwayScore += 3;
                scoreTag = `${nextHomeScore}-${nextAwayScore}`;

                const assistsChance = Math.random() > 0.7;
                if (assistsChance) {
                  const astPlayer = activeRoster.filter((p) => p !== player)[
                    Math.floor(Math.random() * (activeRoster.length - 1))
                  ];
                  playText = `${player} drains a 3-pointer from deep! (assisted by ${astPlayer}).`;
                  if (isHomeActive) nextStats.assists.home += 1;
                  else nextStats.assists.away += 1;
                  const side = isHomeActive ? 'home' : 'away';
                  const astIdx = nextBoxScore[side].findIndex(p => p.name === astPlayer);
                  if (astIdx >= 0) nextBoxScore[side][astIdx].ast += 1;
                } else {
                  playText = `${player} pulls up and knocks down a 26-foot 3-pointer!`;
                }
              } else if (roll === 2) {
                const reboundHome = Math.random() > 0.4;
                const rebRoster = reboundHome ? homePlayers[game.home] : awayPlayers[game.away];
                const rebPlayer = rebRoster[Math.floor(Math.random() * rebRoster.length)];
                playText = `${player} misses a jumper. ${rebPlayer} secures the defensive rebound.`;
                if (reboundHome) nextStats.rebounds.home += 1;
                else nextStats.rebounds.away += 1;
                // Update rebounder box score
                const rebSide = reboundHome ? 'home' : 'away';
                const rebIdx = nextBoxScore[rebSide].findIndex(p => p.name === rebPlayer);
                if (rebIdx >= 0) nextBoxScore[rebSide][rebIdx].reb += 1;
              } else if (roll === 3) {
                playText = `${oppPlayer} commits a personal foul on ${player}.`;
              } else {
                playText = `${player} turns the ball over (bad pass intercepted by ${oppPlayer}).`;
                if (isHomeActive) nextStats.turnovers.home += 1;
                else nextStats.turnovers.away += 1;
              }

              // Update scorer box score
              if (scoredPts > 0) {
                const side = isHomeActive ? 'home' : 'away';
                const pIdx = nextBoxScore[side].findIndex(p => p.name === player);
                if (pIdx >= 0) {
                  nextBoxScore[side][pIdx].pts += scoredPts;
                  nextBoxScore[side][pIdx].fga += 1;
                  nextBoxScore[side][pIdx].fgm += 1;
                }
              }

              // Update missed shot in box score
              if (roll === 2) {
                const shooterSide = isHomeActive ? 'home' : 'away';
                const shooterIdx = nextBoxScore[shooterSide].findIndex(p => p.name === player);
                if (shooterIdx >= 0) nextBoxScore[shooterSide][shooterIdx].fga += 1;
              }

              nextPlayByPlay = [
                { time: nextTime, text: playText, score: scoreTag },
                ...nextPlayByPlay,
              ];

              if (nextPlayByPlay.length > 30) {
                nextPlayByPlay.pop();
              }

              if (roll === 0 || roll === 1) {
                if (isHomeActive) {
                  nextStats.fgPct.home = Math.min(
                    65,
                    Math.max(38, nextStats.fgPct.home + (Math.random() * 1.5 - 0.5))
                  );
                  nextStats.fg3Pct.home = Math.min(
                    55,
                    Math.max(25, nextStats.fg3Pct.home + (Math.random() * 2 - 0.8))
                  );
                } else {
                  nextStats.fgPct.away = Math.min(
                    65,
                    Math.max(38, nextStats.fgPct.away + (Math.random() * 1.5 - 0.5))
                  );
                  nextStats.fg3Pct.away = Math.min(
                    55,
                    Math.max(25, nextStats.fg3Pct.away + (Math.random() * 2 - 0.8))
                  );
                }
              }
            }
          }

          return {
            ...game,
            time: nextTime,
            quarter: nextQuarter,
            status: nextStatus,
            homeScore: nextHomeScore,
            awayScore: nextAwayScore,
            stats: nextStats,
            playByPlay: nextPlayByPlay,
            boxScore: nextBoxScore,
          };
        });
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Trigger manual simulation tick
  const triggerManualPlay = () => {
    setGames((prevGames) => {
      return prevGames.map((game) => {
        if (game.id !== activeGameId) return game;
        if (game.status === 'FINAL' || game.status === 'UPCOMING') return game;

        const [minsStr, secsStr] = game.time.split(':');
        let mins = parseInt(minsStr, 10);
        let secs = parseInt(secsStr, 10);
        let totalSecs = mins * 60 + secs;

        const timeDec = Math.floor(Math.random() * 15) + 8;
        totalSecs -= timeDec;

        let nextTime = '';
        let nextQuarter = game.quarter;
        let nextStatus = game.status;
        let nextPlayByPlay = [...game.playByPlay];
        let nextHomeScore = game.homeScore;
        let nextAwayScore = game.awayScore;
        let nextStats = { ...game.stats };
        let nextBoxScore = {
          home: game.boxScore.home.map(p => ({ ...p })),
          away: game.boxScore.away.map(p => ({ ...p })),
        };

        if (totalSecs <= 0) {
          if (game.quarter === '4th Qtr') {
            nextTime = '00:00';
            nextQuarter = 'Final';
            nextStatus = 'FINAL';
            const endText = `Game Over. ${
              nextHomeScore > nextAwayScore ? game.home : game.away
            } wins!`;
            nextPlayByPlay = [
              { time: '00:00', text: endText, score: `${nextHomeScore}-${nextAwayScore}` },
              ...nextPlayByPlay,
            ];
          } else if (game.quarter === '3rd Qtr') {
            nextTime = '12:00';
            nextQuarter = '4th Qtr';
            nextPlayByPlay = [
              { time: '12:00', text: 'Start of 4th Quarter.', score: `${nextHomeScore}-${nextAwayScore}` },
              ...nextPlayByPlay,
            ];
          }
        } else {
          const m = Math.floor(totalSecs / 60);
          const s = totalSecs % 60;
          nextTime = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

          const isHomeActive = Math.random() > 0.5;
          const activeRoster = isHomeActive ? homePlayers[game.home] : awayPlayers[game.away];
          const oppRoster = isHomeActive ? awayPlayers[game.away] : homePlayers[game.home];

          if (activeRoster && oppRoster) {
            const player = activeRoster[Math.floor(Math.random() * activeRoster.length)];
            const oppPlayer = oppRoster[Math.floor(Math.random() * oppRoster.length)];

            const roll = Math.floor(Math.random() * 5);
            let playText = '';
            let scoreTag = `${nextHomeScore}-${nextAwayScore}`;
            let scoredPts = 0;

            if (roll === 0) {
              scoredPts = 2;
              if (isHomeActive) nextHomeScore += 2;
              else nextAwayScore += 2;
              scoreTag = `${nextHomeScore}-${nextAwayScore}`;
              const assistsChance = Math.random() > 0.6;
              if (assistsChance) {
                const astPlayer = activeRoster.filter((p) => p !== player)[
                  Math.floor(Math.random() * (activeRoster.length - 1))
                ];
                playText = `${player} scores a driving layup (assisted by ${astPlayer}).`;
                if (isHomeActive) nextStats.assists.home += 1;
                else nextStats.assists.away += 1;
                const side = isHomeActive ? 'home' : 'away';
                const astIdx = nextBoxScore[side].findIndex(p => p.name === astPlayer);
                if (astIdx >= 0) nextBoxScore[side][astIdx].ast += 1;
              } else {
                playText = `${player} hits a driving floating jump shot.`;
              }
            } else if (roll === 1) {
              scoredPts = 3;
              if (isHomeActive) nextHomeScore += 3;
              else nextAwayScore += 3;
              scoreTag = `${nextHomeScore}-${nextAwayScore}`;
              const assistsChance = Math.random() > 0.7;
              if (assistsChance) {
                const astPlayer = activeRoster.filter((p) => p !== player)[
                  Math.floor(Math.random() * (activeRoster.length - 1))
                ];
                playText = `${player} drains a 3-pointer from deep! (assisted by ${astPlayer}).`;
                if (isHomeActive) nextStats.assists.home += 1;
                else nextStats.assists.away += 1;
                const side = isHomeActive ? 'home' : 'away';
                const astIdx = nextBoxScore[side].findIndex(p => p.name === astPlayer);
                if (astIdx >= 0) nextBoxScore[side][astIdx].ast += 1;
              } else {
                playText = `${player} pulls up and knocks down a 26-foot 3-pointer!`;
              }
            } else if (roll === 2) {
              const reboundHome = Math.random() > 0.4;
              const rebRoster = reboundHome ? homePlayers[game.home] : awayPlayers[game.away];
              const rebPlayer = rebRoster[Math.floor(Math.random() * rebRoster.length)];
              playText = `${player} misses a jumper. ${rebPlayer} secures the defensive rebound.`;
              if (reboundHome) nextStats.rebounds.home += 1;
              else nextStats.rebounds.away += 1;
              const rebSide = reboundHome ? 'home' : 'away';
              const rebIdx = nextBoxScore[rebSide].findIndex(p => p.name === rebPlayer);
              if (rebIdx >= 0) nextBoxScore[rebSide][rebIdx].reb += 1;
            } else if (roll === 3) {
              playText = `${oppPlayer} commits a personal foul on ${player}.`;
            } else {
              playText = `${player} turns the ball over (bad pass intercepted by ${oppPlayer}).`;
              if (isHomeActive) nextStats.turnovers.home += 1;
              else nextStats.turnovers.away += 1;
            }

            if (scoredPts > 0) {
              const side = isHomeActive ? 'home' : 'away';
              const pIdx = nextBoxScore[side].findIndex(p => p.name === player);
              if (pIdx >= 0) {
                nextBoxScore[side][pIdx].pts += scoredPts;
                nextBoxScore[side][pIdx].fga += 1;
                nextBoxScore[side][pIdx].fgm += 1;
              }
            }

            if (roll === 2) {
              const shooterSide = isHomeActive ? 'home' : 'away';
              const shooterIdx = nextBoxScore[shooterSide].findIndex(p => p.name === player);
              if (shooterIdx >= 0) nextBoxScore[shooterSide][shooterIdx].fga += 1;
            }

            nextPlayByPlay = [
              { time: nextTime, text: playText, score: scoreTag },
              ...nextPlayByPlay,
            ];

            if (nextPlayByPlay.length > 30) {
              nextPlayByPlay.pop();
            }

            if (roll === 0 || roll === 1) {
              if (isHomeActive) {
                nextStats.fgPct.home = Math.min(65, Math.max(38, nextStats.fgPct.home + (Math.random() * 1.5 - 0.5)));
                nextStats.fg3Pct.home = Math.min(55, Math.max(25, nextStats.fg3Pct.home + (Math.random() * 2 - 0.8)));
              } else {
                nextStats.fgPct.away = Math.min(65, Math.max(38, nextStats.fgPct.away + (Math.random() * 1.5 - 0.5)));
                nextStats.fg3Pct.away = Math.min(55, Math.max(25, nextStats.fg3Pct.away + (Math.random() * 2 - 0.8)));
              }
            }
          }
        }

        return {
          ...game,
          time: nextTime,
          quarter: nextQuarter,
          status: nextStatus,
          homeScore: nextHomeScore,
          awayScore: nextAwayScore,
          stats: nextStats,
          playByPlay: nextPlayByPlay,
          boxScore: nextBoxScore,
        };
      });
    });
  };

  const getWinProbability = (game) => {
    if (game.status === 'UPCOMING') return 50;
    if (game.status === 'FINAL') {
      return game.homeScore > game.awayScore ? 100 : 0;
    }
    const diff = game.homeScore - game.awayScore;
    const prob = 50 + diff * 4;
    return Math.min(95, Math.max(5, prob));
  };

  // Box score table renderer
  const renderBoxScoreTable = (players, teamName, teamAbbr) => (
    <div className="box-score-section">
      <div className="box-score-team-header">
        <span className="box-score-team-name">{teamName}</span>
        <span className="box-score-team-abbr">{teamAbbr}</span>
      </div>
      <table className="box-score-table">
        <thead>
          <tr>
            <th className="box-col-player">Player</th>
            <th>MIN</th>
            <th>PTS</th>
            <th>REB</th>
            <th>AST</th>
            <th>FG</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr key={i}>
              <td className="box-col-player">{p.name}</td>
              <td>{p.min}</td>
              <td className="box-pts">{p.pts}</td>
              <td>{p.reb}</td>
              <td>{p.ast}</td>
              <td>{p.fgm}-{p.fga}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (!activeGame) {
    return (
      <main className="home-page">
        <section className="live-hub-section" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ color: 'var(--text-secondary)' }}>No Games Today</h2>
        </section>
      </main>
    );
  }

  return (
    <main className="home-page">
      {/* Live Game Hub Section */}
      <section className="live-hub-section" id="hero">
        <div className="live-bg">
          <img src="/images/hero.png" alt="" className="live-bg-image" />
          <div className="live-overlay" />
        </div>

        <div className="container">
          {/* Ticker Row */}
          <div className="ticker-container">
            <div className="ticker-scroll">
              {games.map((g) => (
                <div
                  key={g.id}
                  className={`ticker-card ${activeGameId === g.id ? 'active' : ''}`}
                  onClick={() => setActiveGameId(g.id)}
                  id={`ticker-card-${g.id}`}
                >
                  <div className="ticker-header">
                    <span className={`ticker-status ${g.status.toLowerCase()}`}>
                      {g.status}
                    </span>
                    <span className="ticker-time">
                      {g.status === 'LIVE' ? `${g.quarter} - ${g.time}` : g.quarter}
                    </span>
                  </div>
                  <div className="ticker-row">
                    <span className="ticker-team">
                      <span>{g.away}</span>
                    </span>
                    <span className={`ticker-score ${g.status === 'UPCOMING' ? 'loser' : g.awayScore < g.homeScore && g.status === 'FINAL' ? 'loser' : ''}`}>
                      {g.status === 'UPCOMING' ? '-' : g.awayScore}
                    </span>
                  </div>
                  <div className="ticker-row">
                    <span className="ticker-team">
                      <span>{g.home}</span>
                    </span>
                    <span className={`ticker-score ${g.status === 'UPCOMING' ? 'loser' : g.homeScore < g.awayScore && g.status === 'FINAL' ? 'loser' : ''}`}>
                      {g.status === 'UPCOMING' ? '-' : g.homeScore}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Unified Game Hub Panel */}
            <div className="panel scoreboard-panel combined-panel" style={{ '--accent-glow': activeGame.status === 'LIVE' ? 'rgba(230, 57, 70, 0.15)' : 'rgba(37, 99, 235, 0.15)', '--page-accent': activeGame.status === 'LIVE' ? 'var(--nba-red)' : 'var(--nba-blue-accent)' }}>
              <div className="scoreboard-header">
                <span className={`live-badge ${activeGame.status === 'LIVE' ? '' : activeGame.status === 'UPCOMING' ? 'upcoming-badge' : 'final-badge'}`}>
                  {activeGame.status === 'LIVE' ? 'LIVE' : activeGame.status === 'UPCOMING' ? 'UPCOMING' : 'FINAL'}
                </span>
                <span className="scoreboard-arena">
                  {activeGame.arena}
                </span>
              </div>

              <div className="combined-body">
                {/* Left: Scoreboard */}
                <div className="combined-left">
                  <div className="matchup-hero">
                    <div className="hero-main-row">
                      <span className="hero-team-abbr away" style={{ '--team-color': activeGame.awayColor }}>
                        {activeGame.awayAbbr}
                      </span>
                      <div className="hero-score-value">
                        {activeGame.status !== 'UPCOMING' ? (
                          `${activeGame.awayScore} : ${activeGame.homeScore}`
                        ) : (
                          <span style={{ opacity: 0.5 }}>VS</span>
                        )}
                      </div>
                      <span className="hero-team-abbr home" style={{ '--team-color': activeGame.homeColor }}>
                        {activeGame.homeAbbr}
                      </span>
                    </div>

                    <div className="hero-sub-row">
                      <span className="hero-team-name away">{activeGame.away}</span>
                      <span className="hero-vs">
                        {activeGame.status === 'LIVE' ? `${activeGame.quarter} - ${activeGame.time}` : activeGame.status === 'FINAL' ? 'FINAL' : 'UPCOMING'}
                      </span>
                      <span className="hero-team-name home">{activeGame.home}</span>
                    </div>
                  </div>

                  {/* Win Probability Bar */}
                  <div className="win-prob-wrapper">
                    <div className="win-prob-header">
                      <span>{activeGame.away} {100 - getWinProbability(activeGame)}%</span>
                      <span>{activeGame.home} {getWinProbability(activeGame)}%</span>
                    </div>
                    <div className="win-prob-bar">
                      <div
                        className="win-prob-fill"
                        style={{
                          width: `${getWinProbability(activeGame)}%`,
                          '--team-color': activeGame.homeColor,
                          marginLeft: 'auto',
                        }}
                      />
                      <div className="win-prob-marker" />
                    </div>
                  </div>

                  {/* Simulation Controls for Live Game */}
                  {activeGame.status === 'LIVE' && (
                    <div className="sim-controls">
                      <button
                        className={`btn-control ${isPlaying ? 'btn-active' : ''}`}
                        onClick={() => setIsPlaying(!isPlaying)}
                      >
                        <span>{isPlaying ? 'Pause Sim' : 'Resume Sim'}</span>
                      </button>
                      <button
                        className="btn-control"
                        onClick={triggerManualPlay}
                      >
                        <span>Quick Play</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: Tabs & Content */}
                <div className="combined-right">
                  <div className="panel-tabs">
                    <button
                      className={`panel-tab ${activeTab === 'pbp' ? 'active' : ''}`}
                      onClick={() => setActiveTab('pbp')}
                    >
                      Play-by-Play
                    </button>
                    <button
                      className={`panel-tab ${activeTab === 'stats' ? 'active' : ''}`}
                      onClick={() => setActiveTab('stats')}
                    >
                      Team Stats
                    </button>
                    <button
                      className={`panel-tab ${activeTab === 'home-box' ? 'active' : ''}`}
                      onClick={() => setActiveTab('home-box')}
                    >
                      {activeGame.home} Box Score
                    </button>
                    <button
                      className={`panel-tab ${activeTab === 'away-box' ? 'active' : ''}`}
                      onClick={() => setActiveTab('away-box')}
                    >
                      {activeGame.away} Box Score
                    </button>
                  </div>

                  {/* Play-by-Play View */}
                  {activeTab === 'pbp' && (
                    <div className="terminal-pbp">
                      {activeGame.playByPlay && activeGame.playByPlay.length > 0 ? (
                        <div className="pbp-scroll">
                          {activeGame.playByPlay.map((play, index) => (
                            <div key={index} className="pbp-row">
                              <span className="pbp-time">{play.time}</span>
                              <span className="pbp-text">{play.text}</span>
                              <span className="pbp-score-tag">{play.score}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="pbp-empty">
                          <span>No game data available yet.</span>
                          {activeGame.status === 'UPCOMING' && (
                            <span>Game starts at 7:30 PM.</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Team Stats View */}
                  {activeTab === 'stats' && (
                    <div className="terminal-pbp" style={{ background: 'transparent', height: '320px', padding: 0 }}>
                      {activeGame.status !== 'UPCOMING' ? (
                        <div className="stats-comparison" style={{ '--home-color': activeGame.homeColor, '--away-color': activeGame.awayColor }}>
                          <div className="comparison-row">
                            <div className="comparison-labels">
                              <span>{activeGame.stats.fgPct.away.toFixed(1)}%</span>
                              <span className="comparison-lbl-name">Field Goal %</span>
                              <span>{activeGame.stats.fgPct.home.toFixed(1)}%</span>
                            </div>
                            <div className="comparison-progress-bar">
                              <div className="progress-left" style={{ width: `${(activeGame.stats.fgPct.away / (activeGame.stats.fgPct.away + activeGame.stats.fgPct.home)) * 100}%` }} />
                              <div className="progress-right" style={{ width: `${(activeGame.stats.fgPct.home / (activeGame.stats.fgPct.away + activeGame.stats.fgPct.home)) * 100}%` }} />
                            </div>
                          </div>
                          <div className="comparison-row">
                            <div className="comparison-labels">
                              <span>{activeGame.stats.fg3Pct.away.toFixed(1)}%</span>
                              <span className="comparison-lbl-name">3-Point %</span>
                              <span>{activeGame.stats.fg3Pct.home.toFixed(1)}%</span>
                            </div>
                            <div className="comparison-progress-bar">
                              <div className="progress-left" style={{ width: `${(activeGame.stats.fg3Pct.away / (activeGame.stats.fg3Pct.away + activeGame.stats.fg3Pct.home)) * 100}%` }} />
                              <div className="progress-right" style={{ width: `${(activeGame.stats.fg3Pct.home / (activeGame.stats.fg3Pct.away + activeGame.stats.fg3Pct.home)) * 100}%` }} />
                            </div>
                          </div>
                          <div className="comparison-row">
                            <div className="comparison-labels">
                              <span>{activeGame.stats.rebounds.away}</span>
                              <span className="comparison-lbl-name">Rebounds</span>
                              <span>{activeGame.stats.rebounds.home}</span>
                            </div>
                            <div className="comparison-progress-bar">
                              <div className="progress-left" style={{ width: `${(activeGame.stats.rebounds.away / (activeGame.stats.rebounds.away + activeGame.stats.rebounds.home)) * 100}%` }} />
                              <div className="progress-right" style={{ width: `${(activeGame.stats.rebounds.home / (activeGame.stats.rebounds.away + activeGame.stats.rebounds.home)) * 100}%` }} />
                            </div>
                          </div>
                          <div className="comparison-row">
                            <div className="comparison-labels">
                              <span>{activeGame.stats.assists.away}</span>
                              <span className="comparison-lbl-name">Assists</span>
                              <span>{activeGame.stats.assists.home}</span>
                            </div>
                            <div className="comparison-progress-bar">
                              <div className="progress-left" style={{ width: `${(activeGame.stats.assists.away / (activeGame.stats.assists.away + activeGame.stats.assists.home)) * 100}%` }} />
                              <div className="progress-right" style={{ width: `${(activeGame.stats.assists.home / (activeGame.stats.assists.away + activeGame.stats.assists.home)) * 100}%` }} />
                            </div>
                          </div>
                          <div className="comparison-row">
                            <div className="comparison-labels">
                              <span>{activeGame.stats.turnovers.away}</span>
                              <span className="comparison-lbl-name">Turnovers</span>
                              <span>{activeGame.stats.turnovers.home}</span>
                            </div>
                            <div className="comparison-progress-bar">
                              <div className="progress-left" style={{ width: `${(activeGame.stats.turnovers.away / (activeGame.stats.turnovers.away + activeGame.stats.turnovers.home)) * 100}%` }} />
                              <div className="progress-right" style={{ width: `${(activeGame.stats.turnovers.home / (activeGame.stats.turnovers.away + activeGame.stats.turnovers.home)) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="pbp-empty">
                          <span>No statistics recorded yet.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Home Team Box Score */}
                  {activeTab === 'home-box' && (
                    <div className="terminal-pbp box-score-container">
                      {activeGame.boxScore && activeGame.boxScore.home ? (
                        renderBoxScoreTable(activeGame.boxScore.home, activeGame.home, activeGame.homeAbbr)
                      ) : (
                        <div className="pbp-empty">
                          <span>Box score not available.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Away Team Box Score */}
                  {activeTab === 'away-box' && (
                    <div className="terminal-pbp box-score-container">
                      {activeGame.boxScore && activeGame.boxScore.away ? (
                        renderBoxScoreTable(activeGame.boxScore.away, activeGame.away, activeGame.awayAbbr)
                      ) : (
                        <div className="pbp-empty">
                          <span>Box score not available.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
        </div>
      </section>
    </main>
  );
}

export default Home;

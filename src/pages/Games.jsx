import { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';

const statusFilters = ['All', 'Final', 'Upcoming'];

function Games() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/games')
      .then((res) => res.json())
      .then((data) => {
        setGames(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch games list:', err);
        setLoading(false);
      });
  }, []);

  const filtered = games.filter((g) => {
    const matchStatus = activeStatus === 'All' || g.status === activeStatus;
    const matchSearch = g.home.toLowerCase().includes(search.toLowerCase()) ||
                        g.away.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <PageLayout
      title="Games"
      subtitle="Box scores, schedules, and game results"
      icon="🏀"
      accentColor="#457b9d"
      bannerImage="/images/games.png"
    >
      <div className="search-bar" id="games-search">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/>
          <path d="M14 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          placeholder="Search by team name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-tabs" id="game-status-filters">
        {statusFilters.map((s) => (
          <button
            key={s}
            className={`filter-tab ${activeStatus === s ? 'active' : ''}`}
            onClick={() => setActiveStatus(s)}
            id={`filter-game-${s.toLowerCase()}`}
          >
            {s === 'All' ? 'All Games' : s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🏀</div>
          <p className="empty-state-text">Loading NBA schedules and results...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="data-cards" id="games-list">
          {filtered.map((game) => (
            <div className="data-card game-card" key={game.id} id={`game-${game.id}`}>
            <div className="game-date">{game.date}</div>
            <div className="game-matchup">
              <div className="game-team">
                <span className="game-team-name">{game.away}</span>
                {game.status === 'Final' && (
                  <span className={`game-score ${game.awayScore > game.homeScore ? 'winner' : ''}`}>
                    {game.awayScore}
                  </span>
                )}
              </div>
              <span className="game-vs">@</span>
              <div className="game-team">
                <span className="game-team-name">{game.home}</span>
                {game.status === 'Final' && (
                  <span className={`game-score ${game.homeScore > game.awayScore ? 'winner' : ''}`}>
                    {game.homeScore}
                  </span>
                )}
              </div>
            </div>
            <div className="game-meta">
              <span className={`game-status ${game.status.toLowerCase()}`}>{game.status}</span>
              <span className="game-arena">{game.arena}</span>
            </div>
          </div>
        ))}
      </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p className="empty-state-text">No games found matching your search</p>
        </div>
      )}
    </PageLayout>
  );
}

export default Games;

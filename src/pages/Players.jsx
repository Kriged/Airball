import { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import { getCached, setCached } from '../utils/cache';

const PLAYERS_CACHE_KEY = 'players';

// Position filters list
const positions = ['All', 'PG', 'SG', 'SF', 'PF', 'C'];

function Players() {
  const [players, setPlayers] = useState(() => {
    const cached = getCached(PLAYERS_CACHE_KEY, 300000);
    return cached ? cached.data : [];
  });
  const [loading, setLoading] = useState(() => !getCached(PLAYERS_CACHE_KEY, 300000));
  const [search, setSearch] = useState('');
  const [activePos, setActivePos] = useState('All');

  useEffect(() => {
    const cached = getCached(PLAYERS_CACHE_KEY, 300000);
    if (cached && !cached.isStale) {
      return;
    }

    let isMounted = true;
    fetch('/api/players')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        const validPlayers = data || [];
        setPlayers(validPlayers);
        setCached(PLAYERS_CACHE_KEY, validPlayers);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to fetch players:', err);
        setLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  const filtered = players.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        p.team.toLowerCase().includes(search.toLowerCase());
    const matchPos = activePos === 'All' || p.pos === activePos;
    return matchSearch && matchPos;
  });

  return (
    <PageLayout
      title="Players"
      subtitle="Search and explore NBA players from all eras"
      icon="🏃"
      accentColor="#e63946"
      bannerImage="/images/players.png"
    >
      {/* Search */}
      <div className="search-bar" id="players-search">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/>
          <path d="M14 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          placeholder="Search players by name or team..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Position Filters */}
      <div className="filter-tabs" id="position-filters">
        {positions.map((pos) => (
          <button
            key={pos}
            className={`filter-tab ${activePos === pos ? 'active' : ''}`}
            onClick={() => setActivePos(pos)}
            id={`filter-${pos.toLowerCase()}`}
          >
            {pos === 'All' ? 'All Positions' : pos}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🏀</div>
          <p className="empty-state-text">Loading active NBA player statistics...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="data-table-wrapper" id="players-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Team</th>
                <th>Pos</th>
                <th>PPG</th>
                <th>RPG</th>
                <th>APG</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((player, i) => (
                <tr key={player.id}>
                  <td>{i + 1}</td>
                  <td className="player-name">{player.name}</td>
                  <td>{player.team}</td>
                  <td><span className="accent">{player.pos}</span></td>
                  <td className="highlight">{player.ppg}</td>
                  <td>{player.rpg}</td>
                  <td>{player.apg}</td>
                  <td>
                    <span className={`status-badge status-${player.status.toLowerCase()}`}>
                      {player.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p className="empty-state-text">No players found matching your search</p>
        </div>
      )}
    </PageLayout>
  );
}

export default Players;

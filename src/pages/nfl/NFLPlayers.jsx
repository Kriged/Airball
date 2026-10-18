import { useState, useEffect, useRef } from 'react';
import PageLayout from '../../components/PageLayout';
import PlayerModal from '../../components/PlayerModal';
import { getCached, setCached, getSportCacheKey } from '../../utils/cache';

const CACHE_KEY = getSportCacheKey('nfl', 'players');
const positions = ['All', 'QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'];

function NFLPlayers() {
  const [players, setPlayers] = useState(() => {
    const cached = getCached(CACHE_KEY, 300000);
    return cached ? cached.data : [];
  });
  const [loading, setLoading] = useState(() => !getCached(CACHE_KEY, 300000));
  const [search, setSearch] = useState('');
  const [activePos, setActivePos] = useState('All');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    const cached = getCached(CACHE_KEY, 300000);
    if (cached && !cached.isStale) return;
    let isMounted = true;
    fetch('/api/nfl/players')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(data => {
        if (!isMounted) return;
        setPlayers(data || []);
        setCached(CACHE_KEY, data || []);
        setLoading(false);
      })
      .catch(err => { if (isMounted) { console.error('NFL players error:', err); setLoading(false); } });
    return () => { isMounted = false; };
  }, []);

  // Debounced search against API-Sports NFL database
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    const trimmed = search.trim();
    if (trimmed.length < 2) return;

    searchTimeoutRef.current = setTimeout(() => {
      fetch(`/api/nfl/players?search=${encodeURIComponent(trimmed)}`)
        .then(res => res.ok ? res.json() : [])
        .then(results => {
          if (!Array.isArray(results) || results.length === 0) return;
          setPlayers(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newPlayers = results.filter(p => !existingIds.has(p.id));
            return newPlayers.length > 0 ? [...newPlayers, ...prev] : prev;
          });
        })
        .catch(() => {});
    }, 350);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search]);

  const filtered = players.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        (p.team && p.team.toLowerCase().includes(search.toLowerCase()));
    const matchPos = activePos === 'All' || p.pos === activePos;
    return matchSearch && matchPos;
  });

  return (
    <PageLayout title="NFL Players" subtitle="Search NFL players by position, team, or player name" icon="🏃" accentColor="#D50A0A" bannerImage="/images/players.png">
      <div className="search-bar" id="nfl-players-search">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/><path d="M14 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input type="text" placeholder="Search NFL players (e.g. Mahomes, Jackson, Kelce)..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="filter-tabs" id="nfl-position-filters">
        {positions.map(pos => (
          <button key={pos} className={`filter-tab ${activePos === pos ? 'active' : ''}`}
            onClick={() => setActivePos(pos)} id={`nfl-filter-${pos.toLowerCase()}`}>
            {pos === 'All' ? 'All Positions' : pos}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="empty-state"><div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🏈</div><p className="empty-state-text">Loading NFL players...</p></div>
      ) : filtered.length > 0 ? (
        <div className="data-table-wrapper" id="nfl-players-table">
          <table className="data-table">
            <thead><tr><th>#</th><th>Player</th><th>Team</th><th>Pos</th><th>Pass Yds</th><th>Rush Yds</th><th>Rec Yds</th><th>TD</th></tr></thead>
            <tbody>
              {filtered.map((player, i) => (
                <tr
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  style={{ cursor: 'pointer' }}
                  title="Click to view full player profile & headshot"
                >
                  <td>{i + 1}</td>
                  <td className="player-name">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {player.image && (
                        <img
                          src={player.image}
                          alt={player.name}
                          style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <span>{player.name}</span>
                    </div>
                  </td>
                  <td>{player.team}</td>
                  <td><span className="accent">{player.pos}</span></td>
                  <td className="highlight">{player.passingYards?.toLocaleString() || 0}</td>
                  <td>{player.rushingYards?.toLocaleString() || 0}</td>
                  <td>{player.receivingYards?.toLocaleString() || 0}</td>
                  <td><span className="accent">{player.touchdowns || 0}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state"><div className="empty-state-icon">🔍</div><p className="empty-state-text">No players found matching your search</p></div>
      )}

      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          teamName={selectedPlayer.team}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </PageLayout>
  );
}

export default NFLPlayers;

import { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout';
import { getCached, setCached, getSportCacheKey } from '../../utils/cache';

const CACHE_KEY = getSportCacheKey('nfl', 'stats_leaders');
const statCategories = ['Passing', 'Rushing', 'Receiving', 'Sacks', 'Interceptions'];

function NFLStats() {
  const [leaderboards, setLeaderboards] = useState(() => {
    const cached = getCached(CACHE_KEY, 120000);
    return cached ? cached.data : { Passing: [], Rushing: [], Receiving: [], Sacks: [], Interceptions: [] };
  });
  const [loading, setLoading] = useState(() => !getCached(CACHE_KEY, 120000));
  const [activeCat, setActiveCat] = useState('Passing');

  useEffect(() => {
    const cached = getCached(CACHE_KEY, 120000);
    if (cached && !cached.isStale) return;
    let isMounted = true;
    fetch('/api/nfl/stats/leaders')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(data => {
        if (!isMounted) return;
        setLeaderboards(data || { Passing: [], Rushing: [], Receiving: [], Sacks: [], Interceptions: [] });
        setCached(CACHE_KEY, data);
        setLoading(false);
      })
      .catch(err => { if (isMounted) { console.error('NFL stats error:', err); setLoading(false); } });
    return () => { isMounted = false; };
  }, []);

  const leaders = leaderboards[activeCat] || [];
  const maxVal = leaders.length > 0 ? leaders[0].value : 1;

  const barClass = activeCat === 'Passing' ? 'nfl-stat-bar-passing' :
                   activeCat === 'Rushing' ? 'nfl-stat-bar-rushing' :
                   activeCat === 'Receiving' ? 'nfl-stat-bar-receiving' : 'nfl-stat-bar-defense';

  return (
    <PageLayout title="NFL Stats" subtitle="League leaders in passing, rushing, receiving & defense" icon="📊" accentColor="#D50A0A" bannerImage="/images/stats.png">
      <div className="filter-tabs" id="nfl-stat-filters">
        {statCategories.map(cat => (
          <button key={cat} className={`filter-tab ${activeCat === cat ? 'active' : ''}`}
            onClick={() => setActiveCat(cat)} id={`nfl-filter-stat-${cat.toLowerCase()}`}>{cat}</button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state"><div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>📊</div><p className="empty-state-text">Loading NFL stats...</p></div>
      ) : leaders.length > 0 ? (
        <div className="leaderboard" id="nfl-stats-leaderboard">
          {leaders.map(player => (
            <div className="leader-row" key={player.rank} id={`nfl-leader-${player.rank}`}>
              <div className="leader-rank">
                {player.rank <= 3 ? (
                  <span className={`rank-badge rank-${player.rank}`}>{player.rank}</span>
                ) : (
                  <span className="rank-number">{player.rank}</span>
                )}
              </div>
              <div className="leader-info">
                <span className="leader-name">{player.name}</span>
                <span className="leader-team">{player.team}</span>
              </div>
              <div className={`leader-bar-wrapper ${barClass}`}>
                <div className="stat-bar">
                  <div className="stat-bar-fill" style={{ width: `${(player.value / maxVal) * 100}%` }} />
                </div>
              </div>
              <div className="leader-value">{player.value?.toLocaleString()}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state"><div className="empty-state-icon">🔍</div><p className="empty-state-text">No leaders found for this category</p></div>
      )}
    </PageLayout>
  );
}

export default NFLStats;

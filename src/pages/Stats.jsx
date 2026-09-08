import { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import { getCached, setCached } from '../utils/cache';

const STATS_CACHE_KEY = 'stats_leaders';
const statCategories = ['Points', 'Rebounds', 'Assists', 'Steals', 'Blocks'];

function Stats() {
  const [leaderboards, setLeaderboards] = useState(() => {
    const cached = getCached(STATS_CACHE_KEY, 120000);
    return cached ? cached.data : { Points: [], Rebounds: [], Assists: [], Steals: [], Blocks: [] };
  });
  const [loading, setLoading] = useState(() => !getCached(STATS_CACHE_KEY, 120000));
  const [activeCat, setActiveCat] = useState('Points');

  useEffect(() => {
    const cached = getCached(STATS_CACHE_KEY, 120000);
    if (cached && !cached.isStale) {
      return;
    }

    let isMounted = true;
    fetch('/api/stats/leaders')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        const validData = data || { Points: [], Rebounds: [], Assists: [], Steals: [], Blocks: [] };
        setLeaderboards(validData);
        setCached(STATS_CACHE_KEY, validData);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to fetch stats leaders:', err);
        setLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  const leaders = leaderboards[activeCat] || [];
  const maxVal = leaders.length > 0 ? leaders[0].value : 1;

  return (
    <PageLayout
      title="Stats"
      subtitle="League leaders, analytics, and advanced metrics"
      icon="📊"
      accentColor="#e63946"
      bannerImage="/images/stats.png"
    >
      <div className="filter-tabs" id="stat-category-filters">
        {statCategories.map((cat) => (
          <button
            key={cat}
            className={`filter-tab ${activeCat === cat ? 'active' : ''}`}
            onClick={() => setActiveCat(cat)}
            id={`filter-stat-${cat.toLowerCase()}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>📊</div>
          <p className="empty-state-text">Loading NBA statistical leaders...</p>
        </div>
      ) : leaders.length > 0 ? (
        <div className="leaderboard" id="stats-leaderboard">
          {leaders.map((player) => (
            <div className="leader-row" key={player.rank} id={`leader-${player.rank}`}>
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
              <div className="leader-bar-wrapper">
                <div className="stat-bar">
                  <div
                    className="stat-bar-fill"
                    style={{ width: `${(player.value / maxVal) * 100}%` }}
                  />
                </div>
              </div>
              <div className="leader-value">{player.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p className="empty-state-text">No leaders found for this category</p>
        </div>
      )}
    </PageLayout>
  );
}

export default Stats;

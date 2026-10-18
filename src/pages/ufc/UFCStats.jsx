import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { getCached, setCached, getSportCacheKey } from '../../utils/cache';
import './UFC.css';

const STATS_KEY = getSportCacheKey('ufc', 'stats_leaders');
const OVERVIEW_KEY = getSportCacheKey('ufc', 'stats_overview');

const CATEGORIES = [
  { key: 'slpm', label: 'Strikes Landed/Min', unit: 'SLpM', desc: 'Significant strikes landed per minute of fight time' },
  { key: 'str_acc', label: 'Strike Accuracy', unit: '%', isPct: true, desc: 'Percentage of significant strike attempts landed' },
  { key: 'td_avg', label: 'Takedowns / 15m', unit: 'TD/15m', desc: 'Average takedowns landed per 15 minutes of fight time' },
  { key: 'td_def', label: 'Takedown Defense', unit: '%', isPct: true, desc: 'Percentage of opponent takedown attempts defended' },
  { key: 'sub_avg', label: 'Submissions / 15m', unit: 'Sub/15m', desc: 'Average submission attempts per 15 minutes' },
  { key: 'wins', label: 'Total Wins', unit: 'Wins', isInt: true, desc: 'Career professional MMA victories' },
  { key: 'str_def', label: 'Strike Defense', unit: '%', isPct: true, desc: 'Percentage of opponent strikes avoided or defended' },
];

function UFCStats() {
  const [activeStat, setActiveStat] = useState('slpm');
  const [minFights, setMinFights] = useState(5);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(() => {
    const c = getCached(OVERVIEW_KEY, 3600000);
    return c ? c.data : null;
  });

  // Fetch overview database counts
  useEffect(() => {
    let cancelled = false;
    fetch('/api/ufc/stats/overview')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled && data) {
          setOverview(data);
          setCached(OVERVIEW_KEY, data);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Fetch leaders for selected metric
  useEffect(() => {
    let cancelled = false;
    const cacheKey = `${STATS_KEY}_${activeStat}_${minFights}`;
    fetch(`/api/ufc/stats/leaders?stat=${activeStat}&limit=15&min_fights=${minFights}`)
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        if (!cancelled && res && Array.isArray(res.leaders)) {
          setLeaders(res.leaders);
          setCached(cacheKey, res.leaders);
          setLoading(false);
        } else if (!cancelled) {
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeStat, minFights]);

  const activeCategory = CATEGORIES.find(c => c.key === activeStat) || CATEGORIES[0];

  const formatValue = (val) => {
    if (val === null || val === undefined) return '--';
    if (activeCategory.isPct) {
      const num = typeof val === 'number' ? val : parseFloat(val);
      return `${Math.round(num * 100)}%`;
    }
    if (activeCategory.isInt) {
      return parseInt(val, 10);
    }
    return Number(val).toFixed(2);
  };

  return (
    <PageLayout
      title="UFC Stats & Analytics"
      subtitle="Career striking, takedown, and submission leaderboards"
      icon="📊"
      accentColor="#D20A0A"
      bannerImage="/images/stats.png"
    >
      {/* Database Overview Cards */}
      {overview && (
        <div className="ufc-stats-overview-grid" id="ufc-stats-overview">
          <div className="ufc-overview-card">
            <span className="ufc-overview-val">{(overview.total_fighters || 2990).toLocaleString()}</span>
            <span className="ufc-overview-lbl">Tracked Fighters</span>
          </div>
          <div className="ufc-overview-card">
            <span className="ufc-overview-val">{(overview.total_events || 213).toLocaleString()}</span>
            <span className="ufc-overview-lbl">Events Archived</span>
          </div>
          <div className="ufc-overview-card">
            <span className="ufc-overview-val">{(overview.total_fights || 2275).toLocaleString()}</span>
            <span className="ufc-overview-lbl">Total Fights</span>
          </div>
          <div className="ufc-overview-card">
            <span className="ufc-overview-val" style={{ color: '#ffd700' }}>{overview.champions || 12}</span>
            <span className="ufc-overview-lbl">UFC Champions</span>
          </div>
        </div>
      )}

      {/* Category Selection Tabs */}
      <div className="filter-tabs" id="ufc-stats-category-tabs" style={{ marginBottom: '20px' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            className={`filter-tab ${activeStat === cat.key ? 'active' : ''}`}
            onClick={() => { setLoading(true); setActiveStat(cat.key); }}
            id={`stat-tab-${cat.key}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Control bar: Min Fights + Compare CTA */}
      <div className="ufc-filter-row" style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--court-text-muted)' }}>Min. Fights:</span>
          <select
            className="ufc-select"
            value={minFights}
            onChange={(e) => { setLoading(true); setMinFights(Number(e.target.value)); }}
            id="min-fights-select"
          >
            <option value="1">1+ fight</option>
            <option value="3">3+ fights</option>
            <option value="5">5+ fights (default)</option>
            <option value="10">10+ fights</option>
            <option value="15">15+ fights</option>
          </select>
          <span style={{ fontSize: '0.78rem', color: 'var(--court-text-muted)', marginLeft: '12px' }}>
            {activeCategory.desc}
          </span>
        </div>

        <Link
          to="/ufc/compare"
          className="ufc-pill"
          style={{ background: '#1c1c1c', border: '1px solid #333', color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          ⚔️ Compare Fighters Head-to-Head →
        </Link>
      </div>

      {/* Leaderboard Table / Cards */}
      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🥊</div>
          <p className="empty-state-text">Compiling UFC leaderboards...</p>
        </div>
      ) : leaders.length > 0 ? (
        <div className="ufc-leaderboard-card" id="ufc-leaderboard-list">
          <div className="ufc-leaderboard-title">
            <span>{activeCategory.label} Leaders</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--court-text-muted)' }}>Top {leaders.length}</span>
          </div>

          {leaders.map((leader, idx) => {
            const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : '';
            return (
              <div className="ufc-leaderboard-row" key={leader.id || idx}>
                <div className={`ufc-rank-badge ${rankClass}`}>
                  {leader.rank || idx + 1}
                </div>

                <div className="ufc-leader-info">
                  <Link to={`/ufc/fighters/${leader.id}`} className="ufc-leader-name">
                    {leader.name}
                  </Link>
                  <div className="ufc-leader-meta">
                    {leader.record && <span>{leader.record} • </span>}
                    {leader.division && <span>{leader.division}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div className="ufc-leader-val">
                    {formatValue(leader.value)}
                  </div>
                  <Link
                    to={`/ufc/compare?f1=${leader.id}`}
                    title="Compare this fighter"
                    style={{ fontSize: '0.75rem', color: 'var(--court-text-muted)', textDecoration: 'none', border: '1px solid #222', padding: '2px 8px', borderRadius: '4px' }}
                  >
                    Compare
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p className="empty-state-text">No fighters found matching this criteria.</p>
        </div>
      )}
    </PageLayout>
  );
}

export default UFCStats;

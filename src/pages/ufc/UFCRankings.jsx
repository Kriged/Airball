import { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout';
import { getCached, setCached, getSportCacheKey } from '../../utils/cache';
import './UFC.css';

const CACHE_KEY = getSportCacheKey('ufc', 'rankings');

function UFCRankings() {
  const [rankings, setRankings] = useState(() => { const c = getCached(CACHE_KEY, 300000); return c ? c.data : {}; });
  const [loading, setLoading] = useState(() => !getCached(CACHE_KEY, 300000));

  useEffect(() => {
    const c = getCached(CACHE_KEY, 300000);
    if (c && !c.isStale) return;
    let m = true;
    fetch('/api/ufc/rankings').then(r => r.ok ? r.json() : {}).then(d => { if (m) { setRankings(d || {}); setCached(CACHE_KEY, d || {}); setLoading(false); } }).catch(() => { if (m) setLoading(false); });
    return () => { m = false; };
  }, []);

  const divisionEntries = Object.entries(rankings).filter(([, fighters]) => fighters && fighters.length > 0);

  return (
    <PageLayout title="UFC Rankings" subtitle="Division rankings, P4P lists, and champion tracker" icon="📋" accentColor="#C4A747" bannerImage="/images/standings.png">
      {loading ? (
        <div className="empty-state"><div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🥊</div><p className="empty-state-text">Loading UFC rankings...</p></div>
      ) : divisionEntries.length > 0 ? (
        <div className="ufc-rankings-grid">
          {divisionEntries.map(([division, fighters]) => (
            <div className="ufc-division-card" key={division}>
              <div className="ufc-division-title">{division}</div>
              {fighters.map(fighter => (
                <div className="ufc-ranking-row" key={fighter.rank}>
                  <span className={`ufc-ranking-num ${fighter.isChampion ? 'champion' : ''}`}>
                    {fighter.isChampion ? '👑' : `#${fighter.rank}`}
                  </span>
                  <span className="ufc-ranking-name">{fighter.name}</span>
                  <span className="ufc-ranking-record">{fighter.record}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p className="empty-state-text">UFC rankings data is currently unavailable. Rankings are updated after events.</p>
        </div>
      )}
    </PageLayout>
  );
}

export default UFCRankings;

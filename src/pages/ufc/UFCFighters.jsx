import { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout';
import { getCached, setCached, getSportCacheKey } from '../../utils/cache';
import './UFC.css';

const CACHE_KEY = getSportCacheKey('ufc', 'fighters');

function UFCFighters() {
  const [fighters, setFighters] = useState(() => { const c = getCached(CACHE_KEY, 300000); return c ? c.data : []; });
  const [loading, setLoading] = useState(() => !getCached(CACHE_KEY, 300000));
  const [search, setSearch] = useState('');

  useEffect(() => {
    const c = getCached(CACHE_KEY, 300000);
    if (c && !c.isStale) return;
    let m = true;
    fetch('/api/ufc/fighters').then(r => r.ok ? r.json() : []).then(d => { if (m) { setFighters(d || []); setCached(CACHE_KEY, d || []); setLoading(false); } }).catch(() => { if (m) setLoading(false); });
    return () => { m = false; };
  }, []);

  const filtered = fighters.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || (f.weightClass || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <PageLayout title="UFC Fighters" subtitle="Explore UFC fighters across all weight classes" icon="🏃" accentColor="#D20A0A" bannerImage="/images/players.png">
      <div className="search-bar" id="ufc-fighters-search">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/><path d="M14 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        <input type="text" placeholder="Search fighters or weight class..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? (
        <div className="empty-state"><div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🥊</div><p className="empty-state-text">Loading fighters...</p></div>
      ) : filtered.length > 0 ? (
        <div className="ufc-fighters-grid" id="ufc-fighters-list">
          {filtered.map(fighter => (
            <div className="ufc-fighter-card" key={fighter.id || fighter.name}>
              <div className="ufc-fighter-card-name">{fighter.name}</div>
              <div className="ufc-fighter-card-meta">
                {fighter.record && <span className="ufc-fighter-card-record">{fighter.record}</span>}
                <span>{fighter.weightClass}</span>
                {fighter.country && <span>{fighter.country}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state"><div className="empty-state-icon">🔍</div><p className="empty-state-text">No fighters found</p></div>
      )}
    </PageLayout>
  );
}

export default UFCFighters;

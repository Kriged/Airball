import { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout';

function NFLSeasons() {
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/nfl/seasons')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(data => { setSeasons(data || []); setLoading(false); })
      .catch(err => { console.error('NFL seasons error:', err); setLoading(false); });
  }, []);

  const filtered = seasons.filter(s =>
    s.year.includes(search) ||
    s.champion.toLowerCase().includes(search.toLowerCase()) ||
    s.mvp.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageLayout title="NFL Seasons" subtitle="NFL seasons and Super Bowl history" icon="🏆" accentColor="#013369" bannerImage="/images/seasons.png">
      <div className="search-bar" id="nfl-seasons-search">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/><path d="M14 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input type="text" placeholder="Search by year, champion, or MVP..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? (
        <div className="empty-state"><div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🏆</div><p className="empty-state-text">Loading NFL seasons...</p></div>
      ) : filtered.length > 0 ? (
        <div className="seasons-timeline" id="nfl-seasons-list">
          {filtered.map((season, index) => (
            <div className={`season-card ${index === 0 ? 'current' : ''}`} key={season.year} id={`nfl-season-${season.year}`}
              style={{ '--page-accent': '#013369' }}>
              <div className="season-year-badge">
                <span className="season-year">{season.year}</span>
                {season.status === 'In Progress' && <span className="live-dot" />}
              </div>
              <div className="season-details">
                <div className="season-detail"><span className="season-detail-label">Super Bowl Champion</span><span className="season-detail-value">{season.champion}</span></div>
                <div className="season-detail"><span className="season-detail-label">MVP</span><span className="season-detail-value">{season.mvp}</span></div>
                <div className="season-detail"><span className="season-detail-label">Games</span><span className="season-detail-value">{season.games}</span></div>
                <div className="season-detail"><span className="season-detail-label">Teams</span><span className="season-detail-value">{season.teams}</span></div>
                <div className="season-detail"><span className="season-detail-label">Status</span>
                  <span className={`season-status ${season.status === 'In Progress' ? 'in-progress' : ''}`}>{season.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state"><div className="empty-state-icon">🔍</div><p className="empty-state-text">No seasons found</p></div>
      )}
    </PageLayout>
  );
}

export default NFLSeasons;

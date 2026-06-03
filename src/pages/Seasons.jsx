import { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';

function Seasons() {
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/seasons')
      .then((res) => res.json())
      .then((data) => {
        setSeasons(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch seasons:', err);
        setLoading(false);
      });
  }, []);

  const filtered = seasons.filter((s) =>
    s.year.includes(search) ||
    s.champion.toLowerCase().includes(search.toLowerCase()) ||
    s.mvp.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageLayout
      title="Seasons"
      subtitle="Browse NBA seasons from the golden era to today"
      icon="🏆"
      accentColor="#2563eb"
      bannerImage="/images/seasons.png"
    >
      <div className="search-bar" id="seasons-search">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/>
          <path d="M14 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          placeholder="Search by year, champion, or MVP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🏆</div>
          <p className="empty-state-text">Loading NBA historical seasons...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="seasons-timeline" id="seasons-list">
          {filtered.map((season, index) => (
          <div
            className={`season-card ${index === 0 ? 'current' : ''}`}
            key={season.year}
            id={`season-${season.year}`}
          >
            <div className="season-year-badge">
              <span className="season-year">{season.year}</span>
              {season.status === 'In Progress' && <span className="live-dot" />}
            </div>
            <div className="season-details">
              <div className="season-detail">
                <span className="season-detail-label">Champion</span>
                <span className="season-detail-value">{season.champion}</span>
              </div>
              <div className="season-detail">
                <span className="season-detail-label">MVP</span>
                <span className="season-detail-value">{season.mvp}</span>
              </div>
              <div className="season-detail">
                <span className="season-detail-label">Games</span>
                <span className="season-detail-value">{season.games.toLocaleString()}</span>
              </div>
              <div className="season-detail">
                <span className="season-detail-label">Status</span>
                <span className={`season-status ${season.status === 'In Progress' ? 'in-progress' : ''}`}>
                  {season.status}
                </span>
              </div>
            </div>
          </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p className="empty-state-text">No seasons found matching your search</p>
        </div>
      )}
    </PageLayout>
  );
}

export default Seasons;

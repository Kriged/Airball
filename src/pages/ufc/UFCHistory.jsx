import { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout';
import './UFC.css';

function UFCHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/ufc/history')
      .then(r => r.ok ? r.json() : [])
      .then(d => { setHistory(d || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = history.filter(h =>
    h.year.includes(search) || h.highlight.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageLayout title="UFC History" subtitle="UFC event archive and title fight history" icon="🏆" accentColor="#C4A747" bannerImage="/images/seasons.png">
      <div className="search-bar" id="ufc-history-search">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/><path d="M14 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        <input type="text" placeholder="Search by year or highlight..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? (
        <div className="empty-state"><div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🏆</div><p className="empty-state-text">Loading UFC history...</p></div>
      ) : filtered.length > 0 ? (
        <div className="seasons-timeline" id="ufc-history-list">
          {filtered.map((item, index) => (
            <div className={`season-card ${index === 0 ? 'current' : ''}`} key={item.year} style={{ borderColor: index === 0 ? '#D20A0A' : undefined, boxShadow: index === 0 ? '0 4px 20px rgba(210, 10, 10, 0.15)' : undefined }}>
              <div className="season-year-badge">
                <span className="season-year">{item.year}</span>
              </div>
              <div className="season-details">
                <div className="season-detail"><span className="season-detail-label">Events</span><span className="season-detail-value">{item.events}</span></div>
                <div className="season-detail"><span className="season-detail-label">Title Fights</span><span className="season-detail-value">{item.titleFights}</span></div>
                <div className="season-detail"><span className="season-detail-label">Highlight</span><span className="season-detail-value" style={{ fontSize: '0.75rem' }}>{item.highlight}</span></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state"><div className="empty-state-icon">🔍</div><p className="empty-state-text">No history found</p></div>
      )}
    </PageLayout>
  );
}

export default UFCHistory;

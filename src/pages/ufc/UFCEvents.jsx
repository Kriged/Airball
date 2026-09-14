import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { getCached, setCached, getSportCacheKey } from '../../utils/cache';
import './UFC.css';

const CACHE_KEY = getSportCacheKey('ufc', 'events');
const statusFilters = ['All', 'UPCOMING', 'COMPLETED'];
const statusLabels = { 'All': 'All Events', 'UPCOMING': 'Upcoming', 'COMPLETED': 'Completed' };

function UFCEvents() {
  const [events, setEvents] = useState(() => { const c = getCached(CACHE_KEY, 60000); return c ? c.data : []; });
  const [loading, setLoading] = useState(() => !getCached(CACHE_KEY, 60000));
  const [activeStatus, setActiveStatus] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const c = getCached(CACHE_KEY, 60000);
    if (c && !c.isStale) return;
    let m = true;
    fetch('/api/ufc/events').then(r => r.ok ? r.json() : []).then(d => { if (m) { setEvents(d || []); setCached(CACHE_KEY, d || []); setLoading(false); } }).catch(() => { if (m) setLoading(false); });
    return () => { m = false; };
  }, []);

  const filtered = events.filter(e => {
    const matchStatus = activeStatus === 'All' || e.status === activeStatus;
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <PageLayout title="UFC Events" subtitle="Upcoming and recent UFC events and fight cards" icon="🥊" accentColor="#D20A0A" bannerImage="/images/games.png">
      <div className="search-bar" id="ufc-events-search">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/><path d="M14 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        <input type="text" placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="filter-tabs" id="ufc-event-status-filters">
        {statusFilters.map(s => (
          <button key={s} className={`filter-tab ${activeStatus === s ? 'active' : ''}`} onClick={() => setActiveStatus(s)}>{statusLabels[s]}</button>
        ))}
      </div>
      {loading ? (
        <div className="empty-state"><div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🥊</div><p className="empty-state-text">Loading UFC events...</p></div>
      ) : filtered.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
          {filtered.map(event => (
            <Link to={`/ufc/events/${event.id}`} key={event.id} className="ufc-event-card">
              <div className="ufc-event-header">
                <span className="ufc-event-name">{event.name}</span>
                <span className={`ufc-status-${event.status.toLowerCase()}`}>{event.status}</span>
              </div>
              {event.bouts && event.bouts.length > 0 && (
                <div className="ufc-event-main-bout">
                  <div className="ufc-bout-fighters">
                    <span className={`ufc-fighter-name ${event.bouts[0].fighter1.winner ? 'winner' : ''}`}>{event.bouts[0].fighter1.name}</span>
                    <span className="ufc-bout-vs">VS</span>
                    <span className={`ufc-fighter-name ${event.bouts[0].fighter2.winner ? 'winner' : ''}`}>{event.bouts[0].fighter2.name}</span>
                  </div>
                </div>
              )}
              <div className="ufc-event-footer">
                <span>{event.date}</span><span>{event.venue}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state"><div className="empty-state-icon">🔍</div><p className="empty-state-text">No events found</p></div>
      )}
    </PageLayout>
  );
}

export default UFCEvents;

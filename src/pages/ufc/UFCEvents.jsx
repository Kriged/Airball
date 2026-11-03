import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { cachedResponseFetch, getCached, setCached, getSportCacheKey } from '../../utils/cache';
import { useTimezone } from '../../context/useTimezone';
import './UFC.css';

const CACHE_KEY = getSportCacheKey('ufc', 'events');
const statusFilters = ['All', 'UPCOMING', 'COMPLETED'];
const statusLabels = { 'All': 'All Events', 'UPCOMING': 'Upcoming', 'COMPLETED': 'Completed' };

function UFCEvents() {
  const { formatDateTime } = useTimezone();
  const [events, setEvents] = useState(() => {
    const c = getCached(CACHE_KEY, 60000);
    return c && Array.isArray(c.data) ? c.data : [];
  });
  const [loading, setLoading] = useState(() => !getCached(CACHE_KEY, 60000));
  const [activeStatus, setActiveStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(30);

  useEffect(() => {
    const c = getCached(CACHE_KEY, 60000);
    if (c && !c.isStale && Array.isArray(c.data) && c.data.length > 5) return;
    let m = true;
    cachedResponseFetch('/api/ufc/events')
      .then(r => r.ok ? r.json() : [])
      .then(d => {
        if (m) {
          const list = Array.isArray(d) ? d : (d?.data || []);
          setEvents(list);
          setCached(CACHE_KEY, list);
          setLoading(false);
        }
      })
      .catch(() => { if (m) setLoading(false); });
    return () => { m = false; };
  }, []);

  const filtered = events.filter(e => {
    const matchStatus = activeStatus === 'All' || e.status === activeStatus;
    const matchSearch = (e.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.venue || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const displayedEvents = filtered.slice(0, visibleCount);

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
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
            {displayedEvents.map(event => {
              const mainBout = event.bouts?.[0];
              const f1Win = Boolean(mainBout?.fighter1?.winner);
              const f2Win = Boolean(mainBout?.fighter2?.winner);
              const isCompleted = event.status === 'COMPLETED';
              const winnerName = f1Win ? mainBout?.fighter1?.name : (f2Win ? mainBout?.fighter2?.name : null);

              return (
                <Link to={`/ufc/events/${event.id}`} key={event.id} className="ufc-event-card">
                  <div className="ufc-event-header">
                    <span className="ufc-event-name">{event.name}</span>
                    <span className={`ufc-status-${event.status.toLowerCase()}`}>{event.status}</span>
                  </div>
                  {mainBout && (
                    <div className="ufc-event-main-bout">
                      <div className="ufc-bout-fighters" style={{ flex: 1 }}>
                        <div className="ufc-bout-fighter-col">
                          {mainBout.fighter1.photoUrl ? (
                            <img
                              src={mainBout.fighter1.photoUrl}
                              alt={mainBout.fighter1.name}
                              className={`ufc-fighter-headshot ${f1Win ? 'winner-ring' : ''}`}
                              style={{ width: 50, height: 50 }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <div className={`ufc-fighter-headshot-placeholder ${f1Win ? 'winner-ring' : ''}`} style={{ width: 50, height: 50, fontSize: '1.2rem' }}>🥊</div>
                          )}
                          <span className={`ufc-fighter-name ${f1Win ? 'winner' : f2Win ? 'loser' : ''}`}>{mainBout.fighter1.name}</span>
                          {f1Win && <span className="ufc-winner-badge sm">✓ WIN</span>}
                        </div>
                        <span className="ufc-bout-vs">VS</span>
                        <div className="ufc-bout-fighter-col" style={{ alignItems: 'flex-end' }}>
                          {mainBout.fighter2.photoUrl ? (
                            <img
                              src={mainBout.fighter2.photoUrl}
                              alt={mainBout.fighter2.name}
                              className={`ufc-fighter-headshot ${f2Win ? 'winner-ring' : ''}`}
                              style={{ width: 50, height: 50 }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <div className={`ufc-fighter-headshot-placeholder ${f2Win ? 'winner-ring' : ''}`} style={{ width: 50, height: 50, fontSize: '1.2rem' }}>🥊</div>
                          )}
                          <span className={`ufc-fighter-name ${f2Win ? 'winner' : f1Win ? 'loser' : ''}`}>{mainBout.fighter2.name}</span>
                          {f2Win && <span className="ufc-winner-badge sm">✓ WIN</span>}
                        </div>
                      </div>
                      {isCompleted && winnerName && (
                        <div className="ufc-card-winner-summary">
                          <span>🏆 {winnerName} won</span>
                          {mainBout.round > 0 && <span style={{ color: 'var(--court-text-muted)', fontSize: '0.7rem' }}>• R{mainBout.round} {mainBout.time}</span>}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="ufc-event-footer">
                    <span>{formatDateTime(event, { includeWeekday: true, includeYear: true })}</span><span>{event.venue}</span>
                  </div>
                </Link>
              );
            })}
          </div>
          {visibleCount < filtered.length && (
            <div style={{ textAlign: 'center', marginTop: '28px' }}>
              <button
                className="filter-tab"
                onClick={() => setVisibleCount(prev => prev + 30)}
                style={{ padding: '10px 24px', fontSize: '0.88rem', fontWeight: 700 }}
              >
                Load More Events ({filtered.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state"><div className="empty-state-icon">🔍</div><p className="empty-state-text">No events found</p></div>
      )}
    </PageLayout>
  );
}

export default UFCEvents;

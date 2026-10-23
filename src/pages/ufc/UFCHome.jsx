import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cachedResponseFetch, getCached, setCached, getSportCacheKey } from '../../utils/cache';
import { useTimezone } from '../../context/useTimezone';
import './UFC.css';

function UFCHome() {
  const { formatDateTime } = useTimezone();
  const cacheKey = getSportCacheKey('ufc', 'events');
  const cached = getCached(cacheKey, 60000);
  const [events, setEvents] = useState(cached && Array.isArray(cached.data) ? cached.data : []);

  useEffect(() => {
    let cancelled = false;
    cachedResponseFetch('/api/ufc/events')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (cancelled) return;
        if (Array.isArray(data)) { setEvents(data); setCached(cacheKey, data); }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [cacheKey]);

  const upcomingEvents = events.filter(e => e.status === 'UPCOMING');
  const liveEvents = events.filter(e => e.status === 'LIVE');
  const recentEvents = events.filter(e => e.status === 'COMPLETED').slice(0, 4);
  const nextEvent = liveEvents[0] || upcomingEvents[0];

  return (
    <main className="page-layout">
      {/* Hero */}
      <section className="home-hero">
        <div className="container">
          <div className="hero-content animate-fade-in-up">
            <div className="hero-eyebrow"><span className="hero-live-dot" /><span>UFC FIGHT CENTER</span></div>
            <h1 className="hero-title">
              UFC Match Center
            </h1>
            <p className="hero-subtitle">Live events, fight cards, and fighter rankings</p>
          </div>
        </div>
      </section>

      <section className="page-content">
        <div className="container">
          {/* Next Event Spotlight */}
          {nextEvent && (
            <div style={{ marginBottom: '48px' }}>
              <h2 className="section-title">{nextEvent.status === 'LIVE' ? '🔴 Live Now' : 'Next Event'}</h2>
              <p className="section-subtitle">{formatDateTime(nextEvent, { includeWeekday: true, includeYear: true })} • {nextEvent.venue}</p>
              <Link to={`/ufc/events/${nextEvent.id}`} className="ufc-event-card" id="ufc-next-event">
                <div className="ufc-event-header">
                  <span className="ufc-event-name">{nextEvent.name}</span>
                  <span className={`ufc-status-${nextEvent.status.toLowerCase()}`}>{nextEvent.status}</span>
                </div>
                {nextEvent.bouts && nextEvent.bouts.length > 0 && (
                  <div className="ufc-event-main-bout">
                    <div className="ufc-bout-fighters">
                      <span className={`ufc-fighter-name ${nextEvent.bouts[0].fighter1.winner ? 'winner' : ''}`}>
                        {nextEvent.bouts[0].fighter1.name}
                      </span>
                      <span className="ufc-bout-vs">VS</span>
                      <span className={`ufc-fighter-name ${nextEvent.bouts[0].fighter2.winner ? 'winner' : ''}`}>
                        {nextEvent.bouts[0].fighter2.name}
                      </span>
                    </div>
                  </div>
                )}
                <div className="ufc-event-footer">
                  <span>{nextEvent.venue}</span>
                  <span>{nextEvent.bouts?.length || 0} bouts</span>
                </div>
              </Link>
            </div>
          )}

          {/* Recent Results */}
          {recentEvents.length > 0 && (
            <div>
              <h2 className="section-title">Recent Results</h2>
              <p className="section-subtitle">Latest UFC event outcomes</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
                {recentEvents.map(event => (
                  <Link to={`/ufc/events/${event.id}`} key={event.id} className="ufc-event-card" id={`ufc-event-${event.id}`}>
                    <div className="ufc-event-header">
                      <span className="ufc-event-name">{event.name}</span>
                      <span className="ufc-status-completed">COMPLETED</span>
                    </div>
                    {event.bouts && event.bouts.length > 0 && (
                      <div className="ufc-event-main-bout">
                        <div className="ufc-bout-fighters">
                          <span className={`ufc-fighter-name ${event.bouts[0].fighter1.winner ? 'winner' : 'loser'}`}>
                            {event.bouts[0].fighter1.name}
                          </span>
                          <span className="ufc-bout-vs">VS</span>
                          <span className={`ufc-fighter-name ${event.bouts[0].fighter2.winner ? 'winner' : 'loser'}`}>
                            {event.bouts[0].fighter2.name}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="ufc-event-footer">
                      <span>{formatDateTime(event, { includeWeekday: true, includeYear: true })}</span>
                      <span>{event.venue}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {!nextEvent && recentEvents.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">🥊</div>
              <p className="empty-state-text">No UFC events scheduled right now</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default UFCHome;

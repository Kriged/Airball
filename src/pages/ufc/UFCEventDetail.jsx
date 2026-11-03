import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTimezone } from '../../context/useTimezone';
import { cachedResponseFetch } from '../../utils/cache';
import './UFC.css';

function UFCEventDetail() {
  const { formatDateTime, formatBout } = useTimezone();
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    cachedResponseFetch(`/api/ufc/events/${eventId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d && !d.error) { setEvent(d); setLoading(false); } else if (!cancelled) setLoading(false); })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [eventId]);

  if (loading) {
    return (<main className="page-layout"><section className="page-content"><div className="container">
      <div className="empty-state"><div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🥊</div><p className="empty-state-text">Loading event...</p></div>
    </div></section></main>);
  }

  if (!event) {
    return (<main className="page-layout"><section className="page-content"><div className="container">
      <div className="empty-state"><div className="empty-state-icon">❌</div><p className="empty-state-text">Event not found</p>
        <Link to="/ufc/events" style={{ color: 'var(--court-accent)', marginTop: '12px', display: 'inline-block' }}>← Back to UFC Events</Link></div>
    </div></section></main>);
  }

  return (
    <main className="page-layout">
      {/* Event Hero */}
      <section className="ufc-event-detail-hero">
        <div className="container">
          <Link to="/ufc/events" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>← Back to UFC Events</Link>
          <h1 className="ufc-event-hero-title">{event.name}</h1>
          <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', flexWrap: 'wrap', alignItems: 'center' }}>
            <span>{formatDateTime(event, { includeWeekday: true, includeYear: true })}</span>
            <span>•</span>
            <span>{event.venue}</span>
            <span>•</span>
            <span className={`ufc-status-${event.status.toLowerCase()}`}>{event.status}</span>
          </div>
        </div>
      </section>

      {/* Fight Card */}
      <section className="page-content">
        <div className="container">
          <h2 className="section-title" style={{ fontSize: '1.2rem' }}>Fight Card</h2>
          <p className="section-subtitle">{event.fightCard?.length || 0} bouts</p>

          {event.fightCard && event.fightCard.length > 0 ? (
            <div className="ufc-fight-card">
              {event.fightCard.map((bout, i) => {
                const f1Win = Boolean(bout.fighter1?.winner);
                const f2Win = Boolean(bout.fighter2?.winner);
                const isDraw = !f1Win && !f2Win && (
                  bout.result?.toLowerCase().includes('draw') ||
                  bout.result?.toLowerCase().includes('no contest')
                );
                const winnerName = f1Win ? bout.fighter1.name : (f2Win ? bout.fighter2.name : null);
                const loserName = f1Win ? bout.fighter2.name : (f2Win ? bout.fighter1.name : null);

                return (
                  <div className={`ufc-bout-card ${i === 0 ? 'main-event' : ''}`} key={i}>
                    {bout.weightClass && <div className="ufc-bout-weight-class">{bout.weightClass}</div>}
                    <div className="ufc-bout-fighters" style={{ flex: 1 }}>
                      {/* Fighter 1 */}
                      <div className="ufc-bout-fighter-col">
                        {bout.fighter1.photoUrl ? (
                          <img
                            src={bout.fighter1.photoUrl}
                            alt={bout.fighter1.name}
                            className={`ufc-fighter-headshot ${f1Win ? 'winner-ring' : ''}`}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <div className={`ufc-fighter-headshot-placeholder ${f1Win ? 'winner-ring' : ''}`}>🥊</div>
                        )}
                        <div className={`ufc-fighter-name ${f1Win ? 'winner' : f2Win ? 'loser' : ''}`}>
                          {bout.fighter1.name}
                        </div>
                        {f1Win && <span className="ufc-winner-badge">✓ WINNER</span>}
                        {bout.fighter1.record && <div className="ufc-fighter-record">{bout.fighter1.record}</div>}
                      </div>

                      <span className="ufc-bout-vs">VS</span>

                      {/* Fighter 2 */}
                      <div className="ufc-bout-fighter-col" style={{ alignItems: 'flex-end' }}>
                        {bout.fighter2.photoUrl ? (
                          <img
                            src={bout.fighter2.photoUrl}
                            alt={bout.fighter2.name}
                            className={`ufc-fighter-headshot ${f2Win ? 'winner-ring' : ''}`}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <div className={`ufc-fighter-headshot-placeholder ${f2Win ? 'winner-ring' : ''}`}>🥊</div>
                        )}
                        <div className={`ufc-fighter-name ${f2Win ? 'winner' : f1Win ? 'loser' : ''}`}>
                          {bout.fighter2.name}
                        </div>
                        {f2Win && <span className="ufc-winner-badge">✓ WINNER</span>}
                        {bout.fighter2.record && <div className="ufc-fighter-record">{bout.fighter2.record}</div>}
                      </div>
                    </div>
                    <div className="ufc-bout-result">
                      {winnerName ? (
                        <div className="ufc-bout-winner-text">
                          🏆 {winnerName} DEF. {loserName}
                        </div>
                      ) : isDraw ? (
                        <div className="ufc-bout-draw-text">🤝 Draw / No Contest</div>
                      ) : (
                        bout.result && <div className="ufc-bout-method">{formatBout(bout.result)}</div>
                      )}
                      {bout.method && bout.method !== 'Final' && (
                        <div className="ufc-bout-method" style={{ fontSize: '0.74rem', color: '#a3a3a3' }}>
                          {bout.method}
                        </div>
                      )}
                      {bout.round > 0 && (
                        <div className="ufc-bout-detail">Round {bout.round} • {bout.time || ''}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p className="empty-state-text">Fight card details will be available closer to the event</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default UFCEventDetail;

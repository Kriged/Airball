import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './UFC.css';

function UFCEventDetail() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ufc/events/${eventId}`)
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
      <section style={{ background: 'linear-gradient(135deg, #D20A0A 0%, #1a0a0a 60%, #0a1628 100%)', padding: '48px 0 32px', borderBottom: '1px solid var(--court-border)' }}>
        <div className="container">
          <Link to="/ufc/events" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>← Back to UFC Events</Link>
          <h1 className="section-title" style={{ fontSize: '2rem', marginBottom: '8px' }}>{event.name}</h1>
          <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
            <span>{event.date}</span>
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
              {event.fightCard.map((bout, i) => (
                <div className={`ufc-bout-card ${i === 0 ? 'main-event' : ''}`} key={i}>
                  {bout.weightClass && <div className="ufc-bout-weight-class">{bout.weightClass}</div>}
                  <div className="ufc-bout-fighters" style={{ flex: 1 }}>
                    <div style={{ flex: 1 }}>
                      <div className={`ufc-fighter-name ${bout.fighter1.winner ? 'winner' : bout.fighter2.winner ? 'loser' : ''}`}>
                        {bout.fighter1.name}
                      </div>
                      {bout.fighter1.record && <div className="ufc-fighter-record">{bout.fighter1.record}</div>}
                    </div>
                    <span className="ufc-bout-vs">VS</span>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <div className={`ufc-fighter-name ${bout.fighter2.winner ? 'winner' : bout.fighter1.winner ? 'loser' : ''}`}>
                        {bout.fighter2.name}
                      </div>
                      {bout.fighter2.record && <div className="ufc-fighter-record">{bout.fighter2.record}</div>}
                    </div>
                  </div>
                  {(bout.method || bout.result) && (
                    <div className="ufc-bout-result">
                      {bout.method && <div className="ufc-bout-method">{bout.method}</div>}
                      {bout.result && <div className="ufc-bout-detail">{bout.result}</div>}
                      {bout.round > 0 && <div className="ufc-bout-detail">R{bout.round} {bout.time}</div>}
                    </div>
                  )}
                </div>
              ))}
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

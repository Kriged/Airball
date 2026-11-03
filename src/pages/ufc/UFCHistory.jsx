import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { cachedResponseFetch } from '../../utils/cache';
import { useTimezone } from '../../context/useTimezone';
import './UFC.css';

function UFCHistory() {
  const { formatDateTime } = useTimezone();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('seasons'); // 'seasons' | 'fights'
  const [selectedYear, setSelectedYear] = useState('2026');
  const [yearEvents, setYearEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Fights archive search
  const [fightQuery, setFightQuery] = useState('');
  const [fightsResults, setFightsResults] = useState([]);
  const [loadingFights, setLoadingFights] = useState(false);

  useEffect(() => {
    cachedResponseFetch('/api/ufc/history')
      .then(r => r.ok ? r.json() : [])
      .then(d => {
        setHistory(d || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Fetch events for selected year
  useEffect(() => {
    if (activeTab !== 'seasons' || !selectedYear) return;
    setLoadingEvents(true);
    cachedResponseFetch(`/api/ufc/events?year=${selectedYear}&limit=100`)
      .then(r => r.ok ? r.json() : [])
      .then(d => {
        const list = Array.isArray(d) ? d : (d?.data || []);
        setYearEvents(list);
        setLoadingEvents(false);
      })
      .catch(() => setLoadingEvents(false));
  }, [selectedYear, activeTab]);

  // Fetch fights when in fights search mode
  useEffect(() => {
    if (activeTab !== 'fights') return;
    let cancelled = false;
    setLoadingFights(true);
    const url = fightQuery.trim()
      ? `/api/ufc/fights?search=${encodeURIComponent(fightQuery.trim())}&limit=50`
      : `/api/ufc/fights?limit=30`;

    cachedResponseFetch(url)
      .then(r => r.ok ? r.json() : [])
      .then(d => {
        if (cancelled) return;
        const list = Array.isArray(d) ? d : (d?.data || []);
        setFightsResults(list);
        setLoadingFights(false);
      })
      .catch(() => { if (!cancelled) setLoadingFights(false); });

    return () => { cancelled = true; };
  }, [fightQuery, activeTab]);

  return (
    <PageLayout
      title="UFC History & Archives"
      subtitle="Historical seasons, event archives, and career bout records"
      icon="🏆"
      accentColor="#C4A747"
      bannerImage="/images/seasons.png"
    >
      {/* Mode Toggle Tabs */}
      <div className="filter-tabs" id="ufc-history-mode-tabs" style={{ marginBottom: '24px' }}>
        <button
          className={`filter-tab ${activeTab === 'seasons' ? 'active' : ''}`}
          onClick={() => setActiveTab('seasons')}
        >
          📅 By Season / Year
        </button>
        <button
          className={`filter-tab ${activeTab === 'fights' ? 'active' : ''}`}
          onClick={() => setActiveTab('fights')}
        >
          🥊 Search All Historical Fights
        </button>
      </div>

      {activeTab === 'seasons' ? (
        <>
          {loading ? (
            <div className="empty-state">
              <div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🏆</div>
              <p className="empty-state-text">Loading UFC history...</p>
            </div>
          ) : history.length > 0 ? (
            <div>
              <h2 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
                Select a UFC Season
              </h2>
              <p className="section-subtitle">
                Click any year to inspect its events, fight cards, and fight outcomes
              </p>

              <div className="seasons-timeline" id="ufc-history-list" style={{ marginBottom: '36px' }}>
                {history.map(item => {
                  const isSelected = selectedYear === item.year;
                  return (
                    <div
                      className={`season-card ${isSelected ? 'active' : ''}`}
                      key={item.year}
                      onClick={() => setSelectedYear(item.year)}
                      style={{
                        cursor: 'pointer',
                        borderColor: isSelected ? '#ffffff' : undefined,
                        boxShadow: isSelected ? '0 0 16px rgba(255, 255, 255, 0.12)' : undefined,
                      }}
                    >
                      <div className="season-year-badge">
                        <span className="season-year">{item.year}</span>
                        {isSelected && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#22c55e', textTransform: 'uppercase' }}>
                            ● Active
                          </span>
                        )}
                      </div>
                      <div className="season-details">
                        <div className="season-detail">
                          <span className="season-detail-label">Events</span>
                          <span className="season-detail-value">{item.events}</span>
                        </div>
                        <div className="season-detail">
                          <span className="season-detail-label">Title Fights</span>
                          <span className="season-detail-value">{item.titleFights}</span>
                        </div>
                        <div className="season-detail">
                          <span className="season-detail-label">Highlight</span>
                          <span className="season-detail-value" style={{ fontSize: '0.75rem' }}>
                            {item.highlight}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Events for Selected Year */}
              <div style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
                  <div>
                    <h3 className="section-title" style={{ fontSize: '1.2rem', marginBottom: '4px' }}>
                      {selectedYear} UFC Events & Fight Cards
                    </h3>
                    <p className="section-subtitle">
                      {yearEvents.length} events archived for {selectedYear}
                    </p>
                  </div>
                </div>

                {loadingEvents ? (
                  <div className="empty-state">
                    <div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🥊</div>
                    <p className="empty-state-text">Loading {selectedYear} events...</p>
                  </div>
                ) : yearEvents.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                    {yearEvents.map(event => {
                      const mainBout = event.bouts?.[0];
                      const f1Win = Boolean(mainBout?.fighter1?.winner);
                      const f2Win = Boolean(mainBout?.fighter2?.winner);
                      const winnerName = f1Win ? mainBout?.fighter1?.name : (f2Win ? mainBout?.fighter2?.name : null);

                      return (
                        <Link to={`/ufc/events/${event.id}`} key={event.id} className="ufc-event-card">
                          <div className="ufc-event-header">
                            <span className="ufc-event-name">{event.name}</span>
                            <span className={`ufc-status-${(event.status || 'completed').toLowerCase()}`}>
                              {event.status || 'COMPLETED'}
                            </span>
                          </div>
                          {mainBout && (
                            <div className="ufc-event-main-bout">
                              <div className="ufc-bout-fighters" style={{ flex: 1 }}>
                                <div className="ufc-bout-fighter-col">
                                  <span className={`ufc-fighter-name ${f1Win ? 'winner' : f2Win ? 'loser' : ''}`}>
                                    {mainBout.fighter1.name}
                                  </span>
                                  {f1Win && <span className="ufc-winner-badge sm">✓ WIN</span>}
                                </div>
                                <span className="ufc-bout-vs">VS</span>
                                <div className="ufc-bout-fighter-col" style={{ alignItems: 'flex-end' }}>
                                  <span className={`ufc-fighter-name ${f2Win ? 'winner' : f1Win ? 'loser' : ''}`}>
                                    {mainBout.fighter2.name}
                                  </span>
                                  {f2Win && <span className="ufc-winner-badge sm">✓ WIN</span>}
                                </div>
                              </div>
                              {winnerName && (
                                <div className="ufc-card-winner-summary" style={{ marginTop: '10px', borderRadius: 'var(--radius-sm)' }}>
                                  <span>🏆 {winnerName} won</span>
                                  {mainBout.round > 0 && (
                                    <span style={{ color: 'var(--court-text-muted)', fontSize: '0.7rem' }}>
                                      • R{mainBout.round} {mainBout.time}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="ufc-event-footer">
                            <span>{formatDateTime(event, { includeWeekday: true, includeYear: true })}</span>
                            <span>{event.venue}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <p className="empty-state-text">
                      No events found for {selectedYear}. Select another year from the timeline above.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <p className="empty-state-text">No history found</p>
            </div>
          )}
        </>
      ) : (
        /* Fights Archive Search Mode */
        <div>
          <div className="search-bar" id="ufc-fights-search" style={{ marginBottom: '24px' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
              <path d="M14 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search across 2,275 historical fights by fighter or event (e.g. McGregor, Oliveira, Jones, UFC 300)..."
              value={fightQuery}
              onChange={e => setFightQuery(e.target.value)}
            />
          </div>

          <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
            Historical Bouts Archive
          </h3>
          <p className="section-subtitle">
            {fightsResults.length} bouts matching query
          </p>

          {loadingFights ? (
            <div className="empty-state">
              <div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🥊</div>
              <p className="empty-state-text">Searching fight archive...</p>
            </div>
          ) : fightsResults.length > 0 ? (
            <div className="ufc-fight-card" style={{ marginTop: '16px' }}>
              {fightsResults.map(fight => {
                const f1 = fight.fighter1 || {};
                const f2 = fight.fighter2 || {};
                const f1Win = Boolean(f1.winner);
                const f2Win = Boolean(f2.winner);
                const winner = f1Win ? f1 : (f2Win ? f2 : null);
                const loser = f1Win ? f2 : (f2Win ? f1 : null);

                return (
                  <div className="ufc-bout-card" key={fight.id}>
                    <div style={{ minWidth: '60px' }}>
                      <span className={`ufc-result-pill ${winner ? 'win' : 'draw'}`}>
                        {winner ? 'FINAL' : 'SCHEDULED'}
                      </span>
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className={f1Win ? 'winner' : f2Win ? 'loser' : ''}>{f1.name}</span>
                        {f1Win && <span className="ufc-winner-badge sm">✓ WIN</span>}
                        <span style={{ fontSize: '0.72rem', color: '#737373' }}>vs.</span>
                        <span className={f2Win ? 'winner' : f1Win ? 'loser' : ''}>{f2.name}</span>
                        {f2Win && <span className="ufc-winner-badge sm">✓ WIN</span>}
                      </div>

                      <div style={{ fontSize: '0.72rem', color: 'var(--court-text-muted)', marginTop: '4px' }}>
                        {fight.event_id ? (
                          <Link to={`/ufc/events/${fight.event_id}`} style={{ color: 'var(--court-accent)', textDecoration: 'none' }}>
                            {fight.event_name || 'UFC Event'}
                          </Link>
                        ) : (
                          fight.event_name || 'UFC Event'
                        )}{' '}
                        {fight.date ? `• ${fight.date}` : ''}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', minWidth: '130px' }}>
                      {winner ? (
                        <div className="ufc-bout-winner-text" style={{ fontSize: '0.76rem' }}>
                          🏆 {winner.name} def. {loser?.name}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.76rem', color: '#a3a3a3' }}>{fight.method}</div>
                      )}
                      {fight.round > 0 && (
                        <div className="ufc-bout-detail">Round {fight.round} • {fight.time || ''}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <p className="empty-state-text">No fights found matching "{fightQuery}"</p>
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}

export default UFCHistory;

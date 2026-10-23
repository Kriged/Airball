import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTeamLogos } from '../../utils/useTeamLogos';
import { useTimezone } from '../../context/useTimezone';
import { cachedResponseFetch } from '../../utils/cache';

function NFLTeamDetail() {
  const { teamAbbr } = useParams();
  const { formatDate, formatDateTime } = useTimezone();
  const [team, setTeam] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [roster, setRoster] = useState([]);
  const [activeTab, setActiveTab] = useState('schedule');
  const [loading, setLoading] = useState(true);

  const teamLogos = useTeamLogos('nfl');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      cachedResponseFetch(`/api/nfl/team/${teamAbbr}/info`).then(r => r.ok ? r.json() : null).catch(() => null),
      cachedResponseFetch(`/api/nfl/team/${teamAbbr}/schedule`).then(r => r.ok ? r.json() : []).catch(() => []),
      cachedResponseFetch(`/api/nfl/team/${teamAbbr}/roster`).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([teamData, schedData, rosterData]) => {
      if (cancelled) return;
      if (teamData) setTeam(teamData);
      setSchedule(schedData || []);
      setRoster(rosterData || []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [teamAbbr]);

  if (loading) {
    return (
      <main className="page-layout"><section className="page-content"><div className="container">
        <div className="empty-state"><div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🏈</div><p className="empty-state-text">Loading team details...</p></div>
      </div></section></main>
    );
  }

  if (!team) {
    return (
      <main className="page-layout"><section className="page-content"><div className="container">
        <div className="empty-state"><div className="empty-state-icon">❌</div><p className="empty-state-text">Team not found</p>
          <Link to="/nfl/standings" style={{ color: 'var(--court-accent)', marginTop: '12px', display: 'inline-block' }}>← Back to NFL Standings</Link>
        </div>
      </div></section></main>
    );
  }

  return (
    <main className="page-layout">
      {/* Team Hero */}
      <section style={{ background: '#0a0a0a', padding: 'clamp(24px, 5vw, 40px) 0 clamp(18px, 4vw, 28px)', borderBottom: '1px solid var(--court-border)' }}>
        <div className="container">
          <Link to="/nfl/standings" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>← Back to NFL Standings</Link>
          <h1 className="section-title" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', marginBottom: '8px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            {teamLogos[teamAbbr.toUpperCase()] && <img src={teamLogos[teamAbbr.toUpperCase()]} alt="" style={{ height: '36px', verticalAlign: 'middle' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
            <span>{team.name}</span>
          </h1>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-secondary)', alignItems: 'center' }}>
            {team.conference && <span>{team.conference} Conference</span>}
            {team.rank > 0 && <span>#{team.rank} Seed</span>}
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#FFFFFF' }}>{team.wins}-{team.losses}{team.ties > 0 ? `-${team.ties}` : ''}</span>
            {team.pct && <span>({team.pct})</span>}
            {team.streak && <span>Streak: <span className={`streak-badge ${team.streak?.startsWith('W') ? 'win-streak' : 'loss-streak'}`}>{team.streak}</span></span>}
          </div>
        </div>
      </section>

      {/* Content Tabs */}
      <section className="page-content">
        <div className="container">
          <div className="filter-tabs" id="nfl-team-tabs">
            <button className={`filter-tab ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>Schedule</button>
            <button className={`filter-tab ${activeTab === 'roster' ? 'active' : ''}`} onClick={() => setActiveTab('roster')}>Roster</button>
          </div>

          {activeTab === 'schedule' && (
            schedule.length > 0 ? (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Away</th><th>Home</th><th>Score</th><th>Result</th><th>Venue</th></tr></thead>
                  <tbody>
                    {schedule.map(g => (
                      <tr key={g.id}>
                        <td>
                          {g.status === 'UPCOMING'
                            ? formatDateTime(g, { includeWeekday: true })
                            : formatDate(g, { includeWeekday: true, includeYear: true })}
                        </td>
                        <td style={{ fontWeight: g.awayAbbr === teamAbbr.toUpperCase() ? 800 : 400 }}>
                          {teamLogos[g.awayAbbr] && <img src={teamLogos[g.awayAbbr]} alt="" className="table-team-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                          {g.away}
                        </td>
                        <td style={{ fontWeight: g.homeAbbr === teamAbbr.toUpperCase() ? 800 : 400 }}>
                          {teamLogos[g.homeAbbr] && <img src={teamLogos[g.homeAbbr]} alt="" className="table-team-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                          {g.home}
                        </td>
                        <td className="highlight" style={{ fontFamily: 'var(--font-mono)' }}>
                          {g.status === 'FINAL' ? `${g.awayScore}-${g.homeScore}` : '-'}
                        </td>
                        <td>{g.result ? <span className={`streak-badge ${g.result === 'W' ? 'win-streak' : g.result === 'L' ? 'loss-streak' : ''}`}>{g.result}</span> : '-'}</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--court-text-muted)' }}>{g.arena}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state"><div className="empty-state-icon">📅</div><p className="empty-state-text">No schedule data available</p></div>
            )
          )}

          {activeTab === 'roster' && (
            roster.length > 0 ? (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead><tr><th>#</th><th>Player</th><th>Pos</th><th>Height</th><th>Weight</th><th>Age</th><th>Exp</th></tr></thead>
                  <tbody>
                    {roster.map(p => (
                      <tr key={p.id}>
                        <td>{p.number}</td>
                        <td className="player-name">{p.name}</td>
                        <td><span className="accent">{p.pos}</span></td>
                        <td>{p.height}</td><td>{p.weight}</td><td>{p.age}</td>
                        <td>{p.experience > 0 ? `${p.experience} yr` : 'R'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state"><div className="empty-state-icon">👥</div><p className="empty-state-text">No roster data available</p></div>
            )
          )}
        </div>
      </section>
    </main>
  );
}

export default NFLTeamDetail;

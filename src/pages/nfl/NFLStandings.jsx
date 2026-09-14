import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { getCached, setCached, getSportCacheKey } from '../../utils/cache';

const CACHE_KEY = getSportCacheKey('nfl', 'standings');

function NFLStandings() {
  const [standingsData, setStandingsData] = useState(() => {
    const cached = getCached(CACHE_KEY, 120000);
    return cached ? cached.data : { AFC: [], NFC: [] };
  });
  const [loading, setLoading] = useState(() => !getCached(CACHE_KEY, 120000));
  const [activeConf, setActiveConf] = useState('AFC');

  useEffect(() => {
    const cached = getCached(CACHE_KEY, 120000);
    if (cached && !cached.isStale) return;
    let isMounted = true;
    fetch('/api/nfl/standings')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(data => {
        if (!isMounted) return;
        setStandingsData(data || { AFC: [], NFC: [] });
        setCached(CACHE_KEY, data);
        setLoading(false);
      })
      .catch(err => { if (isMounted) { console.error('NFL standings error:', err); setLoading(false); } });
    return () => { isMounted = false; };
  }, []);

  const standings = standingsData[activeConf] || [];

  // Group by division
  const divisions = {};
  standings.forEach(team => {
    const div = team.division || 'Division';
    if (!divisions[div]) divisions[div] = [];
    divisions[div].push(team);
  });

  return (
    <PageLayout title="NFL Standings" subtitle="Conference and division standings" icon="📋" accentColor="#013369" bannerImage="/images/standings.png">
      <div className="filter-tabs" id="nfl-standings-conf-tabs">
        <button className={`filter-tab ${activeConf === 'AFC' ? 'active' : ''}`}
          onClick={() => setActiveConf('AFC')} id="nfl-standings-afc">AFC</button>
        <button className={`filter-tab ${activeConf === 'NFC' ? 'active' : ''}`}
          onClick={() => setActiveConf('NFC')} id="nfl-standings-nfc">NFC</button>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🏈</div>
          <p className="empty-state-text">Loading NFL standings...</p>
        </div>
      ) : Object.keys(divisions).length > 0 ? (
        Object.entries(divisions).map(([divName, teams]) => (
          <div key={divName} className="nfl-division-group">
            <div className="nfl-division-title">{divName}</div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>#</th><th>Team</th><th>W</th><th>L</th><th>T</th><th>PCT</th><th>PF</th><th>PA</th><th>Streak</th></tr>
                </thead>
                <tbody>
                  {teams.map(team => (
                    <tr key={team.abbr}>
                      <td><span className={`standings-rank ${team.rank <= 7 ? 'playoff' : ''}`}>{team.rank || '-'}</span></td>
                      <td className="team-name"><Link to={`/nfl/teams/${team.abbr}`} className="td-team-link">{team.team}</Link></td>
                      <td className="highlight">{team.wins}</td>
                      <td>{team.losses}</td>
                      <td>{team.ties || 0}</td>
                      <td>{team.pct}</td>
                      <td>{team.pf}</td>
                      <td>{team.pa}</td>
                      <td><span className={`streak-badge ${team.streak?.startsWith('W') ? 'win-streak' : 'loss-streak'}`}>{team.streak}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>#</th><th>Team</th><th>W</th><th>L</th><th>T</th><th>PCT</th><th>Streak</th></tr></thead>
            <tbody>
              {standings.map(team => (
                <tr key={team.abbr}>
                  <td><span className={`standings-rank ${team.rank <= 7 ? 'playoff' : ''}`}>{team.rank || '-'}</span></td>
                  <td className="team-name"><Link to={`/nfl/teams/${team.abbr}`} className="td-team-link">{team.team}</Link></td>
                  <td className="highlight">{team.wins}</td>
                  <td>{team.losses}</td>
                  <td>{team.ties || 0}</td>
                  <td>{team.pct}</td>
                  <td><span className={`streak-badge ${team.streak?.startsWith('W') ? 'win-streak' : 'loss-streak'}`}>{team.streak}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="standings-legend">
        <div className="legend-item"><span className="legend-color playoff" /><span>Playoff Seed (1-7)</span></div>
      </div>
    </PageLayout>
  );
}

export default NFLStandings;

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';

function Standings() {
  const [standingsData, setStandingsData] = useState({ Eastern: [], Western: [] });
  const [loading, setLoading] = useState(true);
  const [activeConf, setActiveConf] = useState('Eastern');

  useEffect(() => {
    fetch('/api/standings')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setStandingsData(data || { Eastern: [], Western: [] });
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch standings:', err);
        setLoading(false);
      });
  }, []);

  const standings = standingsData[activeConf] || [];

  return (
    <PageLayout
      title="Standings"
      subtitle="Conference and division standings with live records"
      icon="📋"
      accentColor="#1d3557"
      bannerImage="/images/standings.png"
    >
      <div className="filter-tabs" id="standings-conf-tabs">
        <button
          className={`filter-tab ${activeConf === 'Eastern' ? 'active' : ''}`}
          onClick={() => setActiveConf('Eastern')}
          id="standings-eastern"
        >
          Eastern Conference
        </button>
        <button
          className={`filter-tab ${activeConf === 'Western' ? 'active' : ''}`}
          onClick={() => setActiveConf('Western')}
          id="standings-western"
        >
          Western Conference
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>📋</div>
          <p className="empty-state-text">Loading NBA conference standings...</p>
        </div>
      ) : (
        <>
          <div className="data-table-wrapper" id="standings-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>W</th>
              <th>L</th>
              <th>PCT</th>
              <th>GB</th>
              <th>Streak</th>
              <th>L10</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team) => (
              <tr key={team.abbr}>
                <td>
                  <span className={`standings-rank ${team.rank <= 6 ? 'playoff' : team.rank <= 10 ? 'playin' : ''}`}>
                    {team.rank}
                  </span>
                </td>
                <td className="team-name">
                  <Link to={`/teams/${team.abbr}`} className="td-team-link">{team.team}</Link>
                </td>
                <td className="highlight">{team.wins}</td>
                <td>{team.losses}</td>
                <td>{team.pct}</td>
                <td>{team.gb}</td>
                <td>
                  <span className={`streak-badge ${team.streak?.startsWith('W') ? 'win-streak' : 'loss-streak'}`}>
                    {team.streak}
                  </span>
                </td>
                <td>{team.last10}</td>
              </tr>
            ))}
          </tbody>
        </table>
          </div>

          <div className="standings-legend">
            <div className="legend-item">
              <span className="legend-color playoff" />
              <span>Playoff Seed (1-6)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color playin" />
              <span>Play-In (7-10)</span>
            </div>
          </div>
        </>
      )}
    </PageLayout>
  );
}

export default Standings;

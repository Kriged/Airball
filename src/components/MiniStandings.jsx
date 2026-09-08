import { useState } from 'react';
import { Link } from 'react-router-dom';
import './MiniStandings.css';

function MiniStandings({ liveStandings }) {
  const [activeConf, setActiveConf] = useState('WEST');

  const rawList = liveStandings
    ? (activeConf === 'WEST' ? liveStandings.Western : liveStandings.Eastern) || []
    : [];

  const list = rawList.slice(0, 8).map((t) => ({
    rank: t.rank,
    team: t.team ? t.team.split(' ').pop() : t.abbr,
    abbr: t.abbr,
    w: t.wins,
    l: t.losses,
    pct: t.pct,
    gb: t.gb
  }));

  return (
    <div className="glass-panel mini-standings-card">
      <div className="mini-standings-header">
        <span className="mini-standings-title">Conference Standings</span>
        <div className="mini-conf-pills">
          <button
            className={`mini-conf-btn ${activeConf === 'WEST' ? 'active' : ''}`}
            onClick={() => setActiveConf('WEST')}
          >
            West
          </button>
          <button
            className={`mini-conf-btn ${activeConf === 'EAST' ? 'active' : ''}`}
            onClick={() => setActiveConf('EAST')}
          >
            East
          </button>
        </div>
      </div>

      {list.length > 0 ? (
        <table className="mini-standings-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingLeft: 4 }}># Team</th>
              <th>W</th>
              <th>L</th>
              <th>PCT</th>
              <th style={{ textAlign: 'right', paddingRight: 4 }}>GB</th>
            </tr>
          </thead>
          <tbody>
            {list.map((item) => (
              <tr key={item.abbr || item.team}>
                <td>
                  <Link to={`/teams/${item.abbr}`} className="mini-standings-team-cell">
                    <span className="mini-standings-rank">{item.rank}</span>
                    <span>{item.team}</span>
                  </Link>
                </td>
                <td style={{ fontWeight: 800, color: '#FFFFFF' }}>{item.w}</td>
                <td>{item.l}</td>
                <td>{item.pct}</td>
                <td style={{ textAlign: 'right', paddingRight: 4, color: 'var(--court-text-muted)' }}>
                  {item.gb}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--court-text-muted)', fontSize: '0.75rem' }}>
          Conference standings will populate as games are played.
        </div>
      )}
    </div>
  );
}

export default MiniStandings;

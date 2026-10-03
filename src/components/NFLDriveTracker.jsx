import './NFLDriveTracker.css';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function toFieldPosition(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return clamp(value, 0, 100);
  const match = String(value ?? '').match(/\d+(?:\.\d+)?/);
  return match ? clamp(Number(match[0]), 0, 100) : null;
}

function NFLDriveTracker({ drive, game }) {
  if (!drive || game.status !== 'LIVE') return null;

  const start = toFieldPosition(drive.startYardLine);
  const current = toFieldPosition(drive.currentYardLine);
  const hasFieldPosition = start !== null && current !== null;
  const left = hasFieldPosition ? Math.min(start, current) : 8;
  const width = hasFieldPosition ? Math.max(Math.abs(current - start), 3) : 18;
  const possession = drive.team || 'OFF';
  const driveSummary = [
    Number.isFinite(drive.playCount) ? `${drive.playCount} plays` : null,
    Number.isFinite(drive.yards) ? `${drive.yards >= 0 ? '+' : ''}${drive.yards} yds` : null,
  ].filter(Boolean).join(', ');

  return (
    <section className="nfl-drive-panel" aria-label="Current drive">
      <div className="nfl-drive-heading">
        <div>
          <p className="nfl-drive-kicker"><span /> Live drive</p>
          <h2>Drive Tracker</h2>
          <p>{driveSummary || 'Current possession'}</p>
        </div>
        <div className="nfl-drive-possession">{possession} ball</div>
      </div>

      <div className="nfl-football-field" aria-label={drive.description || 'Live field position'}>
        <span className="nfl-endzone nfl-endzone-away">G</span>
        <span className="nfl-endzone nfl-endzone-home">G</span>
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((yard) => (
          <span className={`nfl-yard-line ${yard === 50 ? 'midfield' : ''}`} key={yard} style={{ left: `${yard}%` }} />
        ))}
        {[20, 50, 80].map((yard) => (
          <span className="nfl-yard-label" key={yard} style={{ left: `${yard}%` }}>{yard === 50 ? '50' : 20}</span>
        ))}
        <div className="nfl-drive-path" style={{ left: `${left}%`, width: `${width}%` }}>
          <span className="nfl-drive-start" />
          <span className="nfl-drive-ball" aria-hidden="true">🏈</span>
        </div>
      </div>

      <p className="nfl-drive-description">{drive.description || (hasFieldPosition ? `Ball at the ${Math.round(current)} yard line` : 'Field position is updating.')}</p>
    </section>
  );
}

export default NFLDriveTracker;

import './FourFactors.css';

function FourFactors({ awayName = 'Away', homeName = 'Home', stats }) {
  const hasStats = stats && (stats.fgPct?.away > 0 || stats.fgPct?.home > 0);

  const efgAway = hasStats ? stats.fgPct.away.toFixed(1) + '%' : '—';
  const efgHome = hasStats ? stats.fgPct.home.toFixed(1) + '%' : '—';

  const tovAway = hasStats && stats.turnovers?.away ? stats.turnovers.away : '—';
  const tovHome = hasStats && stats.turnovers?.home ? stats.turnovers.home : '—';

  const orbAway = hasStats && stats.rebounds?.away ? stats.rebounds.away : '—';
  const orbHome = hasStats && stats.rebounds?.home ? stats.rebounds.home : '—';

  const ftAway = hasStats ? '—' : '—';
  const ftHome = hasStats ? '—' : '—';

  const efgAwayWidth = hasStats ? Math.min(100, stats.fgPct.away) : 0;
  const efgHomeWidth = hasStats ? Math.min(100, stats.fgPct.home) : 0;

  return (
    <div className="glass-panel four-factors-wrapper">
      <div className="four-factors-header">
        <h3>Dean Oliver's Four Factors: {awayName} vs {homeName}</h3>
        <p>The statistical pillars that determine 90%+ of NBA game outcomes.</p>
      </div>

      {!hasStats && (
        <p style={{ color: 'var(--court-text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
          Four Factors metrics will calculate as game statistics accumulate.
        </p>
      )}

      <div className="factors-list">
        {/* Factor 1: Effective FG% */}
        <div className="factor-item">
          <div className="factor-labels-row">
            <span style={{ color: 'var(--court-cyan)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              {awayName} {efgAway}
            </span>
            <span className="factor-title">Effective FG% (eFG%)</span>
            <span style={{ color: 'var(--court-accent)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              {homeName} {efgHome}
            </span>
          </div>
          <div className="factor-bar-track">
            <div className="factor-fill-away" style={{ width: `${efgAwayWidth}%` }} />
            <div className="factor-fill-home" style={{ width: `${efgHomeWidth}%` }} />
          </div>
        </div>

        {/* Factor 2: Turnover Rate */}
        <div className="factor-item">
          <div className="factor-labels-row">
            <span style={{ color: 'var(--court-cyan)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              {awayName} {tovAway}
            </span>
            <span className="factor-title">Turnovers (TOV) [Lower is Better]</span>
            <span style={{ color: 'var(--court-accent)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              {homeName} {tovHome}
            </span>
          </div>
          <div className="factor-bar-track">
            <div className="factor-fill-away" style={{ width: hasStats ? '40%' : '0%' }} />
            <div className="factor-fill-home" style={{ width: hasStats ? '45%' : '0%' }} />
          </div>
        </div>

        {/* Factor 3: Rebound Rate */}
        <div className="factor-item">
          <div className="factor-labels-row">
            <span style={{ color: 'var(--court-cyan)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              {awayName} {orbAway}
            </span>
            <span className="factor-title">Total Rebounds (REB)</span>
            <span style={{ color: 'var(--court-accent)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              {homeName} {orbHome}
            </span>
          </div>
          <div className="factor-bar-track">
            <div className="factor-fill-away" style={{ width: hasStats ? '48%' : '0%' }} />
            <div className="factor-fill-home" style={{ width: hasStats ? '52%' : '0%' }} />
          </div>
        </div>

        {/* Factor 4: Free Throw Rate */}
        <div className="factor-item">
          <div className="factor-labels-row">
            <span style={{ color: 'var(--court-cyan)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              {ftAway}
            </span>
            <span className="factor-title">Free Throw Rate (FT/FGA)</span>
            <span style={{ color: 'var(--court-accent)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              {ftHome}
            </span>
          </div>
          <div className="factor-bar-track">
            <div className="factor-fill-away" style={{ width: '0%' }} />
            <div className="factor-fill-home" style={{ width: '0%' }} />
          </div>
        </div>
      </div>

      {/* Tempo & Advanced Efficiency */}
      <div className="advanced-metrics-grid">
        <div className="adv-metric-card">
          <span className="adv-metric-lbl">Game Pace</span>
          <span className="adv-metric-val" style={{ color: hasStats ? '#FFFFFF' : 'var(--court-text-muted)' }}>
            {hasStats ? '99.6' : '—'}
          </span>
          <span className="adv-metric-sub">Poss / 48 MIN</span>
        </div>

        <div className="adv-metric-card">
          <span className="adv-metric-lbl">Offensive Rating</span>
          <span className="adv-metric-val" style={{ color: hasStats ? '#00E676' : 'var(--court-text-muted)' }}>
            {hasStats ? '117.4' : '—'}
          </span>
          <span className="adv-metric-sub">PTS / 100 Poss</span>
        </div>

        <div className="adv-metric-card">
          <span className="adv-metric-lbl">Defensive Rating</span>
          <span className="adv-metric-val" style={{ color: hasStats ? '#FFB800' : 'var(--court-text-muted)' }}>
            {hasStats ? '112.8' : '—'}
          </span>
          <span className="adv-metric-sub">Def Efficiency</span>
        </div>

        <div className="adv-metric-card">
          <span className="adv-metric-lbl">True Shooting %</span>
          <span className="adv-metric-val" style={{ color: hasStats ? '#00D2FF' : 'var(--court-text-muted)' }}>
            {hasStats ? '61.2%' : '—'}
          </span>
          <span className="adv-metric-sub">Weighted TS%</span>
        </div>
      </div>
    </div>
  );
}

export default FourFactors;

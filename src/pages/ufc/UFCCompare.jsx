import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { useFighterPhoto } from '../../utils/useFighterPhoto';
import './UFC.css';

const DEFAULT_FIGHTER_1 = 'conor-mcgregor';
const DEFAULT_FIGHTER_2 = 'dustin-poirier';

const FEATURED_MATCHUPS = [
  { f1: 'conor-mcgregor', f2: 'dustin-poirier', label: 'McGregor vs. Poirier' },
  { f1: 'jon-jones', f2: 'stipe-miocic', label: 'Jones vs. Miocic' },
  { f1: 'islam-makhachev', f2: 'charles-oliveira', label: 'Makhachev vs. Oliveira' },
  { f1: 'alex-pereira', f2: 'israel-adesanya', label: 'Pereira vs. Adesanya' },
  { f1: 'sean-omalley', f2: 'merab-dvalishvili', label: "O'Malley vs. Dvalishvili" },
];

function FighterAvatar({ name }) {
  const photoUrl = useFighterPhoto(name);
  return photoUrl ? (
    <img
      src={photoUrl}
      alt={name}
      style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '1px solid #222', background: '#141414' }}
      onError={(e) => { e.currentTarget.style.display = 'none'; }}
    />
  ) : (
    <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#141414', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
      🥊
    </div>
  );
}

function UFCCompare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const f1Param = searchParams.get('f1') || searchParams.get('fighter1') || DEFAULT_FIGHTER_1;
  const f2Param = searchParams.get('f2') || searchParams.get('fighter2') || DEFAULT_FIGHTER_2;

  const [fighter1Id, setFighter1Id] = useState(f1Param);
  const [fighter2Id, setFighter2Id] = useState(f2Param);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allFighters, setAllFighters] = useState([]);

  // Load fighter dropdown options
  useEffect(() => {
    fetch('/api/ufc/fighters?limit=200&sort_by=wins')
      .then(r => r.ok ? r.json() : [])
      .then(d => {
        const list = Array.isArray(d) ? d : (d.data || []);
        setAllFighters(list);
      })
      .catch(() => {});
  }, []);

  // Fetch head-to-head comparison
  useEffect(() => {
    if (!fighter1Id || !fighter2Id) return;
    let cancelled = false;

    fetch(`/api/ufc/fighters/compare?fighter1=${encodeURIComponent(fighter1Id)}&fighter2=${encodeURIComponent(fighter2Id)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled && data && !data.error) {
          setComparison(data);
          setLoading(false);
        } else if (!cancelled) {
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [fighter1Id, fighter2Id]);

  const handleSelectMatchup = (f1, f2) => {
    setFighter1Id(f1);
    setFighter2Id(f2);
    setSearchParams({ f1, f2 });
  };

  const statMetrics = [
    { key: 'slpm', label: 'Strikes Landed/Min', isHigherBetter: true, format: (v) => Number(v).toFixed(2) },
    { key: 'str_acc', label: 'Strike Accuracy', isHigherBetter: true, format: (v) => `${Math.round(v * 100)}%` },
    { key: 'sapm', label: 'Strikes Absorbed/Min', isHigherBetter: false, format: (v) => Number(v).toFixed(2) },
    { key: 'str_def', label: 'Strike Defense', isHigherBetter: true, format: (v) => `${Math.round(v * 100)}%` },
    { key: 'td_avg', label: 'Takedowns / 15m', isHigherBetter: true, format: (v) => Number(v).toFixed(2) },
    { key: 'td_acc', label: 'Takedown Accuracy', isHigherBetter: true, format: (v) => `${Math.round(v * 100)}%` },
    { key: 'td_def', label: 'Takedown Defense', isHigherBetter: true, format: (v) => `${Math.round(v * 100)}%` },
    { key: 'sub_avg', label: 'Submission Avg', isHigherBetter: true, format: (v) => Number(v).toFixed(2) },
  ];

  const f1 = comparison?.fighter1;
  const f2 = comparison?.fighter2;
  const stats = comparison?.stats_comparison || {};
  const advantages = comparison?.advantages || { fighter1: [], fighter2: [] };

  return (
    <PageLayout
      title="UFC Fighter Comparison"
      subtitle="Head-to-head Tale of the Tape and advantage analysis"
      icon="⚔️"
      accentColor="#D20A0A"
      bannerImage="/images/standings.png"
    >
      {/* Featured Matchups Quick Bar */}
      <div style={{ marginBottom: '20px' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--court-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '10px' }}>
          Featured Matchups:
        </span>
        <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
          {FEATURED_MATCHUPS.map(m => (
            <button
              key={m.label}
              className={`filter-tab ${fighter1Id === m.f1 && fighter2Id === m.f2 ? 'active' : ''}`}
              onClick={() => handleSelectMatchup(m.f1, m.f2)}
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fighter Selectors */}
      <div className="ufc-filter-row" style={{ alignItems: 'center', gap: '16px', background: '#0a0a0a', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid #1a1a1a', marginBottom: '24px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--court-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Fighter 1
          </label>
          <select
            className="ufc-select"
            style={{ width: '100%' }}
            value={fighter1Id}
            onChange={(e) => {
              setLoading(true);
              setFighter1Id(e.target.value);
              setSearchParams({ f1: e.target.value, f2: fighter2Id });
            }}
            id="fighter1-select"
          >
            {allFighters.map(f => (
              <option key={f.id} value={f.id}>{f.name} ({f.record || 'UFC'})</option>
            ))}
          </select>
        </div>

        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#737373', marginTop: '14px' }}>
          VS
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--court-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Fighter 2
          </label>
          <select
            className="ufc-select"
            style={{ width: '100%' }}
            value={fighter2Id}
            onChange={(e) => {
              setLoading(true);
              setFighter2Id(e.target.value);
              setSearchParams({ f1: fighter1Id, f2: e.target.value });
            }}
            id="fighter2-select"
          >
            {allFighters.map(f => (
              <option key={f.id} value={f.id}>{f.name} ({f.record || 'UFC'})</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🥊</div>
          <p className="empty-state-text">Comparing fighters...</p>
        </div>
      ) : comparison && f1 && f2 ? (
        <div className="ufc-compare-container">
          {/* Side-by-Side Cards */}
          <div className="ufc-compare-header">
            <div className="ufc-compare-fighter-card">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <FighterAvatar name={f1.name} />
              </div>
              <Link to={`/ufc/fighters/${f1.id}`} style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff', textDecoration: 'none' }}>
                {f1.name}
              </Link>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--court-text-muted)', marginTop: '4px' }}>
                {f1.record}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#a3a3a3', marginTop: '2px' }}>
                {f1.division}
              </div>
            </div>

            <div className="ufc-compare-vs-badge">
              VS
            </div>

            <div className="ufc-compare-fighter-card">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <FighterAvatar name={f2.name} />
              </div>
              <Link to={`/ufc/fighters/${f2.id}`} style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff', textDecoration: 'none' }}>
                {f2.name}
              </Link>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--court-text-muted)', marginTop: '4px' }}>
                {f2.record}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#a3a3a3', marginTop: '2px' }}>
                {f2.division}
              </div>
            </div>
          </div>

          {/* Advantages Overview Box */}
          <div className="ufc-advantages-box">
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#e5e5e5', letterSpacing: '0.05em' }}>
              Stat Advantage Breakdown
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '12px' }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>{f1.name} Edge:</span>
                <div className="ufc-advantage-list">
                  {advantages.fighter1 && advantages.fighter1.length > 0 ? (
                    advantages.fighter1.map(adv => (
                      <span key={adv} className="ufc-advantage-tag">✓ {adv}</span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--court-text-muted)' }}>None recorded</span>
                  )}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>{f2.name} Edge:</span>
                <div className="ufc-advantage-list">
                  {advantages.fighter2 && advantages.fighter2.length > 0 ? (
                    advantages.fighter2.map(adv => (
                      <span key={adv} className="ufc-advantage-tag">✓ {adv}</span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--court-text-muted)' }}>None recorded</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Head-to-Head Comparative Metric Bars */}
          <div className="ufc-leaderboard-card">
            <div className="ufc-leaderboard-title">
              <span>{f1.name}</span>
              <span style={{ color: 'var(--court-text-muted)', fontSize: '0.8rem' }}>STATISTICAL COMPARISON</span>
              <span>{f2.name}</span>
            </div>

            {statMetrics.map(m => {
              const v1 = stats[m.key]?.fighter1 ?? 0;
              const v2 = stats[m.key]?.fighter2 ?? 0;
              const maxVal = Math.max(v1, v2, 0.001);

              const f1IsBetter = m.isHigherBetter ? v1 > v2 : (v1 < v2 && v1 > 0);
              const f2IsBetter = m.isHigherBetter ? v2 > v1 : (v2 < v1 && v2 > 0);

              const f1Width = Math.min(Math.round((v1 / (maxVal * 1.2)) * 100), 100);
              const f2Width = Math.min(Math.round((v2 / (maxVal * 1.2)) * 100), 100);

              return (
                <div className="ufc-stat-comparison-row" key={m.key}>
                  <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: f1IsBetter ? 900 : 500, color: f1IsBetter ? '#52c41a' : '#a3a3a3' }}>
                    {m.format(v1)}
                  </div>

                  <div className="ufc-bar-wrapper">
                    <div
                      className="ufc-bar-fill-left"
                      style={{ width: `${f1Width}%`, background: f1IsBetter ? '#52c41a' : '#444' }}
                    />
                  </div>

                  <div style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#e5e5e5' }}>
                    {m.label}
                  </div>

                  <div className="ufc-bar-wrapper">
                    <div
                      className="ufc-bar-fill-right"
                      style={{ width: `${f2Width}%`, background: f2IsBetter ? '#52c41a' : '#444' }}
                    />
                  </div>

                  <div style={{ textAlign: 'left', fontFamily: 'var(--font-mono)', fontWeight: f2IsBetter ? 900 : 500, color: f2IsBetter ? '#52c41a' : '#a3a3a3' }}>
                    {m.format(v2)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tale of the Tape Physical Comparison */}
          <div className="ufc-leaderboard-card" style={{ marginTop: '16px' }}>
            <div className="ufc-leaderboard-title">
              <span>Physical Attributes</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', textAlign: 'center' }}>
              <div className="ufc-stat-box">
                <div className="ufc-stat-box-lbl">Height</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                  {f1.height || '--'} vs. {f2.height || '--'}
                </div>
              </div>
              <div className="ufc-stat-box">
                <div className="ufc-stat-box-lbl">Weight</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                  {f1.weight || '--'} vs. {f2.weight || '--'}
                </div>
              </div>
              <div className="ufc-stat-box">
                <div className="ufc-stat-box-lbl">Reach</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                  {f1.reach || '--'} vs. {f2.reach || '--'}
                </div>
              </div>
              <div className="ufc-stat-box">
                <div className="ufc-stat-box-lbl">Stance</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                  {f1.stance || 'Orthodox'} vs. {f2.stance || 'Orthodox'}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <p className="empty-state-text">Could not load head-to-head comparison.</p>
        </div>
      )}
    </PageLayout>
  );
}

export default UFCCompare;

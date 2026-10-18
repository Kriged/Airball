import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { getCached, setCached, getSportCacheKey } from '../../utils/cache';
import { useFighterPhoto } from '../../utils/useFighterPhoto';
import './UFC.css';

const CACHE_KEY = getSportCacheKey('ufc', 'fighters_all');

const DIVISIONS = [
  'All Divisions',
  'Heavyweight',
  'Light Heavyweight',
  'Middleweight',
  'Welterweight',
  'Lightweight',
  'Featherweight',
  'Bantamweight',
  'Flyweight',
  "Women's Strawweight",
  "Women's Flyweight",
  "Women's Bantamweight"
];

/** Inner card component — isolates useFighterPhoto per fighter */
function FighterCard({ fighter }) {
  const photoUrl = useFighterPhoto(fighter.name);
  const fid = fighter.id || fighter.name.toLowerCase().replace(/\s+/g, '-');

  return (
    <Link to={`/ufc/fighters/${fid}`} className="ufc-fighter-card-link">
      <div className="ufc-fighter-card" id={`ufc-fighter-${fid}`}>
        <div className="ufc-fighter-card-photo-row">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={fighter.name}
              className="ufc-fighter-card-photo"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className="ufc-fighter-card-photo-placeholder">🥊</div>
          )}
        </div>
        <div className="ufc-fighter-card-name">{fighter.name}</div>
        <div className="ufc-fighter-card-meta">
          {fighter.record && <span className="ufc-fighter-card-record">{fighter.record}</span>}
          <span>{fighter.division || fighter.weight_class || fighter.weightClass || 'UFC'}</span>
          {fighter.stance && <span style={{ color: '#737373' }}>{fighter.stance}</span>}
        </div>
      </div>
    </Link>
  );
}

function UFCFighters() {
  const [fighters, setFighters] = useState(() => {
    const c = getCached(CACHE_KEY, 300000);
    return c && Array.isArray(c.data) ? c.data : [];
  });
  const [loading, setLoading] = useState(() => !getCached(CACHE_KEY, 300000));
  const [search, setSearch] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('All Divisions');
  const [selectedStance, setSelectedStance] = useState('All');
  const [sortBy, setSortBy] = useState('wins');

  useEffect(() => {
    const c = getCached(CACHE_KEY, 300000);
    if (c && !c.isStale && Array.isArray(c.data) && c.data.length > 0) return;
    let m = true;

    fetch('/api/ufc/fighters?limit=500')
      .then(r => r.ok ? r.json() : [])
      .then(d => {
        if (m) {
          const list = Array.isArray(d) ? d : (d.data || []);
          setFighters(list);
          setCached(CACHE_KEY, list);
          setLoading(false);
        }
      })
      .catch(() => { if (m) setLoading(false); });
    return () => { m = false; };
  }, []);

  const filtered = fighters
    .filter(f => {
      const matchSearch = !search ||
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        (f.nickname && f.nickname.toLowerCase().includes(search.toLowerCase())) ||
        (f.division || f.weight_class || '').toLowerCase().includes(search.toLowerCase());

      const matchDiv = selectedDivision === 'All Divisions' ||
        (f.division || f.weight_class || '').toLowerCase().includes(selectedDivision.toLowerCase());

      const matchStance = selectedStance === 'All' ||
        (f.stance || '').toLowerCase() === selectedStance.toLowerCase();

      return matchSearch && matchDiv && matchStance;
    })
    .sort((a, b) => {
      if (sortBy === 'wins') return (b.wins || 0) - (a.wins || 0);
      if (sortBy === 'slpm') return (b.slpm || 0) - (a.slpm || 0);
      if (sortBy === 'str_acc') return (b.str_acc || 0) - (a.str_acc || 0);
      if (sortBy === 'td_avg') return (b.td_avg || 0) - (a.td_avg || 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <PageLayout
      title="UFC Fighters"
      subtitle="Explore UFC fighters, records, striking and grappling metrics"
      icon="🏃"
      accentColor="#D20A0A"
      bannerImage="/images/players.png"
    >
      {/* Search Bar */}
      <div className="search-bar" id="ufc-fighters-search">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/>
          <path d="M14 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          placeholder="Search by name, nickname, or division..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filter and Sort Row */}
      <div className="ufc-filter-row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select
            className="ufc-select"
            value={selectedDivision}
            onChange={e => setSelectedDivision(e.target.value)}
            id="ufc-division-filter"
          >
            {DIVISIONS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            className="ufc-select"
            value={selectedStance}
            onChange={e => setSelectedStance(e.target.value)}
            id="ufc-stance-filter"
          >
            <option value="All">All Stances</option>
            <option value="Orthodox">Orthodox</option>
            <option value="Southpaw">Southpaw</option>
            <option value="Switch">Switch</option>
          </select>

          <select
            className="ufc-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            id="ufc-sort-filter"
          >
            <option value="wins">Sort: Most Wins</option>
            <option value="slpm">Sort: Strikes/Min (SLpM)</option>
            <option value="str_acc">Sort: Strike Accuracy</option>
            <option value="td_avg">Sort: Takedown Avg</option>
            <option value="name">Sort: Alphabetical</option>
          </select>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--court-text-muted)' }}>
          Showing {filtered.length} of {fighters.length} fighters
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🥊</div>
          <p className="empty-state-text">Loading fighters...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="ufc-fighters-grid" id="ufc-fighters-list">
          {filtered.slice(0, 100).map(fighter => (
            <FighterCard key={fighter.id || fighter.name} fighter={fighter} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p className="empty-state-text">No fighters found matching "{search}"</p>
        </div>
      )}
    </PageLayout>
  );
}

export default UFCFighters;

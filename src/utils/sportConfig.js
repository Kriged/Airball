/**
 * SportDefinition Registry
 * Central config for each sport. The UI reads this to decide which pages,
 * nav links, colors, labels, and features to expose.
 */

export const SPORTS = {
  nba: {
    slug: 'nba',
    name: 'NBA',
    fullName: 'National Basketball Association',
    icon: '🏀',
    accentColor: '#FF5722',
    accentGlow: 'rgba(255, 87, 34, 0.25)',
    secondaryColor: '#FFB800',
    gradientFrom: '#FF5722',
    gradientTo: '#FFB800',
    eventLabel: 'Games',
    athleteLabel: 'Players',
    // Navigation items — order matters
    navItems: [
      { label: 'Games', path: 'games', icon: '🏀' },
      { label: 'Standings', path: 'standings', icon: '📋' },
      { label: 'Players', path: 'players', icon: '🏃' },
      { label: 'Stats', path: 'stats', icon: '📊' },
      { label: 'Seasons', path: 'seasons', icon: '🏆' },
    ],
    // Feature flags
    hasTeams: true,
    hasStandings: true,
    hasRankings: false,
    hasAudio: true,
    eventType: 'game',
    // Position filters
    positions: ['All', 'PG', 'SG', 'SF', 'PF', 'C'],
    // Stat categories
    statCategories: ['Points', 'Rebounds', 'Assists', 'Steals', 'Blocks'],
    // Page subtitles
    subtitles: {
      home: 'Real-Time NBA Live Scores & Analytics',
      games: 'Box scores, schedules, and game results',
      standings: 'Conference and division standings with live records',
      players: 'Search and explore NBA players from all eras',
      stats: 'League leaders, analytics, and advanced metrics',
      seasons: 'Browse NBA seasons from the golden era to today',
    },
    // Banner accent colors per page
    pageAccents: {
      games: '#457b9d',
      standings: '#1d3557',
      players: '#e63946',
      stats: '#e63946',
      seasons: '#2563eb',
    },
  },

  nfl: {
    slug: 'nfl',
    name: 'NFL',
    fullName: 'National Football League',
    icon: '🏈',
    accentColor: '#013369',
    accentGlow: 'rgba(1, 51, 105, 0.3)',
    secondaryColor: '#D50A0A',
    gradientFrom: '#013369',
    gradientTo: '#D50A0A',
    eventLabel: 'Games',
    athleteLabel: 'Players',
    navItems: [
      { label: 'Games', path: 'games', icon: '🏈' },
      { label: 'Standings', path: 'standings', icon: '📋' },
      { label: 'Players', path: 'players', icon: '🏃' },
      { label: 'Stats', path: 'stats', icon: '📊' },
      { label: 'Seasons', path: 'seasons', icon: '🏆' },
    ],
    hasTeams: true,
    hasStandings: true,
    hasRankings: false,
    hasAudio: false,
    eventType: 'game',
    positions: ['All', 'QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'],
    statCategories: ['Passing', 'Rushing', 'Receiving', 'Sacks', 'Interceptions'],
    subtitles: {
      home: 'Real-Time NFL Scores, Drives & Analytics',
      games: 'Scores, schedules, and game results',
      standings: 'Conference and division standings',
      players: 'Search NFL players by position and team',
      stats: 'League leaders in passing, rushing, receiving & defense',
      seasons: 'NFL seasons and Super Bowl history',
    },
    pageAccents: {
      games: '#013369',
      standings: '#013369',
      players: '#D50A0A',
      stats: '#D50A0A',
      seasons: '#013369',
    },
  },

  ufc: {
    slug: 'ufc',
    name: 'UFC',
    fullName: 'Ultimate Fighting Championship',
    icon: '🥊',
    accentColor: '#D20A0A',
    accentGlow: 'rgba(210, 10, 10, 0.25)',
    secondaryColor: '#C4A747',
    gradientFrom: '#D20A0A',
    gradientTo: '#C4A747',
    eventLabel: 'Events',
    athleteLabel: 'Fighters',
    navItems: [
      { label: 'Events', path: 'events', icon: '🥊' },
      { label: 'Fighters', path: 'fighters', icon: '🏃' },
      { label: 'Rankings', path: 'rankings', icon: '📋' },
      { label: 'Stats', path: 'stats', icon: '📊' },
      { label: 'History', path: 'history', icon: '🏆' },
    ],
    hasTeams: false,
    hasStandings: false,
    hasRankings: true,
    hasAudio: false,
    eventType: 'event',
    positions: ['All', 'Flyweight', 'Bantamweight', 'Featherweight', 'Lightweight', 'Welterweight', 'Middleweight', 'Light Heavyweight', 'Heavyweight', "Women's Strawweight", "Women's Flyweight", "Women's Bantamweight"],
    statCategories: ['Striking', 'Takedowns', 'Submissions', 'Finish Rate'],
    subtitles: {
      home: 'Live UFC Events, Fight Cards & Fighter Rankings',
      events: 'Upcoming and recent UFC events and fight cards',
      fighters: 'Explore UFC fighters across all weight classes',
      rankings: 'Division rankings, P4P lists, and champion tracker',
      stats: 'Striking, takedown, and submission leaderboards',
      history: 'UFC event archive and title fight history',
    },
    pageAccents: {
      events: '#D20A0A',
      fighters: '#D20A0A',
      rankings: '#C4A747',
      stats: '#D20A0A',
      history: '#C4A747',
    },
  },
};

/** Get sport config by slug, defaults to NBA */
export function getSportConfig(slug) {
  return SPORTS[slug?.toLowerCase()] || SPORTS.nba;
}

/** All available sport slugs */
export const SPORT_SLUGS = Object.keys(SPORTS);

/** Default sport */
export const DEFAULT_SPORT = 'nba';

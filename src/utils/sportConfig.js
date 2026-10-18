/**
 * SportDefinition Registry
 * Central config for each sport. The UI reads this to decide which pages,
 * nav links, colors, labels, and features to expose.
 * Styled in black, charcoal black, and charcoal grey.
 */

export const SPORTS = {
  nba: {
    slug: 'nba',
    name: 'NBA',
    fullName: 'National Basketball Association',
    icon: '🏀',
    accentColor: '#e5e5e5',
    accentGlow: 'transparent',
    secondaryColor: '#a3a3a3',
    gradientFrom: '#1a1a1a',
    gradientTo: '#141414',
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
      games: '#1a1a1a',
      standings: '#1a1a1a',
      players: '#1a1a1a',
      stats: '#1a1a1a',
      seasons: '#1a1a1a',
    },
  },

  nfl: {
    slug: 'nfl',
    name: 'NFL',
    fullName: 'National Football League',
    icon: '🏈',
    accentColor: '#d4d4d4',
    accentGlow: 'transparent',
    secondaryColor: '#a3a3a3',
    gradientFrom: '#1a1a1a',
    gradientTo: '#141414',
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
      games: '#1a1a1a',
      standings: '#1a1a1a',
      players: '#1a1a1a',
      stats: '#1a1a1a',
      seasons: '#1a1a1a',
    },
  },

  ufc: {
    slug: 'ufc',
    name: 'UFC',
    fullName: 'Ultimate Fighting Championship',
    icon: '🥊',
    accentColor: '#e5e5e5',
    accentGlow: 'transparent',
    secondaryColor: '#a3a3a3',
    gradientFrom: '#1a1a1a',
    gradientTo: '#141414',
    eventLabel: 'Events',
    athleteLabel: 'Fighters',
    navItems: [
      { label: 'Events', path: 'events', icon: '🥊' },
      { label: 'Fighters', path: 'fighters', icon: '🏃' },
      { label: 'Compare', path: 'compare', icon: '⚔️' },
      { label: 'Rankings', path: 'rankings', icon: '📋' },
      { label: 'Stats', path: 'stats', icon: '📊' },
      { label: 'History', path: 'history', icon: '🏆' },
    ],
    hasTeams: false,
    hasStandings: false,
    hasRankings: true,
    hasAudio: false,
    eventType: 'event',
    positions: ['All', 'Heavyweight', 'Light Heavyweight', 'Middleweight', 'Welterweight', 'Lightweight', 'Featherweight', 'Bantamweight', 'Flyweight', "Women's Featherweight", "Women's Bantamweight", "Women's Flyweight", "Women's Strawweight"],
    statCategories: ['Striking (SLpM)', 'Strike Accuracy', 'Takedowns', 'Takedown Defense', 'Submissions', 'Total Wins'],
    subtitles: {
      home: 'Live UFC Events, Fight Cards & Fighter Rankings',
      events: 'Upcoming and recent UFC events and fight cards',
      fighters: 'Explore UFC fighters across all weight classes',
      rankings: 'Division rankings, P4P lists, and champion tracker',
      stats: 'Striking, takedown, and submission leaderboards',
      history: 'UFC event archive and title fight history',
    },
    pageAccents: {
      events: '#1a1a1a',
      fighters: '#1a1a1a',
      rankings: '#1a1a1a',
      stats: '#1a1a1a',
      history: '#1a1a1a',
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

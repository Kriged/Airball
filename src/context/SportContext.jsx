import { createContext, useContext, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { getSportConfig, DEFAULT_SPORT } from '../utils/sportConfig';

const SportContext = createContext(null);

/**
 * Provides the active sport config based on URL params.
 * Reads `:sport` from the URL (e.g., /nfl/games → sport = 'nfl').
 * Falls back to detecting sport from pathname prefix, then defaults to NBA.
 */
export function SportProvider({ children }) {
  const params = useParams();
  const location = useLocation();

  const sportSlug = useMemo(() => {
    // First check URL params (from nested routes like /:sport/games)
    if (params.sport) return params.sport.toLowerCase();

    // Fallback: detect from pathname prefix
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments[0] && ['nba', 'nfl', 'ufc'].includes(segments[0].toLowerCase())) {
      return segments[0].toLowerCase();
    }

    return DEFAULT_SPORT;
  }, [params.sport, location.pathname]);

  const config = useMemo(() => getSportConfig(sportSlug), [sportSlug]);

  const value = useMemo(() => ({
    sport: sportSlug,
    config,
  }), [sportSlug, config]);

  return (
    <SportContext.Provider value={value}>
      {children}
    </SportContext.Provider>
  );
}

/**
 * Hook to access the current sport context.
 * Returns { sport: 'nba'|'nfl'|'ufc', config: SportDefinition }
 */
export function useSport() {
  const ctx = useContext(SportContext);
  if (!ctx) {
    // Outside of SportProvider — return NBA defaults
    return { sport: DEFAULT_SPORT, config: getSportConfig(DEFAULT_SPORT) };
  }
  return ctx;
}

export default SportContext;

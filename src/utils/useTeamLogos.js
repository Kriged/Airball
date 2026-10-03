/**
 * useTeamLogos
 * Fetches the full team logo map for a sport once per browser session.
 * Stores the result in sessionStorage so it survives page navigation
 * but is refetched on a new tab/session.
 *
 * Usage:
 *   const logos = useTeamLogos('nba');
 *   // logos === { LAL: 'https://...', BOS: 'https://...', ... }
 *   <img src={logos[game.homeAbbr]} alt={game.home} />
 */

import { useState, useEffect } from 'react';

const SESSION_KEY_PREFIX = 'sport_logos_';

/**
 * @param {'nba' | 'nfl'} sport
 * @returns {Record<string, string>} map of abbreviation -> logo URL
 */
export function useTeamLogos(sport) {
  const sessionKey = `${SESSION_KEY_PREFIX}${sport}`;

  const [logos, setLogos] = useState(() => {
    try {
      const stored = sessionStorage.getItem(sessionKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!sport || !['nba', 'nfl'].includes(sport)) return;

    // If already hydrated from sessionStorage, skip the fetch
    if (Object.keys(logos).length > 0) return;

    let cancelled = false;
    fetch(`/api/${sport}/teams/logos`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (cancelled) return;
        if (data && typeof data === 'object') {
          setLogos(data);
          try {
            sessionStorage.setItem(sessionKey, JSON.stringify(data));
          } catch {
            // sessionStorage might be full — silently skip
          }
        }
      })
      .catch(err => {
        if (!cancelled) console.warn(`[useTeamLogos] Failed to fetch ${sport} logos:`, err);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport]);

  return logos;
}

export default useTeamLogos;

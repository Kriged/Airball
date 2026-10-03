/**
 * useSportPolling
 * Reactive polling hook that adjusts fetch interval based on whether a game
 * is currently live.  Designed to be used anywhere the app fetches
 * time-sensitive sport data (scores, events).
 *
 * Usage:
 *   const { data, loading, error } = useSportPolling(
 *     () => fetch('/api/nba/games/today').then(r => r.json()),
 *     { sport: 'nba', isLive: games.some(g => g.status === 'LIVE') }
 *   );
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Per-sport polling intervals in milliseconds
export const POLL_INTERVALS = {
  nba: { live: 15000, idle: 60000 },
  nfl: { live: 20000, idle: 120000 },
  ufc: { live: 10000, idle: 300000 }, // UFC rounds are short
};

/** Fallback intervals when sport is not recognised */
const DEFAULT_INTERVALS = { live: 20000, idle: 60000 };

/**
 * @param {() => Promise<any>} fetchFn  - async function that returns the data
 * @param {object} options
 * @param {string}  options.sport       - 'nba' | 'nfl' | 'ufc'
 * @param {boolean} [options.isLive]    - true when a game is currently live
 * @param {boolean} [options.disabled]  - set true to pause polling entirely
 * @param {(data: any) => void} [options.onData] - optional callback fired with each
 *   successful response. When provided, the hook's internal `data` state is NOT
 *   updated — callers can manage their own state instead.
 * @returns {{ data: any, loading: boolean, error: Error|null, refetch: () => void }}
 */
export function useSportPolling(fetchFn, { sport, isLive = false, disabled = false, onData } = {}) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const mountedRef             = useRef(true);
  const intervalRef            = useRef(null);
  const onDataRef              = useRef(onData);
  onDataRef.current = onData; // keep stable ref without adding to effect deps

  const intervals = POLL_INTERVALS[sport?.toLowerCase()] || DEFAULT_INTERVALS;
  const interval  = isLive ? intervals.live : intervals.idle;

  const execute = useCallback(async () => {
    try {
      const result = await fetchFn();
      if (!mountedRef.current) return;
      if (onDataRef.current) {
        onDataRef.current(result);
      } else {
        setData(result);
      }
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetchFn]);

  // Re-schedule whenever interval or disabled flag changes
  useEffect(() => {
    mountedRef.current = true;

    if (disabled) {
      setLoading(false);
      return;
    }

    // Fire immediately on mount / interval change
    execute();

    intervalRef.current = setInterval(execute, interval);

    return () => {
      clearInterval(intervalRef.current);
    };
  }, [execute, interval, disabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearInterval(intervalRef.current);
    };
  }, []);

  return { data, loading, error, refetch: execute };
}

export default useSportPolling;

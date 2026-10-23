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
  nba: { live: 15000, idle: 900000 },
  nfl: { live: 20000, idle: 900000 },
  ufc: { live: 10000, idle: 300000 }, // UFC rounds are short
};

/** Fallback intervals when sport is not recognised */
const DEFAULT_INTERVALS = { live: 20000, idle: 60000 };

function documentIsVisible() {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}

function containsLiveGame(result) {
  const games = Array.isArray(result) ? result : (result?.games || result?.data || []);
  if (!Array.isArray(games)) return false;
  return games.some((game) => {
    const status = String(game?.status || game?.state || '').toUpperCase();
    return ['LIVE', 'IN_PROGRESS', 'IN PROGRESS', 'HALFTIME'].includes(status);
  });
}

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
  const [loading, setLoading] = useState(() => !disabled);
  const [error, setError]     = useState(null);
  const [visible, setVisible] = useState(documentIsVisible);
  const [detectedLive, setDetectedLive] = useState(false);
  const mountedRef             = useRef(true);
  const intervalRef            = useRef(null);
  const onDataRef              = useRef(onData);
  useEffect(() => {
    onDataRef.current = onData;
  }, [onData]);

  const intervals = POLL_INTERVALS[sport?.toLowerCase()] || DEFAULT_INTERVALS;
  const interval  = (isLive || detectedLive) ? intervals.live : intervals.idle;

  const execute = useCallback(async () => {
    if (!documentIsVisible()) return;
    try {
      const result = await fetchFn();
      if (!mountedRef.current) return;
      setDetectedLive(containsLiveGame(result));
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

  useEffect(() => {
    const updateVisibility = () => setVisible(documentIsVisible());
    document?.addEventListener?.('visibilitychange', updateVisibility);
    return () => document?.removeEventListener?.('visibilitychange', updateVisibility);
  }, []);

  // Re-schedule whenever interval or disabled flag changes
  useEffect(() => {
    mountedRef.current = true;

    if (disabled || !visible) {
      return;
    }

    // Schedule the first fetch after this effect commits. This avoids a
    // state update during effect setup while still fetching immediately.
    const initialFetchTimer = setTimeout(execute, 0);

    intervalRef.current = setInterval(execute, interval);

    return () => {
      clearTimeout(initialFetchTimer);
      clearInterval(intervalRef.current);
    };
  }, [execute, interval, disabled, visible]);

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

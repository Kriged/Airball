/**
 * In-memory client-side cache utility for instant page transitions and SWR (Stale-While-Revalidate).
 * Supports sport-namespaced keys for multi-sport isolation.
 */

const memoryCache = new Map();

/**
 * Build a sport-namespaced cache key.
 * @param {string} sport - Sport slug (e.g., 'nba', 'nfl', 'ufc')
 * @param {string} key - Base cache key
 * @returns {string} Namespaced key like 'nfl:standings'
 */
export function getSportCacheKey(sport, key) {
  return `${sport}:${key}`;
}

/**
 * Retrieves cached data by key.
 * @param {string} key
 * @param {number} maxAgeMs - Maximum age in ms before data is considered stale (default 60s)
 * @returns {{ data: any, isStale: boolean } | null}
 */
export function getCached(key, maxAgeMs = 60000) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  const isStale = (Date.now() - entry.timestamp) > maxAgeMs;
  return { data: entry.data, isStale };
}

/**
 * Stores data in the client-side cache.
 * @param {string} key
 * @param {any} data
 */
export function setCached(key, data) {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Clears the client-side cache.
 */
export function clearCache(key) {
  if (key) {
    memoryCache.delete(key);
  } else {
    memoryCache.clear();
  }
}

/**
 * In-memory client-side cache utility for instant page transitions and SWR (Stale-While-Revalidate).
 * Supports sport-namespaced keys for multi-sport isolation.
 */

const memoryCache = new Map();
const inFlightRequests = new Map();
const API_CACHE_PREFIX = 'airball_cache:';
export const MEMORY_TTL_MS = 30_000;

function readPersistentCache(url) {
  try {
    const raw = localStorage.getItem(`${API_CACHE_PREFIX}${url}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writePersistentCache(url, data) {
  try {
    localStorage.setItem(`${API_CACHE_PREFIX}${url}`, JSON.stringify({ timestamp: Date.now(), data }));
  } catch {
    // Storage is an optional resilience layer; quota/privacy errors are harmless.
  }
}

function isFallbackPayload(data) {
  return Boolean(data && typeof data === 'object' && (
    data.fallback || data.rate_limited || data.quota_exhausted || data.error
  ));
}

/**
 * Fetch an API response once per URL, even when StrictMode mounts more than one
 * consumer. Successful payloads are persisted so an offline/rate-limited tab can
 * render its last known response without waiting on the network.
 */
export async function cachedFetch(url, options = {}) {
  const { force = false, ...fetchOptions } = options;
  const cached = readPersistentCache(url);

  if (!force && cached && Date.now() - cached.timestamp < MEMORY_TTL_MS) {
    return cached.data;
  }
  if (inFlightRequests.has(url)) {
    return inFlightRequests.get(url);
  }

  const request = fetch(url, fetchOptions)
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (isFallbackPayload(data) && cached?.data) return cached.data;
      writePersistentCache(url, data);
      return data;
    })
    .catch((error) => {
      if (cached?.data !== undefined) return cached.data;
      throw error;
    })
    .finally(() => {
      inFlightRequests.delete(url);
    });

  inFlightRequests.set(url, request);
  return request;
}

/**
 * Compatibility wrapper for screens that still need a Fetch-like response.
 * It keeps those callers on the same deduplicated/local-storage request path.
 */
export async function cachedResponseFetch(url, options = {}) {
  const data = await cachedFetch(url, options);
  return { ok: true, status: 200, json: async () => data };
}

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

# Airball serverless resilience implementation

Airball serves successful GET API responses through Vercel's shared edge cache. Live
score routes use `s-maxage=45, stale-while-revalidate=300`; standings and stats use
30 minutes/24 hours; team and fighter reference data use 12 hours/24 hours. Failed
responses are always `no-store`.

The Flask cache persists its entries and provider cooldown timestamps to
`/tmp/airball_cache.json` for warm Vercel invocations. Provider requests use strict
2-second connect and 3-second read limits, do not retry, and open a persisted circuit
for 60 seconds (or `Retry-After`) on 402/403/429, and 15 seconds on timeouts/5xx.
Adapters return their stale or bundled fallback data when that circuit is open.

On the client, `cachedFetch` deduplicates in-flight calls by URL and keeps successful
payloads in `localStorage` under `airball_cache:<url>`. Network failures and flagged
fallback payloads use that snapshot immediately. NBA and NFL polling is suspended in
hidden tabs and switches to a 15-minute cadence when no live game is present.

## Verification

- `python -m pytest -q` checks the Flask routes, cache headers, and circuit breaker.
- `npm test -- --run` checks the frontend proxy suite, in-flight deduplication,
  local-storage fallback, and hidden-tab polling behavior.
- In a Vercel preview, inspect `Cache-Control` and `x-vercel-cache` on repeated
  `/api/*` requests; the first response should be a miss and subsequent responses
  should be `HIT` or `STALE` without further provider calls.

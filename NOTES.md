# Airball / BasketballDatabase notes

## What this app does

This is a React single-page sports dashboard for NBA, NFL, and UFC data. The browser calls `/api/...` endpoints for scoreboards, standings, schedules, players, and event details; a Flask backend retrieves the underlying data from ESPN's public-but-unofficial endpoints and reshapes it for the UI. Both the browser and backend cache frequently used responses, and the home pages poll more often while an event is live. In development, Vite sends `/api` traffic to Flask; in the deployed Vercel configuration, `/api` is rewritten to the Render backend.

## Folder and major-file map

| Path | Responsibility |
| --- | --- |
| `src/` | React application source code. |
| `src/main.jsx` | Browser entry point: creates the React root and renders `App`. |
| `src/App.jsx` | Declares all client-side routes for NBA, NFL, and UFC, and wraps them in `SportProvider`. |
| `src/pages/nba/` | NBA page components (`NBAHome`, game detail, standings, players, stats, and so on); each component owns one screen. |
| `src/pages/nfl/` | NFL equivalents of the NBA page components. |
| `src/pages/ufc/` | UFC home, event, fighter, rankings, stats, and history screens. |
| `src/components/` | Shared UI pieces such as `Navbar`, `ScorebugHero`, `MiniStandings`, `Lineups`, and `NFLDriveTracker`, plus their colocated CSS. |
| `src/context/SportContext.jsx` | Derives the selected sport from the URL and exposes its configuration through `SportProvider` / `useSport`. |
| `src/utils/sportConfig.js` | The declarative NBA/NFL/UFC labels, navigation entries, colours, and feature flags. |
| `src/utils/polling.js` | `useSportPolling`, the reusable immediate-fetch plus interval-polling hook. |
| `src/utils/cache.js` | Browser-only, in-memory cache (`getCached`, `setCached`); it disappears on a full page reload. |
| `src/utils/useTeamLogos.js` and `src/utils/useFighterPhoto.js` | React hooks for supplemental logo and fighter-image API requests. |
| `src/assets/` | Bundled image assets imported by React. |
| `public/` | Static files served as-is, including page/banner images and SVG assets. |
| `backend/` | Flask server code. |
| `backend/app.py` | Creates the Flask `app`, enables CORS, registers sport/logo routes, and starts background cache prewarming. |
| `backend/sports/registry.py` | Connects the three ESPN adapter `register_routes` functions to Flask. |
| `backend/adapters/espn_nba.py` | NBA ESPN requests, response mapping, and NBA Flask routes; `compute_games_list()` merges all 30 regular-season team schedules into one de-duplicated fixture list. |
| `backend/adapters/espn_nfl.py` | NFL ESPN requests, response mapping, and NFL Flask routes; it also exposes standings-backed team season fields and optional live-drive fields for game detail. |
| `backend/adapters/espn_ufc.py` | UFC ESPN requests, response mapping, and UFC Flask routes. |
| `backend/adapters/thesportsdb.py` | TheSportsDB team-logo and fighter-photo endpoints. |
| `backend/core/cache.py` | Thread-safe process-memory stale-while-revalidate cache used by adapters. |
| `backend/core/provider_client.py` | Shared `requests.Session`, retry configuration, ESPN URL helpers, and `fetch_json`. Note that several adapters call `session.get(...).json()` directly rather than `fetch_json`. |
| `backend/core/rate_limiter.py` | A daily token-bucket limiter intended for optional API-Sports calls; this file does not show a caller in the current backend adapters. |
| `app.py` | Small root-level launcher that imports `backend.app.app` and runs it. |
| `tests/` | Vitest tests, a test-only Python bridge, and captured ESPN fixture JSON. |
| `tests/fixtures/raw/` | Captured scoreboard responses used as baseline test data. |
| `tests/fixtures/edge_cases/` | Derived edge-case JSON used by proxy/cache tests. |
| `scripts/capture_fixtures.py` | Utility that fetches live ESPN scoreboards and saves raw test fixtures; do not run it as part of offline tests. |
| `scripts/generate_edge_case_fixtures.py` | Utility that derives predictable edge-case fixtures from the raw captures. |
| `package.json` | Frontend scripts and Node dependencies, including Vitest. |
| `requirements.txt` / `requirements-dev.txt` | Runtime and development Python dependencies. |
| `vite.config.js` | Vite setup; its development proxy forwards `/api` to `http://127.0.0.1:5000`. |
| `vercel.json` | Production rewrite rules: `/api/*` goes to the Render backend, all other paths serve the SPA entry page. |
| `dist/` | Generated frontend build output; it is not the source of truth. |
| `node_modules/` | Installed Node packages; generated, not project source. |
| `BUGS.md`, `NFL_UFC_EXPANSION_PLAN.md`, and root `*_boxscore.py` / `rewrite.py` scripts | Project notes and one-off maintenance work; their exact current operational role is not clear from the request path above. |

## One request end to end: opening the NBA home page

1. A user visits `/nba` (or `/`). `src/main.jsx` renders `App` from `src/App.jsx`; `App` maps that URL to the `Home` component imported from `src/pages/nba/NBAHome.jsx`.
2. `SportProvider` in `src/context/SportContext.jsx` sees the `nba` URL prefix and exposes the NBA entry from `getSportConfig` in `src/utils/sportConfig.js`. `NBAHome` also calls `useTeamLogos('nba')` and reads its small browser-memory cache with `getCached('today_games', 30000)`.
3. `Home` calls `useSportPolling` from `src/utils/polling.js`. Its fetch function requests `GET /api/games/today` immediately, then every 15 seconds if a mapped game has `status === 'LIVE'`, otherwise every 60 seconds. In local development, the `/api` request is proxied by `vite.config.js` to Flask on port 5000. In the Vercel deployment configuration, `vercel.json` instead forwards it to the Render URL.
4. `backend/app.py` has already called `register_all_sports(app, cache)`. `backend/sports/registry.py` invokes `backend.adapters.espn_nba.register_routes`, which defines `nba_today_games()` for both `/api/nba/games/today` and the legacy `/api/games/today` route.
5. `nba_today_games()` calls `cache.get_with_swr('nba:today_games', lambda: compute_today_games(cache), ttl=20, swr_ttl=300)`. The cache object is the singleton named `cache` in `backend/core/cache.py`.
6. On a cache miss, `compute_today_games()` in `backend/adapters/espn_nba.py` calls `session.get(url, timeout=10).json()` against ESPN's NBA scoreboard URL. `session` comes from `backend/core/provider_client.py` and is a shared `requests.Session` with connection pooling and retry configuration.
7. `compute_today_games()` converts ESPN's nested event/competition/competitor objects into the flatter shape the UI uses: `id`, home/away names and abbreviations, numeric scores, colours, logos, status, clock, arena, default stats, and empty play-by-play/box-score fields. It also normalizes a few ESPN abbreviations with `normalize_abbr_to_app()`.
8. Flask serializes that mapped list with `jsonify`. Back in `NBAHome`, the `onData` callback calls `setGames(data)` and `setCached(TODAY_GAMES_CACHE, data)`. React then renders each game in the matchup carousel and sends the selected game to `ScorebugHero`; later effects fetch play-by-play and box-score data for that selected game.

## Cache behaviour and ESPN failures

There are two separate caches:

- **Browser cache:** `src/utils/cache.js` stores values in a JavaScript `Map`. `NBAHome` treats `today_games` as fresh for 30 seconds, but `useSportPolling` still refreshes it on its polling schedule. This data is per browser tab/process and is lost on reload.
- **Backend cache:** `backend/core/cache.py` stores values in the Flask process's `Cache.store` dictionary. It is shared by adapters only within that running Python process, so it is not Redis/database-backed and is lost when the backend restarts.

`Cache.set(key, value, ttl, swr_ttl)` records a soft expiry at `ttl` seconds and a hard expiry at `max(ttl, swr_ttl)` seconds. For the NBA home scoreboard, the soft TTL is **20 seconds** and the hard TTL is **300 seconds**. Before the soft expiry, the stored value is returned. Between soft and hard expiry, `get_with_swr` returns the stale value immediately and starts one background refresh for that key. On a miss or hard expiry, it makes callers wait for a synchronous refresh; the current implementation uses an `inflight` event so concurrent callers wait for the first refresh rather than each calling ESPN.

If ESPN fails during the background refresh, `get_with_swr` logs `[CACHE] Background refresh error ...` and leaves the last stored value in place until its hard expiry. If there is no usable cache entry and `compute_today_games()` fails, `nba_today_games()` catches the exception and returns HTTP 500 with `{ "error": "Failed to fetch games", "games": [] }`. NFL and UFC routes have their own, not fully identical, fallback responses, so do not assume every endpoint has the same status code or body.

The NBA Games tab has a separate backend entry, `nba_games_list()`, that uses the `nba:games_list` cache key with a **5-minute soft TTL** and a **1-hour hard TTL**. Its first uncached request is intentionally heavier than the home scoreboard: `compute_games_list()` requests each of the 30 NBA team schedules with at most 10 workers at once, combines them, and removes duplicate game IDs. The cached merged list prevents that work from running for every visitor.

## Recent NBA and NFL screen behaviour

### NBA Games: full season fixtures

`src/pages/nba/NBAGames.jsx` fetches legacy route `GET /api/games`. Flask maps that to `nba_games_list()` in `backend/adapters/espn_nba.py`, which calls `compute_games_list()`. Rather than asking ESPN for a narrow recent-date scoreboard, that function requests `teams/<team_id>/schedule?seasontype=2` for every ID in `TEAM_IDS`, where `seasontype=2` means regular season. It merges the responses, de-duplicates them because each NBA game appears in both teams' schedules, converts them into the UI's game shape, sorts by date, and returns the full list.

The NBA Games page stores that list in the browser cache under `games_list`, then filters the in-memory list by status or team-name search. A fallback single ESPN scoreboard request remains in `compute_games_list()` if every team-schedule request fails, so in that failure mode the page may show only the currently available scoreboard data rather than the full season.

### NFL upcoming games: season snapshot

`src/pages/nfl/NFLGameDetail.jsx` first requests `GET /api/nfl/games/<gameId>`. When the returned game has `status === 'UPCOMING'`, a second effect requests `GET /api/nfl/team/<awayAbbr>/info` and `GET /api/nfl/team/<homeAbbr>/info` in parallel. Those endpoints are handled by `nfl_team_info()` in `backend/adapters/espn_nfl.py`: it reads ESPN's NFL standings, finds the requested team, and returns its record, win percentage, streak, conference, seed, points for, and points against.

The page uses those two responses in its **Season Snapshot** panel instead of rendering a pre-kickoff line score with no quarter values. If a team-info request fails, the panel stays visible and uses dashes for unavailable fields instead of making up a statistic. Once a game is no longer upcoming, the normal line score and scoring-play sections are used instead.

### NFL live games: drive tracker

For a live game, `nfl_single_game()` optionally reads `drives.current` from ESPN's game-summary response and returns it as `currentDrive`. `src/components/NFLDriveTracker.jsx` is rendered by `NFLGameDetail` only when the game is live and that data exists. It draws the compact football field and drive path from the provided start/current yard lines, plus the possessing team, play count, yards, and description. It deliberately renders nothing when ESPN does not provide active-drive data, rather than showing a guessed field position.

## Five files to read first

1. `src/App.jsx` — learn the browser routes and which screen starts each feature.
2. `src/pages/nba/NBAHome.jsx` — see a complete real screen: polling, browser cache, detail requests, and rendering.
3. `backend/app.py` — see how Flask starts and how route registration/prewarming are composed.
4. `backend/adapters/espn_nba.py` — the clearest example of ESPN request code, mapping logic, and Flask route handlers.
5. `backend/core/cache.py` — understand freshness, stale-while-revalidate, failure behaviour, and concurrent-miss coordination before changing API code.

For the other sports, read `backend/adapters/espn_nfl.py` or `backend/adapters/espn_ufc.py` alongside their respective page folders after you understand the NBA path.

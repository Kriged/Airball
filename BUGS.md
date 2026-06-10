# Airball — Code Review Bug Report

**Project:** BasketballDatabase (Airball)  
**Review date:** June 11, 2026  
**Scope:** Full codebase review (backend, frontend, config, deployment)  
**Status:** Issues documented only — no fixes applied

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Critical Bugs](#critical-bugs)
3. [High Severity Issues](#high-severity-issues)
4. [Medium Severity Issues](#medium-severity-issues)
5. [Low Severity / Code Quality](#low-severity--code-quality)
6. [Missing Features & Documentation Gaps](#missing-features--documentation-gaps)
7. [ESLint Findings](#eslint-findings)
8. [Issue Index by File](#issue-index-by-file)

---

## Executive Summary

Airball is a React + Flask app that proxies ESPN's NBA APIs. The core architecture works for happy-path scenarios, but several **data correctness bugs** affect team pages and standings navigation, the **home page shows fabricated team statistics**, and **live game polling has a React lifecycle bug** that prevents auto-refresh in common usage.

| Severity | Count |
|----------|-------|
| Critical | 7 |
| High | 10 |
| Medium | 12 |
| Low / Quality | 11 |

**Top 3 issues to fix first:**

1. **ESPN vs. app team abbreviation mismatch** — breaks 6 team detail pages linked from standings and corrupts W/L results on schedules.
2. **Home page live polling never starts** — `useEffect` dependency bug prevents play-by-play/box score refresh for live games after initial load.
3. **Hardcoded fake team stats** — the "Team Stats" tab on the home page always shows placeholder numbers (45% FG, 40 rebounds, etc.), not real data.

---

## Critical Bugs

### BUG-001: Team abbreviation mismatch breaks standings links (6 teams)

**Severity:** Critical  
**Files:** `backend/app.py`, `src/pages/Standings.jsx`  
**Verified:** Yes (live ESPN API call)

ESPN standings use different abbreviations than the app's `TEAM_IDS` lookup table. Standings links use ESPN abbreviations directly:

```79:80:src/pages/Standings.jsx
                <td className="team-name">
                  <Link to={`/teams/${team.abbr}`} className="td-team-link">{team.team}</Link>
```

| ESPN Abbr | App Abbr | Team |
|-----------|----------|------|
| GS | GSW | Golden State Warriors |
| NY | NYK | New York Knicks |
| NO | NOP | New Orleans Pelicans |
| SA | SAS | San Antonio Spurs |
| UTAH | UTA | Utah Jazz |
| WSH | WAS | Washington Wizards |

**Impact:** Clicking Warriors, Knicks, Pelicans, Spurs, Jazz, or Wizards in standings navigates to `/teams/GS`, `/teams/NY`, etc., which return **404 Team not found** from the backend.

**Reproduction:** Go to Standings → click "Golden State Warriors" → team page fails to load.

---

### BUG-002: Schedule W/L results wrong for ESPN abbreviation mismatches

**Severity:** Critical  
**File:** `backend/app.py` (lines 548–551)

```548:551:backend/app.py
            result = None
            if is_done:
                is_home = h_ab == abbr
                result = 'W' if (hs > asc if is_home else asc > hs) else 'L'
```

The schedule endpoint compares ESPN's home abbreviation (`GS`, `NY`, etc.) against the route parameter (`GSW`, `NYK`, etc.). When they differ, `is_home` is always `false`, so win/loss is calculated from the wrong perspective.

**Impact:** Warriors, Knicks, Pelicans, Spurs, Jazz, and Wizards show incorrect W/L badges on their schedule pages and in "Recent Form" pills.

---

### BUG-003: Home page live game polling never starts after games load

**Severity:** Critical  
**File:** `src/pages/Home.jsx` (lines 116–144)

The effect that polls play-by-play and box score for live games depends only on `[activeGameId]`, but checks `games.find(...)` from a **stale closure**:

```139:143:src/pages/Home.jsx
    const activeGameObj = games.find(g => g.id === activeGameId);
    if (activeGameObj && activeGameObj.status === 'LIVE') {
      const interval = setInterval(loadDetails, 10000);
      return () => clearInterval(interval);
    }
```

**Sequence that triggers the bug:**

1. Component mounts with `games = []` and `activeGameId = 'mock_1'`.
2. Effect runs; no live polling interval is created (games empty).
3. First poll fetches games; a live game is set as active.
4. Effect does **not** re-run (only `activeGameId` changed if at all, but status check already missed).
5. Live play-by-play and box scores never auto-refresh.

ESLint also flags this: `React Hook useEffect has a missing dependency: 'games'`.

**Impact:** Live games on the home page appear frozen unless the user manually clicks another game card.

---

### BUG-004: Home page "Team Stats" tab shows hardcoded placeholder data

**Severity:** Critical (data integrity)  
**File:** `backend/app.py` (lines 140–146)

```140:146:backend/app.py
                'stats': {
                    'fgPct': {'home': 45.0, 'away': 45.0},
                    'fg3Pct': {'home': 35.0, 'away': 35.0},
                    'rebounds': {'home': 40, 'away': 40},
                    'assists': {'home': 20, 'away': 20},
                    'turnovers': {'home': 12, 'away': 12}
                },
```

These values are identical for every game and never pulled from ESPN. The frontend renders them as real comparative statistics with progress bars.

**Impact:** Users see misleading statistics that do not reflect the actual game.

---

### BUG-005: All banner and hero images are missing (404)

**Severity:** Critical (UI)  
**Files:** `src/pages/Home.jsx`, `src/pages/Games.jsx`, `src/pages/Players.jsx`, `src/pages/Stats.jsx`, `src/pages/Seasons.jsx`, `src/pages/Standings.jsx`

Referenced paths:

| Path | Used In |
|------|---------|
| `/images/hero.png` | Home |
| `/images/games.png` | Games |
| `/images/players.png` | Players |
| `/images/stats.png` | Stats |
| `/images/seasons.png` | Seasons |
| `/images/standings.png` | Standings |

The `public/` directory only contains `favicon.svg` and `icons.svg`. No `public/images/` folder exists.

**Impact:** Broken background images on every page; degraded visual design on all routes.

---

### BUG-006: Standings page can crash on streak display

**Severity:** Critical  
**File:** `src/pages/Standings.jsx` (line 87)

```87:88:src/pages/Standings.jsx
                  <span className={`streak-badge ${team.streak.startsWith('W') ? 'win-streak' : 'loss-streak'}`}>
                    {team.streak}
```

Unlike `TeamDetail.jsx` which uses optional chaining (`teamInfo.streak?.startsWith`), Standings calls `.startsWith()` directly. When ESPN returns `'-'` or the field is missing/null, this throws a **runtime TypeError** and crashes the page.

**Note:** `'-'` is the fallback in the backend (`stats.get('streak', '-')`), so this is likely in production data today.

---

### BUG-007: Live games misclassified as "Upcoming" on Games list and Game Detail

**Severity:** Critical  
**File:** `backend/app.py` (lines 432–433)

```432:433:backend/app.py
                'status': 'Final' if ev['status']['type']['completed'] else 'Upcoming',
```

The `/api/games` endpoint never checks `ev['status']['type']['state'] == 'in'` for live games. Compare with `/api/games/today` which correctly sets `'LIVE'`.

**Impact:**

- Live games on `/games` show status "Upcoming" with no scores.
- `GameDetail.jsx` hides scores for non-Final games (`isFinished = game.status === 'Final'`), so live game scores display as "—" even while the game is in progress.
- Games page filter has no "Live" option; live games cannot be filtered.

---

## High Severity Issues

### BUG-008: TeamDetail does not handle 404 responses

**Severity:** High  
**File:** `src/pages/TeamDetail.jsx` (lines 18–35)

All three team API calls use `.then(r => r.json())` without checking `r.ok`. When a team is not found, the backend returns `{ error: 'Team not found' }` with HTTP 404. The frontend sets this as `teamInfo` and renders the page with empty wins/losses/conference data instead of an error state.

**Impact:** Invalid team URLs (e.g. `/teams/GS` from standings) show a broken team page instead of a clear error message.

---

### BUG-009: `requests` missing from `requirements.txt`

**Severity:** High  
**File:** `requirements.txt`, `backend/app.py`

The backend uses `requests` for every ESPN API call but it is not listed as a direct dependency. It may work today only as a transitive dependency of `nba_api`.

**Impact:** A future `nba_api` version change or minimal install could break production deployments.

---

### BUG-010: Play-by-play truncated to 30 plays with no UI indication

**Severity:** High  
**File:** `backend/app.py` (lines 181–182)

```181:182:backend/app.py
            if len(mapped_actions) >= 30:
                break
```

Only the 30 most recent plays are returned. The frontend presents this as the full feed with no truncation notice.

**Impact:** Users believe they are seeing complete play-by-play data.

---

### BUG-011: GameDetail loading state tied only to play-by-play fetch

**Severity:** High  
**File:** `src/pages/GameDetail.jsx` (lines 15–45)

`setLoading(false)` is only called in the play-by-play fetch chain. The game info fetch and box score fetch do not affect loading state.

**Impact:**

- If play-by-play is slow, the page stays on "Loading..." even after game info is available.
- If play-by-play fails silently (`.catch(() => setLoading(false))`), the page may show content with empty PBP and no error.
- Box score fetch errors are silently swallowed (`.catch(() => {})`).

---

### BUG-012: Most frontend pages ignore HTTP error status codes

**Severity:** High  
**Files:** `Games.jsx`, `Players.jsx`, `Stats.jsx`, `Standings.jsx`, `Seasons.jsx`, `TeamDetail.jsx`, `GameDetail.jsx`

Only `Home.jsx` checks `res.ok`. Other pages call `.then(res => res.json())` unconditionally.

**Impact:** A 500 response with `{ error: ... }` or `[]` is treated as valid data. Users see empty states instead of error messages; debugging production issues is harder.

---

### BUG-013: `/api/games/today` returns HTTP 500 with empty array on failure

**Severity:** High  
**File:** `backend/app.py` (line 156)

```156:156:backend/app.py
        return jsonify([]), 500
```

Returns an empty array body with status 500. `Home.jsx` treats non-ok responses as failure (`return null`), showing "No Games Today" — indistinguishable from a day with zero games.

**Impact:** API outages appear as "no games scheduled" with no error indication.

---

### BUG-014: Navbar search keyword matching is inverted

**Severity:** High  
**File:** `src/components/Navbar.jsx` (line 28)

```28:28:src/components/Navbar.jsx
        item.keywords.some((kw) => kw.includes(q))
```

This checks whether the **keyword contains the query**, not whether the **query contains or matches the keyword**. The more typical pattern is `q.includes(kw) || kw.includes(q)` or a fuzzy match.

Examples of failures:
- Query `"lebron james"` → `'lebron'.includes('lebron james')` is **false** (multi-word search fails)
- Query `"golden state"` → no keyword contains that full string
- Query `"knicks"` → no entry matches (no Knicks/team entries in `searchableItems` at all)

**Impact:** Multi-word searches and many team-name queries return no results despite the placeholder promising team search.

---

### BUG-015: Navbar player search does not navigate to player-specific views

**Severity:** High  
**File:** `src/components/Navbar.jsx`

Player entries (LeBron, Curry, etc.) all route to `/players` with no search pre-fill or player detail page.

**Impact:** Search appears broken — selecting "LeBron James" just opens the generic players list.

---

### BUG-016: In-memory cache ineffective in multi-worker / serverless deployment

**Severity:** High  
**File:** `backend/app.py` (lines 32–51)

Custom in-memory cache does not persist across Gunicorn workers or Render cold starts. `cachetools` is in `requirements.txt` but unused.

**Impact:** Cache hit rate near zero in production; repeated ESPN API calls; possible rate limiting; slow cold starts on Render.

---

### BUG-017: Status string inconsistency across API endpoints

**Severity:** High  
**Files:** `backend/app.py`

| Endpoint | Status Values |
|----------|---------------|
| `/api/games/today` | `LIVE`, `FINAL`, `UPCOMING` (uppercase) |
| `/api/games` | `Final`, `Upcoming` (title case, no Live) |
| `/api/team/.../schedule` | `Final`, `Upcoming` |

Frontend code checks different casings in different places (`FINAL` vs `Final`, `UPCOMING` vs `Upcoming`).

**Impact:** Fragile cross-page behavior; any shared logic comparing status strings will fail silently.

---

## Medium Severity Issues

### BUG-018: Dead code — `nba_api` imported but never used

**Severity:** Medium  
**File:** `backend/app.py` (lines 6–27)

The entire `nba_api` integration (header patching, endpoint imports) is dead code. All data comes from ESPN via `requests`. This adds startup time, dependency weight, and maintenance confusion.

Unused imports:
- `scoreboard`, `playbyplay`, `boxscore` (live endpoints)
- `leaguestandings`, `leagueleaders`, `leaguedashplayerstats` (stats endpoints)

---

### BUG-019: Dead code — `get_position()` and `PLAYER_POSITIONS` unused

**Severity:** Medium  
**File:** `backend/app.py` (lines 65–87)

Hardcoded player position map and hash-based fallback function are never called. The `/api/players` endpoint gets positions from ESPN directly.

---

### BUG-020: Duplicate imports in backend

**Severity:** Medium  
**File:** `backend/app.py` (lines 90–95)

```python
import requests
import datetime

import requests
import datetime
```

Duplicate block serves no purpose and suggests incomplete refactoring.

---

### BUG-021: Unused `import os`

**Severity:** Medium  
**File:** `backend/app.py` (line 1)

`os` is imported but never referenced.

---

### BUG-022: `cachetools` in requirements but unused

**Severity:** Medium  
**File:** `requirements.txt`

Listed as a dependency but the app uses a hand-rolled `Cache` class instead.

---

### BUG-023: Box score parsing can throw on malformed FG strings

**Severity:** Medium  
**File:** `backend/app.py` (lines 231–242)

```python
fgm = fg_val.split('-')[0] if '-' in fg_val else 0
...
'fgm': int(fgm),
'fga': int(fga),
```

If ESPN returns a non-numeric FG value (e.g. `"-"` or empty string), `int()` raises `ValueError`, caught by the broad `except` which returns empty box scores.

**Impact:** Silent data loss for entire box score on parse failure.

---

### BUG-024: Box score team side defaults to `'home'` on mapping failure

**Severity:** Medium  
**File:** `backend/app.py` (line 212)

```python
team_side = team_side_map.get(t_id, 'home')
```

If team ID lookup fails, players are assigned to the home team bucket, potentially merging both rosters visually.

---

### BUG-025: Tie games recorded as losses in team schedule

**Severity:** Medium  
**File:** `backend/app.py` (line 551)

When scores are equal, the ternary falls through to `'L'`. NBA games can tie in regular season only in rare cases (NaN — actually NBA doesn't allow ties; overtime until winner). Preseason or data errors could still produce equal scores.

---

### BUG-026: Home page initial `activeGameId` is stale mock value

**Severity:** Medium  
**File:** `src/pages/Home.jsx` (line 90)

```javascript
const [activeGameId, setActiveGameId] = useState('mock_1');
```

Initial ID `'mock_1'` never matches real ESPN game IDs. Causes unnecessary failed detail fetches on first render before games load.

---

### BUG-027: Hardcoded "Game starts at 7:30 PM" for all upcoming games

**Severity:** Medium  
**File:** `src/pages/Home.jsx` (lines 356–358)

Shows a fixed tip-off time regardless of actual scheduled start from the API (which provides `quarter` with real time info).

---

### BUG-028: `/api/games` list endpoint has no caching

**Severity:** Medium  
**File:** `backend/app.py` (lines 408–440)

Every other expensive ESPN endpoint uses the TTL cache. The games list hits ESPN on every request.

---

### BUG-029: Season history data is hardcoded with stale/TBD entries

**Severity:** Medium  
**File:** `backend/app.py` (lines 391–406)

2024-25 and 2025-26 champions and MVPs are `"TBD"` despite 2024-25 being complete. Data is static, not fetched from any source.

---

### BUG-030: Win probability bar logic incorrect for tied final scores

**Severity:** Medium  
**File:** `src/pages/Home.jsx` (lines 146–154)

For `FINAL` games: `game.homeScore > game.awayScore ? 100 : 0` — a tied game (if ever displayed) shows 0% for home (100% away via complement), which is wrong.

---

### BUG-031: `TeamDetail` unused variables (`winsCount`, `lossesCount`)

**Severity:** Medium  
**File:** `src/pages/TeamDetail.jsx` (lines 59–60)

Computed but never rendered — likely incomplete feature.

---

## Low Severity / Code Quality

### BUG-032: Flask `debug=True` when running backend directly

**File:** `backend/app.py` (line 604)

Enables debug mode with auto-reloader and interactive debugger if deployed incorrectly.

---

### BUG-033: CORS fully open with no origin restrictions

**File:** `backend/app.py` (line 30)

`CORS(app)` allows all origins. Acceptable for a public API but worth noting for production hardening.

---

### BUG-034: No health check / readiness endpoint

No `/api/health` or similar for Render/Vercel monitoring.

---

### BUG-035: Root `app.py` runs Flask without explicit port/debug settings

**File:** `app.py`

```python
app.run()  # defaults differ from backend/app.py which uses port 5000
```

Vite proxy expects port 5000. Flask default is also 5000, but explicit config in only one entry point is inconsistent.

---

### BUG-036: `__pycache__` not in `.gitignore`

**File:** `.gitignore`

Python bytecode cache files can be committed accidentally (one `.pyc` is already modified in git status).

---

### BUG-037: Untracked one-off patch scripts in repo root

**Files:** `fix.py`, `patch_boxscore.py`, `patch_boxscore2.py`, `rewrite.py`

Development scaffolding scripts left in the project root; not part of the runtime app but add clutter and confusion.

---

### BUG-038: Project README is default Vite boilerplate

**File:** `README.md`

No project-specific setup, architecture, API docs, or deployment instructions.

---

### BUG-039: Hardcoded production backend URL in Vercel config

**File:** `vercel.json`

```json
"destination": "https://airball-cfv6.onrender.com/api/$1"
```

Single hardcoded Render instance; no environment-based configuration.

---

### BUG-040: React list keys use array index in several places

**Files:** `Home.jsx`, `GameDetail.jsx`, `TeamDetail.jsx`, `Navbar.jsx`

Using array index as `key` can cause incorrect DOM reuse when lists reorder (especially live play-by-play).

---

### BUG-041: No automated tests

No unit, integration, or E2E tests for backend routes or frontend components.

---

### BUG-042: `GameDetail.jsx` unused variables

**File:** `src/pages/GameDetail.jsx` (lines 86–87)

`currentTeamName` and `otherTeamName` are assigned but never used.

---

## Missing Features & Documentation Gaps

| Gap | Description |
|-----|-------------|
| No player detail page | Players table is read-only; no `/players/:id` route |
| No team search in navbar | Placeholder says "Search players, teams, stats..." but teams aren't searchable |
| No live game filter | Games page filters: All, Final, Upcoming — no Live |
| No error boundaries | Uncaught React errors crash the entire app |
| No loading skeletons | Most pages show a spinner emoji instead of structured loading UI |
| No API rate limiting | Backend proxies ESPN with no throttling or request deduplication |
| Stats page limited to top 100 | ESPN query uses `limit=100`; players outside top 100 excluded from leaderboards |
| No dark/light mode toggle | Single theme only |
| Footer claims "Built with React & Vite" | Omits Flask/Python backend entirely |

---

## ESLint Findings

Running `npm run lint` exits with code **1** (6 errors, 1 warning):

| File | Rule | Issue |
|------|------|-------|
| `GameDetail.jsx:16` | `react-hooks/set-state-in-effect` | `setLoading(true)` called synchronously in effect |
| `GameDetail.jsx:86` | `no-unused-vars` | `currentTeamName` unused |
| `GameDetail.jsx:87` | `no-unused-vars` | `otherTeamName` unused |
| `Home.jsx:144` | `react-hooks/exhaustive-deps` | Missing `games` dependency in useEffect |
| `TeamDetail.jsx:15` | `react-hooks/set-state-in-effect` | `setLoading(true)` called synchronously in effect |
| `TeamDetail.jsx:59` | `no-unused-vars` | `winsCount` unused |
| `TeamDetail.jsx:60` | `no-unused-vars` | `lossesCount` unused |

---

## Issue Index by File

### `backend/app.py`
BUG-001, BUG-002, BUG-004, BUG-007, BUG-009, BUG-010, BUG-013, BUG-016, BUG-017, BUG-018, BUG-019, BUG-020, BUG-021, BUG-023, BUG-024, BUG-025, BUG-028, BUG-029, BUG-032, BUG-033, BUG-034

### `src/pages/Home.jsx`
BUG-003, BUG-004, BUG-005, BUG-026, BUG-027, BUG-030, BUG-040

### `src/pages/Standings.jsx`
BUG-001, BUG-005, BUG-006, BUG-012

### `src/pages/TeamDetail.jsx`
BUG-002, BUG-008, BUG-031, BUG-042

### `src/pages/GameDetail.jsx`
BUG-007, BUG-011, BUG-012, BUG-040, BUG-042

### `src/pages/Games.jsx`
BUG-005, BUG-007, BUG-012

### `src/components/Navbar.jsx`
BUG-014, BUG-015

### `requirements.txt`
BUG-009, BUG-022

### `vercel.json`
BUG-039

### `public/` (missing assets)
BUG-005

### Project-wide
BUG-036, BUG-037, BUG-038, BUG-041

---

## Recommended Fix Priority

```
Phase 1 — Data correctness (do first)
├── BUG-001  Map ESPN abbreviations ↔ app abbreviations in standings + links
├── BUG-002  Fix schedule W/L using normalized abbreviations
├── BUG-004  Fetch real team stats from ESPN summary API (or remove tab)
├── BUG-007  Add LIVE status to /api/games; show live scores in GameDetail
└── BUG-006  Add optional chaining for streak in Standings

Phase 2 — Core UX
├── BUG-003  Fix Home.jsx polling effect dependencies
├── BUG-005  Add missing images to public/images/
├── BUG-008  Handle 404 in TeamDetail
├── BUG-011  Fix GameDetail loading orchestration
└── BUG-012  Add res.ok checks across frontend

Phase 3 — Production hardening
├── BUG-009  Add requests to requirements.txt
├── BUG-016  Use shared cache (Redis) or remove misleading cache
├── BUG-018  Remove dead nba_api code or document why it remains
└── BUG-034  Add /api/health endpoint
```

---

*This document was generated from a static code review and live API verification. No source code was modified during the review.*

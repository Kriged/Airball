# Airball QA & Debugging Report

**Date:** 24 October 2026  
**Scope:** client functionality, API resilience and request efficiency, and interactive UI controls.

## Confirmed defects fixed

| ID | Evidence | Fix | Result |
| --- | --- | --- | --- |
| QA-001 | Four timezone scoreboard tests returned no NBA games when ESPN could not resolve, leaving the Match Center empty during an outage. | Added a small, timestamped bundled scoreboard fallback that is filtered in the selected timezone and is used only when ESPN has no response. | The timezone tests now pass, including the Flask endpoint. |
| QA-002 | Static inspection found direct `fetch` calls across NBA, NFL, and UFC screens, bypassing the in-flight deduplication and local fallback policy in `IMPLEMENTATION.md`. | Added `cachedResponseFetch`, a Fetch-compatible wrapper over `cachedFetch`, and moved every screen request to that shared request path. | A source scan now finds raw `fetch` only inside the central cache transport. |
| QA-003 | `npm test -- --run` intermittently failed on Windows because Vitest's default fork pool lost a temporary transformed module while parallel suites imported the Python bridge. | Configured the project test script to use Vitest's thread pool, which completes the entire suite reliably in this environment. | Full suite: 42 passed, 2 skipped. |
| QA-004 | Lint reported six issues: the mobile drawer route-close effect, Timezone Context fast-refresh structure, an unused NBA constant, and test globals. | Split the context value into its own module, documented the necessary transient-drawer state update, removed the unused constant, and used `globalThis` in tests. | `npm run lint` passes. |

## API efficiency verification

- Successful API GET responses apply Vercel Edge caching directives; a Flask-client check returned `public, max-age=15, s-maxage=120, stale-while-revalidate=600` for health and `no-store` for a 404.
- Backend resilience tests cover fail-fast 429 behavior, circuit cooldowns, persisted cache state, and route cache headers.
- Browser cache tests cover five concurrent calls coalescing into one request, stale local fallback, and polling suspension while a tab is hidden.
- Main NBA/NFL score polling uses the shared cache and backs off to 15-minute polling when there is no live game.

## UI verification

Browser smoke tests loaded these pages without visible error states: NBA Games, Standings, Players, Stats; NFL Games, Standings, Players; UFC Events, Fighters, Compare, Rankings, and Stats.

The following interactions were exercised in the live local app:

- Changed timezone from IST to US Eastern and confirmed the active badge and date labels changed.
- Opened Stream Sync, changed the delay slider to 90 seconds with keyboard interaction, and confirmed the navbar displayed `+90s Delay` after saving.
- Loaded NBA, NFL, and UFC home routes and confirmed their primary headings and navigation controls rendered.

## Verification results

| Command | Result |
| --- | --- |
| `python -m pytest -q` | 28 passed |
| `npm test -- --run` | 42 passed, 2 skipped |
| `npm run lint` | passed |
| `npm run build` | passed |

## Coverage note

Two existing UFC proxy cases remain skipped because their named fixture files are absent. This is a test-data coverage gap, not an observed runtime defect. A Vercel preview was not deployed during this QA pass, so CDN-specific `x-vercel-cache` HIT/STALE behavior still needs confirmation in a deployed preview.

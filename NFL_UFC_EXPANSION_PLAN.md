# NFL & UFC Expansion Implementation Plan

The site can expand cleanly to NFL and UFC without changing its dark, live-broadcast personality. The key is to turn the current NBA-specific implementation into a sport-configured platform—not copy the NBA pages twice.

| Area | NFL | UFC |
| --- | --- | --- |
| Primary content | Games, teams, standings, players | Events, fight cards, fighters, rankings |
| Detail experience | Scoreboard, drives/scoring timeline, team/player stats | Bout card, round scores, method/finish, fighter comparison |
| Do not reuse | Shot chart, Four Factors, basketball lineups | Teams, conference standings, game-style box score |

## Recommended structure

Use sport-scoped URLs while preserving the existing NBA URLs as redirects:

```text
/nba, /nfl, /ufc
/:sport/games
/:sport/games/:eventId
/:sport/teams/:teamId        # NBA/NFL only
/:sport/athletes/:athleteId
/:sport/standings            # NBA/NFL only
/:sport/rankings             # UFC only
/:sport/stats
/:sport/seasons
```

The navigation should have a compact NBA / NFL / UFC selector. The current “Games,” “Standings,” and related links remain, but are generated from the active sport’s capabilities. UFC should say “Events,” “Fighters,” and “Rankings,” rather than presenting its events as team games.

## Implementation plan

### 1. Create the sport foundation

- Add a `SportDefinition` registry in the frontend with display name, accent color, navigation labels, available pages, and features.
- Move from fixed cache keys such as `games_list` to namespaced keys such as `nfl:games:list`.
- Replace the large NBA-only navbar search list with sport-aware catalog/search data.
- Redirect existing routes such as `/games` to `/nba/games` so existing links continue working.

### 2. Modularize the Flask backend before adding data

The current `backend/app.py` is an NBA-specific module with hard-coded NBA URLs, team IDs, abbreviations, colors, and cache names. Split it into:

```text
backend/
  app.py
  core/cache.py
  core/provider_client.py
  sports/registry.py
  sports/nba.py
  sports/nfl.py
  sports/ufc.py
  adapters/espn_nba.py
  adapters/espn_nfl.py
  adapters/espn_ufc.py
```

Expose routes under `/api/:sport/...`, for example `/api/nfl/games` and `/api/ufc/events`. Each adapter should normalize provider responses into stable app-owned shapes, so a future data-provider change affects one adapter rather than every page.

### 3. Build NFL as the first complete vertical slice

- Home: today/upcoming games, live score cards, mini standings, leaders.
- Games and game detail: quarter line score, scoring plays/drives, team leaders, team statistics.
- Teams: profile, record, schedule, roster, key stats.
- Standings: conference and division views.
- Players and stats: position filters appropriate to football and leaders for passing, rushing, receiving, sacks, and interceptions.
- Seasons: NFL-specific historic season metadata.

Reuse `PageLayout`, cards, tables, filters, cache behavior, loading states, and the broadcast score treatment. Replace basketball-only components such as `ShotChart`, `Lineups`, and `FourFactors` with an NFL event-detail configuration.

### 4. Build UFC as a deliberately different vertical slice

- Home: next event, active/upcoming cards, recent results, title-fight highlights.
- Events: filter by upcoming/completed, then show a fight card—not a home/away team list.
- Event detail: main card and prelims, bout status, round/judge results, finish method, and a fight timeline when data is available.
- Fighters: searchable fighter directory and individual fighter profiles.
- Rankings: division tabs, pound-for-pound, champion/challenger treatment.
- Stats: striking, takedown, submission, and finish-rate leaderboards.
- History: UFC event archive rather than NBA/NFL-style seasons.

UFC should not expose empty “Teams” or “Standings” pages. The capability registry should prevent those links and routes from appearing.

### 5. Make shared components presentation-aware

- Refactor `ScorebugHero` into a generic `EventHero` with NBA, NFL, and UFC render variants.
- Keep the existing global design system in `src/index.css`, but introduce sport-level accent variables instead of NBA-named variables.
- Make audio optional by sport; the current basketball-specific court sounds and NBA Broadcast copy should not appear on NFL/UFC screens.
- Update the footer, brand subtitle, empty states, and loading messages to be sport-aware.

### 6. Add reliability and test coverage before rollout

- Contract tests for each backend adapter using saved provider-response fixtures.
- Tests for cache-key isolation across NBA/NFL/UFC.
- Route and navigation tests for capability-gated pages.
- Browser checks for the three primary flows: NFL game detail, NFL team detail, and UFC event/fight-card detail.
- Add provider-health diagnostics and explicit empty/fallback states, especially for UFC data fields that may vary by event.

## Scalability improvements worth doing now

- Use provider IDs as canonical identifiers; abbreviations are display values, not reliable keys.
- Put sport-specific data mappings behind adapters instead of hard-coding them in pages.
- Fetch team/fighter catalogs dynamically rather than maintaining static search arrays.
- Define one normalized contract per page type: `Event`, `Team`, `Athlete`, `Standing`, `Ranking`, `Leaderboard`.
- Use feature flags/capabilities (`hasTeams`, `hasStandings`, `hasRankings`, `eventType`) to avoid branching throughout the UI.
- Add TypeScript incrementally—or at minimum JSDoc schemas—to make cross-sport data mismatches visible early.

## Rollout order

1. Sport foundation.
2. Complete NFL vertical slice.
3. Complete UFC vertical slice.
4. Shared search, visual polish, and testing.

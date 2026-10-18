# Coding Agent Prompt: Airball v2.4 Multi-Sport Real-Time Box Scores & Analytics Platform

You are an expert full-stack and frontend engineer. Build **Airball (v2.4)** — a real-time multi-sport (NBA, NFL, UFC) scoreboard, box score, play-by-play, and visual analytics web application.

You may implement this either as a **modular React + Tailwind CSS + Chart.js application** (following the component boundaries below) or as a **self-contained single-file HTML/JS/Tailwind/Chart.js application**, depending on the target repository structure.

## 1. Project Overview & Core Objectives

Airball is a dark-mode, broadcast-grade sports telemetry dashboard that supports instant switching between **NBA**, **NFL**, and **UFC** with zero page reloads, dynamic CSS variable theming per sport, live score simulation/polling, Web Audio API scoring chimes, interactive SVG court/field/octagon visualizers, and a built-in Flask Backend API Inspector.

### Tech Stack & Dependencies
* **Styling:** Tailwind CSS (v3.4+) with custom CSS variables for dynamic sport accent theming and smooth transitions.
* **Charts:** Chart.js (v4.4+) for the Predictive Win Probability Timeline (line chart with fill) and Statistical Leaders Comparison (bar chart).
* **Typography:** Google Fonts `Inter` (400–900 weights for UI/headers) and `JetBrains Mono` (`font-variant-numeric: tabular-nums` for all scores, clocks, odds, and stat lines).
* **Audio:** Native browser Web Audio API (`AudioContext` oscillator synthesis — no external MP3 assets required).
* **Icons & Badges:** Radial-gradient SVG/HTML team and fighter badges with high-contrast abbreviations (ensuring zero broken image links).

## 2. Design System & Dynamic Sport Theming

### Color Tokens & Surface Hierarchy
* **Page Background:** `#070A10`
* **Ticker / Footer Bar:** `#05080E`
* **Elevated Surface / Header / Modal Shell:** `#0B0F17`
* **Primary Card Surface:** `#0F1626` / `#131B2E`
* **Nested Sub-Card / Table Header Surface:** `#090D16` / `#111827`
* **Borders:** `border-slate-800/80` default; hover state `border-color: rgba(var(--sport-accent-rgb), 0.6)` with subtle upward lift (`transform: translateY(-2px)`) and ambient glow (`box-shadow: 0 0 28px -6px rgba(var(--sport-accent-rgb), 0.45)`).

### Dynamic Sport Theme Configuration (`SPORT_CONFIG`)
Update `:root` CSS variables (`--sport-accent`, `--sport-accent-rgb`, `--sport-secondary`) whenever the active sport changes, and persist the active sport in `localStorage` under `airball_active_sport`:

| Sport | Slug | Icon | Primary Accent (`--sport-accent`) | RGB (`--sport-accent-rgb`) | Secondary (`--sport-secondary`) | Visualizer Tab Label | Positions / Weight Classes | Stat Categories |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **National Basketball Association** | `nba` | 🏀 | `#F97316` (Orange) | `249, 115, 22` | `#FB923C` | `Court Shot Chart` | `All`, `PG`, `SG`, `SF`, `PF`, `C` | `Points`, `Rebounds`, `Assists`, `Blocks`, `3P%` |
| **National Football League** | `nfl` | 🏈 | `#3B82F6` (Blue) | `59, 130, 246` | `#D50A0A` | `Drive Tracker` | `All`, `QB`, `RB`, `WR`, `TE`, `OL`, `DL`, `LB`, `CB`, `S`, `K`, `P` | `Passing`, `Rushing`, `Receiving`, `Sacks`, `Interceptions` |
| **Ultimate Fighting Championship** | `ufc` | 🥊 | `#EF4444` (Red) | `239, 68, 68` | `#C4A747` | `Octagon Strike Map` | `All`, `Flyweight`, `Bantamweight`, `Featherweight`, `Lightweight`, `Welterweight`, `Middleweight`, `Light Heavyweight`, `Heavyweight` | `Striking`, `Takedowns`, `Submissions`, `Finish Rate` |

## 3. Component Architecture & Layout Specification

### A. Sticky Live Score Ticker (`src/components/LiveScoreTicker.jsx`)
* Sticky top bar (`top-0 z-40 h-11`) with pulsing red `Live Wire` indicator (`@keyframes pulse-live`).
* **Scope Toggle Button:** Switches ticker items between `ALL SPORTS` (shows NBA, NFL, and UFC matchups together) and `<SPORT> ONLY`.
* **Ticker Pills:** Horizontal scrollable strip (`no-scrollbar`) showing sport icon, away abbreviation + score, `@`, home abbreviation + score, and period/clock badge (`LIVE` games highlighted in red).
* **Click Behavior:** Clicking any ticker pill switches to that sport (if different), pins that matchup to the Scorebug Hero, and opens its Box Score Modal.
* **Sync Timestamp:** Right-aligned `Synced <HH:MM:SS>` badge updated on every live tick.

### B. Sticky Header & Navigation (`src/components/Header.jsx`, `Navbar.jsx`, `SportContext.jsx`)
* Sticky below ticker (`top-11 z-30 h-16`) with glassmorphism (`bg-[#0B0F17]/95 backdrop-blur-md`).
* **Brand Identity:** `AB` glowing badge + `AIRBALL` title + `v2.4` mono badge + subtitle; clicking resets to the default `games` view.
* **Global Sport Switcher:** Segmented pill control for `🏀 NBA`, `🏈 NFL`, `🥊 UFC`.
* **Dynamic Navigation Tabs:**
  * NBA & NFL: `Games`, `Standings`, `Players`, `Stats`, `Seasons`
  * UFC: `Events`, `Rankings`, `Fighters`, `Stats`, `History`
* **Right Action Controls:**
  1. `Sim Live Play` button: Triggers an immediate live scoring/strike event on the active sport's live game, updates win probability, adds a play-by-play entry, plays an audio chime, and shows a toast notification.
  2. `Audio Toggle` button (`🔊` / `🔇`): Toggles Web Audio API sound synthesis.
  3. `Leaders` button (`🏆`): Opens the slide-over Top Performers Leaderboard Drawer.
  4. `API & Cache` button (`⚙️`): Opens the Settings & Flask Backend API Inspector Modal.
  5. `Mobile Menu` button: Toggles a collapsible mobile navigation bar below the header (must cleanly auto-close on view selection so it never overlaps content).

### C. Connection & Route Status Sub-Banner (`src/components/ErrorBanner.jsx`)
* Displays active adapter status (`ESPN + TSDB Adapter Engine (In-Memory Cache Ready)`), the active REST endpoint for the current view (e.g., `GET /api/nba/games/today`, `GET /api/ufc/events`), current polling status (`15s Auto` / `Paused`), and a quick link to open the Flask JSON Payload Inspector.

### D. View 1: Games / Events Dashboard (`#view-games`)
1. **Scorebug Hero (`src/components/ScorebugHero.jsx` + `PredictiveWinBar.jsx`):**
   * Displays the currently featured matchup for the active sport over a subtle stadium/arena/octagon hero background with dark gradient overlay.
   * **Top Ribbon:** Live pulsing badge with period/round and clock, venue name, broadcast network, NFL situational possession badge (e.g., `🏈 BUF Ball: 2nd & 4 at KC 28`), and `Full Box Score & Analytics ↗` CTA.
   * **3-Column Matchup Core:**
     * Away & Home columns: Radial SVG team/fighter badge, city/rank & record, clickable team name (opens Roster Modal), large tabular score, and clickable top performer with primary stat.
     * Center column: Period-by-period (`Q1–Q4` or `R1–R4`) + `TOT` mini-table and the **Predictive Win Probability Bar** showing real-time away vs. home win percentage split with team-colored progress bars.
   * **Bottom Quick Bar:** Shows the most recent play-by-play text and quick-launch buttons for the sport's Visualizer (`Court Shot Chart` / `Drive Tracker` / `Octagon Strike Map`) and `Play-by-Play (count)`.
2. **Game Filter Bar (`src/components/GameFilter.jsx`):**
   * Status filter buttons with live counts: `All (N)`, `Live (N)`, `Final (N)`, `Upcoming (N)`.
   * **Slate Date Selector:** Includes `Sun, Oct 18, 2026 (Live Slate)`, `Sat, Oct 17, 2026 (Yesterday Finals)`, `Mon, Oct 19, 2026 (Upcoming Slate)`, and `Wed, Oct 21, 2026 (Off-Night Empty State)`. Selecting the off-night date must render a dedicated empty-state card with a `Jump to Today's Live Slate` recovery button.
   * **Real-Time Search Input:** Filters game cards by team name, city, abbreviation, venue, or player/fighter name.
3. **Game Grid (`src/components/GameGrid.jsx` & `GameCard.jsx`):**
   * Responsive 3-column grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`).
   * Each card shows status/clock badge, broadcast, `★ Featured` / `☆ Feature` pin button (pins game to the Scorebug Hero and scrolls to top), away/home badges, records, scores, mini win-probability bar, clickable game leader, and 3 footer buttons (`📊 Box Score`, `🎯 Shot Chart / Drives / Strikes`, `⚡ PBP`).

### E. View 2: Standings / Rankings (`#view-standings`)
* Conference/Division filter pills (`ALL`, `Eastern`, `Western` for NBA; `ALL`, `AFC`, `NFC` for NFL; `ALL`, `Champion`, `Contender` for UFC).
* Responsive table with columns: `RANK`, `TEAM / FIGHTER`, `DIVISION / CONF`, `W`, `L`, `PCT`, `GB / STATUS`, `STRK`, `DIFF / NOTE`.

### F. View 3: Players / Fighters Directory (`#view-players`)
* Real-time search input + horizontal scrollable position/weight-class filter pills populated from `SPORT_CONFIG[sport].positions`.
* 3-column card grid displaying team badge, player/fighter name, team & position tag, shooting/efficiency split, and primary output stat. Clicking any card opens the **Player Detail Modal**.

### G. View 4: League Statistical Leaders (`#view-stats`)
* Category tabs populated from `SPORT_CONFIG[sport].statCategories`.
* 12-column split layout:
  * Left (7 cols): Ranked leaderboard cards (`#1` to `#5`) with player name, team, and stat value + unit.
  * Right (5 cols): Chart.js vertical Bar Chart (`#statsComparisonChart`) comparing the top leaders in the active category, dynamically colored with the sport's accent color.

### H. View 5: Seasons / Championship History Archive (`#view-seasons`)
* 2-column grid of historical championship / milestone event cards displaying year/event badge, series/bout result, champion, runner-up/co-feature, Finals MVP/bonus winner, and historical summary note.

## 4. Interactive Modals & Drawers

### Modal 1: Box Score, Visualizer & Play-by-Play Modal (`#boxScoreModal`)
Contains a persistent matchup scorebug header and 3 sub-navigation tabs + a `+ Sim Live Event` button:
1. **`📊 Box Score & Team Stats` Tab:**
   * Full player/fighter stat tables for both Away and Home sides (clickable rows open Player Detail Modal) plus a 4-card Team Statistical Comparison grid at the bottom.
2. **`🎯 Sport-Specific Visualizer` Tab:**
   * **NBA (`Court Shot Chart`):** Interactive SVG half-court diagram (`viewBox="0 0 500 420"`) with outer boundary, paint/key, free-throw circle, restricted arc, backboard/rim, and 3-point arc. Plots made shots (`<circle>`) and missed shots (`✕` crossed lines). Includes filter buttons for Team (`Both Teams`, Away, Home) and Outcome (`All`, `● Made`, `✕ Missed`), live FG% readout, and an interactive click inspector (`#shotDetailReadout`) that displays player name, quarter, shot description, and `[X, Y]` court coordinates when any marker is clicked.
   * **NFL (`Drive Tracker`):** 100-yard green turf ruler (`OWN GL` to `OPP ENDZONE`) plotting each offensive drive as a proportional horizontal progress bar (`margin-left: startYard%`, `width: (endYard - startYard)%`) with play count, yardage, time of possession, and color-coded outcome badge (`TOUCHDOWN`, `FIELD GOAL`, `INTERCEPTION`, `LIVE DRIVE`).
   * **UFC (`Octagon Strike Map`):** 3-column strike telemetry breakdown with an SVG Octagon + anatomical target silhouette (`HEAD`, `BODY`, `LEGS` zones) flanked by Fighter 1 and Fighter 2 significant strikes landed by target zone and total cage control time.
3. **`⚡ Play-by-Play & Win Prob` Tab:**
   * Top: Chart.js Line Chart (`#winProbChartCanvas`) plotting the game's `winProbHistory` array from `0%` to `100%`.
   * Bottom: Chronological Play-by-Play stream with a `Filter: Scoring Plays Only` toggle button, period/time badge, team abbreviation, play description, and running score.

### Modal 2: Player / Fighter Detail Modal (`#playerDetailModal`)
* Displays team badge, position & team tag, player name, 4 highlight metric cards (`Primary Output`, `Secondary`, `Playmaking / Sub`, `Impact / Rating`), and a `Live Telemetry Breakdown` table.

### Modal 3: Team Roster Modal (`#rosterModal`)
*Triggered by clicking any team name in the Scorebug Hero.*
* Displays team badge, record, team shooting/yardage totals, and a clickable list of active roster players that transitions into the Player Detail Modal when clicked.

### Modal 4: Settings & Flask Backend API Inspector (`#settingsModal`)
* **Flask Backend Server URL Input:** Defaults to `http://localhost:5000` with an `Apply` button and cache status indicator (`✓ In-Memory Prewarmed Cache Active (TTL: 30s live / 300s standings)`).
* **Real-Time Scoreboard Polling Controls:** Buttons for `5s`, `15s (Default)`, `30s`, and `Paused`.
* **Interactive Backend Route Explorer:** Clickable endpoint buttons (`GET /api/health`, `GET /api/sports`, `GET /api/nba/games/today`, `GET /api/nba/games/401584901`, `GET /api/nfl/games/today`, `GET /api/nfl/game/401671201/drives`, `GET /api/ufc/events`, `GET /api/ufc/rankings`, `GET /api/tsdb/search/Celtics`) that render formatted JSON payloads in a `<pre>` inspector pane with a `📋 Copy JSON` clipboard button.

### Slide-Over Drawer: Tonight's Top Performers (`#leaderboardDrawer`)
* Right-hand slide-over drawer sorting all active players/fighters in the current sport by primary output (`PTS` / `YDS` / `SIG STR`), clickable to open the Player Detail Modal.

## 5. Backend API Contract (If Building Full-Stack Flask Backend)

If you are also implementing or wiring up the Python/Flask backend (`backend/app.py` & `backend/sports/registry.py`), expose the following REST endpoints with an in-memory TTL cache (30s for live scoreboards, 300s for standings/bios):

* `GET /api/health` — Returns `{ status: "ok", sports: ["nba", "nfl", "ufc"], cache: {...}, timestamp }`.
* `GET /api/sports` — Returns metadata and registered routes for all configured sports.
* `GET /api/<sport>/games/today` (and `GET /api/ufc/events`) — Returns the slate of games/bouts for the sport.
* `GET /api/<sport>/games/<game_id>` — Returns full box score, team stats, shot chart coordinates / strike targets, win probability array, and play-by-play feed.
* `GET /api/nfl/game/<game_id>/drives` — Returns drive-by-drive turf progression data.
* `GET /api/<sport>/standings` (and `GET /api/ufc/rankings`) — Returns conference/division standings or P4P/divisional rankings.
* `GET /api/<sport>/players` (and `GET /api/ufc/fighters`) — Returns active player/fighter directory.
* `GET /api/<sport>/stats` — Returns statistical leaders grouped by category.
* `GET /api/<sport>/seasons` (and `GET /api/ufc/history`) — Returns historical championship archive.
* `GET /api/tsdb/search/<query>` — Proxies/adapts team and venue metadata from TheSportsDB.

## 6. Key Engineering & QA Requirements

1. **Clean Polling Lifecycle:** Switching sports or changing polling intervals must always call `clearInterval` on the existing timer before starting a new one so intervals never stack or leak.
2. **Zero External Image Failures:** Render team and fighter badges using deterministic radial-gradient SVG/HTML components so the UI never displays broken image icons offline or under rate limits.
3. **Chart.js Instance Cleanup:** Always call `.destroy()` on existing Chart.js instances (`statsChartInstance` and `winProbChartInstance`) before re-rendering canvases on tab or sport switches.
4. **Responsive Mobile Navigation:** Ensure the mobile navigation drawer closes automatically when a view tab is clicked and never overlaps the main workspace.
5. **Off-Night Empty State:** Ensure selecting an idle schedule date (`2026-10-21`) renders a clear empty state with a one-click reset button back to the live slate.

# Pulse: Live Scores Web App. Design Spec

Handoff document for implementation. Covers visual system, layout, components, interactions, responsive behavior, accessibility and the data the UI needs. Mockups use placeholder data (fictional teams); wire everything to the real score feed.

## 1. Product intent

A real-time sports scores app for desktop and mobile browsers. Launch sports: NBA, NFL, UFC (architecture should allow more).

Design goals:
- Sleek, modern, dark, **solid colors only. No gradients, no glows, no shadows-as-decoration.**
- Intuitive: the most important thing (live games) is always at the top.
- Engaging: live indicators, follow/star, alerts, win probability, play-by-play.
- One codebase, responsive. Same components, different layout at narrow widths.

## 2. Design tokens

### Color

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0A0C0F` | Page background |
| `--bg-nav` | `#0D1014` | Sidebar, bottom tab bar |
| `--panel` | `#11141A` | Cards, detail panel, segmented control track |
| `--raised` | `#171B22` | Hover, selected row, selected segment/day |
| `--chip` | `#1E242D` | Team badge background |
| `--line` | `#222833` | Borders and dividers |
| `--line-strong` | `#2C3441` | Outlined buttons, empty-state dashes |
| `--line-faint` | `#1C212A` | List row dividers |
| `--off` | `#3A4350` | Neutral bars, inactive dots, separators |
| `--text` | `#E6E9EE` | Primary text, leading team |
| `--text-dim` | `#9AA3B2` | Trailing team name/score |
| `--muted` | `#8E97A6` | Secondary labels, records, captions |
| `--accent` | `#38BDF8` | **Only** live state, selection, follow, alerts, leading bar |
| `--on-accent` | `#06121A` | Text/icons on accent fills |

Rules:
- Accent is the only chroma in the UI. Never use it decoratively.
- Leader vs trailer is expressed by brightness (`--text` vs `--text-dim`), not red/green.
- Final games: winner `--text`, loser `--text-dim`. Upcoming: both `--text`.
- All text on its background must meet WCAG AA (4.5:1). The values above were chosen for that; don't dim `--muted` further.

### Typography

- **Scores, headings, wordmark, day numbers:** Space Grotesk (500/600/700)
- **UI text:** Inter (400/500/600)
- Load via Google Fonts, with `system-ui, sans-serif` fallback.

| Role | Font | Size / weight |
|---|---|---|
| Page title ("Scores") | Space Grotesk | 28 / 700, -0.02em |
| Wordmark "pulse" | Space Grotesk | 22 / 700, -0.02em (lowercase) |
| Detail score (desktop) | Space Grotesk | 40 / 700 |
| Detail score (mobile) | Space Grotesk | 44 / 700 |
| Card score | Space Grotesk | 26 / 700 |
| Team name | Inter | 15 / 600 (14 in detail) |
| Section label | Inter | 12-13 / 600, UPPERCASE, +0.08em, `--muted` |
| Meta line (sport · status) | Inter | 12 / 600, +0.04em, `--muted` |
| Record / caption | Inter | 12 / 400, `--muted` |
| Buttons, tabs | Inter | 14-15 / 600 |
| Play text | Inter | 14 desktop / 15 mobile, line-height 1.45 |

### Spacing, radius, size

- Spacing scale: 4, 8, 12, 16, 20, 24, 28, 40.
- Radius: 8 (team badge small), 9 (segment), 10 (nav item, input), 12 (day chip, segmented track, badges large), 14 (game card, mobile buttons), 16 (desktop detail panel), 22 (mobile sport pill, fully round).
- **Minimum touch target: 44x44px** for every interactive element.
- Borders: 1px solid `--line`. Selected card border: 1px `--accent`.
- No box-shadows. Depth comes from the panel/raised/line steps only.

### Icons

Inline SVG, 2px stroke, round caps/joins, `currentColor`-style stroke, 18-22px. Needed: pulse-line (logo/Scores), search, bell, star (outline + filled), calendar, user, chevron-left. No emoji anywhere.

### Motion

- Live dot: opacity pulse 1 -> 0.3 -> 1, 1.6s ease-in-out, infinite. Respect `prefers-reduced-motion` (disable the pulse).
- Score change: briefly flash the changed score number with the `--accent` color (~600ms, color only, no scale/glow), then settle. Optional but recommended for engagement.
- Everything else: instant or <=150ms. No decorative animation.

## 3. Information architecture

- **Scores** (home): today's games, filterable by sport, date and status.
- **Game detail**: scoreboard, win probability, Plays tab, Stats tab, alerts toggle.
- **Following**: games/teams the user starred.
- **Calendar**: browse by date. (Mobile tab only in the mockup; the date strip covers it on desktop.)
- **You**: settings/profile (placeholder).
- **Search**: teams, fighters, leagues.

Mobile routes: `/` (list) -> `/game/:id` (detail, own screen). Desktop: detail is a right-hand panel on `/` (also deep-linkable via `/game/:id`).

## 4. Desktop layout (>= ~1100px)

Three regions in a row: **Sidebar | Main (games list) | Detail panel**.

### 4.1 Sidebar (width ~232px, min 200px)
- Background `--bg-nav`, right border `--line`, padding 24/16.
- Logo: 32px accent square (radius 9) with pulse icon in `--on-accent`, then "pulse" wordmark.
- **Sports** section label, then nav items: All sports, NBA, NFL, UFC.
  - Item: 44px min height, radius 10, padding 0 12, 15/500.
  - Selected: bg `--raised`, text `--text`. Unselected: text `--muted`. Hover: bg `--raised`.
  - Right side: live count with pulsing dot, accent, 12/600, shown only when count > 0 (count of live games in that sport).
  - Use `aria-current="true"` on the selected item.
- **Following** section: each followed game as two-line button ("HAR vs SUM" / "NBA · Q3 · 4:12"); click selects that game in the detail panel. Empty state: "Tap the star on any game to follow it and keep it here."

### 4.2 Main column
- Padding 24/28. Header row (wraps):
  - Left: H1 "Scores" and date subtitle ("Saturday, October 31", `--muted` 14).
  - "Live · updated 2s ago" with pulsing dot (`--muted` 13). Must reflect real connection state; see section 9.
  - Search field: 44px high, 280px wide (min 200), bg `--panel`, 1px `--line`, radius 10, search icon, placeholder "Search teams, fighters, leagues".
- **Date strip:** 64x64 chips, radius 12, gap 8. Day-of-week (12/500) over date number (Space Grotesk 20/600). Selected: bg `--raised`, border `--accent`, text `--text`. Others: transparent bg, border `--line`, text `--muted`. Range: 2 days back to 2 forward, labelled "Today" for current day. Horizontally scrollable if it overflows.
- **Status filter** (segmented control): All / Live / Upcoming / Final. Track bg `--panel`, 1px `--line`, radius 12, padding 4. Segments min 44px high, min 64px wide, radius 9. Selected: bg `--text`, text `--bg` (inverted). Unselected: transparent, `--muted`.
- **Game groups** in this fixed order: **Live now**, **Up next**, **Final**. Hide empty groups.
  - Group header: dot (live group only, pulsing accent) + "LIVE NOW . 4" style label.
  - Cards in a CSS grid: `repeat(auto-fill, minmax(250px, 1fr))`, gap 12.
- **Empty state** (no games match filters): dashed 1px `--line-strong` box, centered, "No games match this filter right now. Try All to see everything on today."

### 4.3 Game card (shared by desktop + mobile)
- bg `--panel`, 1px `--line`, radius 14, padding 14/16/16. Hover: bg `--raised`. Selected (desktop only): border `--accent`.
- Row 1 (meta): `SPORT . [live dot] STATUS`, 12/600 `--muted`; status text is `--accent` when live, `--muted` otherwise. Reserve ~36px right padding for the star.
  - Status text examples: `Q3 . 4:12`, `7:30 PM`, `Final`, `Rd 2 . 3:12`, `11:00 PM . Main event`, `Final . KO Rd 1`.
- Rows 2-3: one row per competitor (away on top, home below): 30px badge (radius 8, bg `--chip`, 3-letter abbreviation Space Grotesk 11/600) + name (15/600) over record (12 `--muted`) + score at far right (Space Grotesk 26/700).
  - Leader/winner `--text`, other `--text-dim`.
  - **Scores are hidden** for upcoming games, and for live UFC (no running score; the meta line carries round and clock).
  - Final UFC shows `W` / `L` in the score slot.
- **Star button:** absolute top-right, 44x44 hit area, 18px icon. Outline `--muted` when unfollowed; filled + stroked `--accent` when followed. `aria-pressed`, label "Follow X versus Y" / "Unfollow ...". It is a separate button, not nested inside the card button/link.
- Card click: desktop selects the game (updates the detail panel); mobile navigates to the game detail screen.

### 4.4 Detail panel (right, ~340-420px, wraps below on narrower desktops)
- bg `--panel`, 1px `--line`, radius 16, overflow hidden.
- **Top bar** (56px, bottom border): `SPORT . [dot] STATUS` on the left; **Alerts toggle** on the right (bell icon + "Alerts on"/"Alerts off", accent when on, `--muted` when off, `aria-pressed`).
- **Scoreboard:** three columns. Away badge (48px, radius 12) + name + record | center score `71 : 74` (leader `--text`, trailer `--text-dim`, colon `--off`) + status line | home badge + name + record. For upcoming/UFC-live, center shows "vs" (Space Grotesk 28, `--off`) instead of a score.
- **Win probability** (live games only): labels `HAR 42% . Win probability . SUM 58%`, then two bars (height 8, radius 4, gap 4) with flex ratios equal to the percentages. The favored side's bar is `--accent`, the other `--off`.
- **Tabs** (segmented, same style as the status filter but track bg `--bg`): **Plays** / **Stats**. Selected segment bg `--raised`.
- **Plays:** reverse-chronological list. Each item: 8px dot (newest live play `--accent`, others `--off`), timestamp (12 `--muted`), description (14). Dividers `--line-faint`. Empty state (upcoming): "Play-by-play starts when the game does. Turn on alerts and we will ping you at tip-off."
- **Stats:** one block per stat: `homeValue | label | awayValue` row (values 14/600, label 12 `--muted`), then two bars (height 6, radius 3, flex = values). Higher value's bar `--accent`, other `--off`; tie = both `--off`. Empty state: "Team stats appear here once the game gets going."
- Stat sets are sport-specific (see section 8).

## 5. Mobile layout (<= ~700px, designed at 390 wide)

Single column, bottom tab bar. All touch targets >= 44px.

### 5.1 Scores screen
Top to bottom:
1. Header: 28px logo square + "pulse" + search icon button + bell icon button (44x44 each).
2. **Sport pills** (horizontal scroll): All / NBA / NFL / UFC. 44px high, radius 22, 1px border. Selected = filled `--text` with `--bg` text; unselected = transparent with `--line-strong` border. A small live dot appears on any pill whose sport has live games.
3. **Date strip:** 56x56 chips, same styling as desktop (smaller).
4. **Status segmented control:** full-width, four equal segments.
5. **Scrollable list:** grouped sections (Live now / Up next / Final) of game cards, one per row, full width, gap 10; section gap 24. Bottom padding clears the tab bar (~96px).
6. **Bottom tab bar** (72px, bg `--bg-nav`, top border `--line`): Scores, Following, Calendar, You. Icon (22) over label (12). Active = `--accent`, inactive = `--muted`; `aria-current="page"` on active. Fixed to the bottom.

Header and filters stay put; only the game list scrolls.

### 5.2 Game detail screen
1. Top bar: back chevron (44x44, returns to list) | centered `SPORT . [dot] STATUS` | follow star (44x44).
2. Scoreboard (badges 52px, score 44px), "Summit leads by 3" caption (dynamic: "X leads by N" / "Tied"; for UFC use round/clock).
3. Win probability bars (live only).
4. Plays/Stats segmented tabs, then scrollable content.
5. **Sticky bottom action bar** (84px, bg `--bg-nav`, top border): primary "Alerts on / Turn on alerts" button (52px, radius 14; on = accent fill with `--on-accent` text, off = outlined) + secondary "All scores" outlined button. No tab bar on this screen.

### 5.3 Breakpoints
- `>= 1100px`: three regions (sidebar | main | detail panel).
- `700-1099px`: sidebar collapses to a top sport row (same as mobile pills); detail panel opens as a full-width section below or a slide-over drawer; list stays a grid.
- `< 700px`: mobile layout above; card grid becomes a single column.
Use fluid widths, `min-width: 0` on flex children, and let toolbars wrap. No horizontal page scroll at any width.

## 6. Interaction and states

| Interaction | Behavior |
|---|---|
| Sport select | Filters list to that sport. State persists (URL param `?sport=nba` recommended). Live counts update in real time. |
| Date select | Loads that day's games. Past = Final games, future = Upcoming. |
| Status filter | Client-side filter of the loaded day. |
| Card click | Desktop: select game, update panel, keep scroll. Mobile: push `/game/:id`. |
| Star | Toggle follow, persist (account or localStorage), update Following list immediately (optimistic). |
| Alerts toggle | Per-game notifications (score changes, period end, final). Request notification permission on first enable; if denied, show an inline explanation and revert the toggle. |
| Plays/Stats tab | Local state; remember last choice per session. |
| Live updates | Scores, clock, win probability, plays update in place without reflow jumps. New play prepends with the accent dot; previous newest play's dot returns to `--off`. |
| Game state change | A game moving Upcoming -> Live -> Final moves between groups automatically. |

State coverage to implement: loading (skeleton cards in `--panel`/`--raised`, no shimmer gradient: use a simple opacity pulse), empty (no games), error / offline (replace "Live" indicator with "Reconnecting..." in `--muted` and keep last known data), no search results, delayed/postponed/cancelled game (status text replaces clock, scores hidden if none).

Focus: visible `2px solid --accent` outline with 2px offset on all interactive elements. Hover only on pointer devices.

## 7. Accessibility

- Semantic elements: `<nav>`, `<main>`, `<section>` + `<h2>` per group, real `<button>`/`<a>`/`<input>`, `<ul>`/`<li>` for plays.
- Card = one link/button with an `aria-label` summarising it ("NBA: Harbor Kings versus Summit Wolves, Q3 4:12"). Score changes announced via an `aria-live="polite"` region (throttled; do not announce every second).
- Toggles use `aria-pressed`; current nav uses `aria-current`.
- Icon-only buttons need `aria-label`; decorative SVGs `aria-hidden="true"`.
- Leader/trailer difference is lightness, not hue; live state also has text ("Q3 . 4:12"), not color alone.
- Honor `prefers-reduced-motion`.

## 8. Data the UI needs

```ts
type Sport = 'NBA' | 'NFL' | 'UFC';
type GameStatus = 'live' | 'upcoming' | 'final';

interface Competitor {
  id: string;
  abbr: string;          // 2-3 letters, shown in badge
  name: string;
  record: string;        // "2-1", "14-2"
  score: number | 'W' | 'L' | null; // null = hide (upcoming, live UFC)
}

interface Game {
  id: string;
  sport: Sport;
  status: GameStatus;
  statusText: string;    // "Q3 . 4:12", "7:30 PM", "Final", "Rd 2 . 3:12"
  startTime: string;     // ISO
  away: Competitor;      // top row; for UFC use fighter 1
  home: Competitor;      // bottom row; for UFC use fighter 2
  winProbHome?: number;  // 0-100, live only
  stats?: { label: string; away: number; home: number; unit?: '%' }[];
  plays?: { clock: string; text: string }[]; // newest first
}
```

Sport-specific stats shown in the Stats tab:
- NBA: Field goal %, Rebounds, Assists, Three-pointers
- NFL: Total yards, Rushing yards, Third-down %
- UFC: Significant strikes, Takedowns, Control time (min)

Real-time transport: WebSocket or SSE for live games, with polling fallback; the list endpoint seeds initial state. The "updated Ns ago" label derives from the last received message.

## 9. Implementation notes

- Suggested stack: any component framework with CSS variables for the tokens above (React/Next, Svelte or similar). Define tokens once as CSS custom properties; no hard-coded hexes in components.
- Build order: tokens -> GameCard -> list + filters -> detail panel/screen -> real-time layer -> alerts/follow persistence.
- Components to build: `Sidebar`, `SportPills`, `DateStrip`, `SegmentedControl` (reused for status filter and Plays/Stats), `GameCard`, `GroupHeader`, `LiveDot`, `StarButton`, `Scoreboard`, `WinProbBar`, `PlayList`, `StatBars`, `AlertsToggle`, `TabBar`, `EmptyState`.
- `SegmentedControl` has two skins: filter (selected = inverted `--text` fill) and detail tabs (selected = `--raised`). Keep as a `variant` prop.
- Keep card, badge and score styling in one component; desktop and mobile differ only in the container.
- No gradients anywhere, including loading skeletons, bars and backgrounds.

## 10. Out of scope for this pass

Team logos (badges use abbreviations; swap in logos later inside the 30/48/52px badge slots), betting odds, standings pages, user accounts UI, light theme, and a Standings/League table view.

# Phase 2: Mobile Web Browser Optimization

## Purpose

Make Airball comfortable and reliable to use in mobile web browsers while preserving its fast, information-rich sports experience. The project already has a responsive viewport declaration and some responsive component styles; this phase audits the full experience and closes the gaps rather than treating mobile support as a new build.

## Goals

- Make core score, schedule, standings, player, game, event, and fighter tasks usable on narrow touch screens.
- Keep layouts readable at common phone widths, in portrait and landscape, without accidental horizontal page scrolling.
- Make navigation, filters, controls, tables, charts, and dialogs work well with touch, keyboard, and assistive technology.
- Reduce mobile loading and rendering cost, especially for image-heavy lists and frequently refreshed live data.
- Preserve the existing dark visual style and desktop/tablet layouts.

## Scope

### Included

- Shared navigation, page layout, footer, cards, buttons, forms, menus, dialogs, and error/loading states.
- NBA, NFL, and UFC landing pages, lists, standings, stats, search, comparison, and detail views.
- Responsive behavior, touch interaction, accessibility, and browser-level performance.
- A repeatable mobile review and regression process for future UI work.

### Out of scope

- Native iOS or Android applications, app-store delivery, and push notifications.
- Changes to sports data providers or backend endpoints unless mobile profiling shows an API issue that blocks a key workflow.
- A full visual redesign or changes to desktop information architecture.

## UX and implementation principles

- Prioritize the score, event status, matchup, and primary action at the top of each screen.
- Use fluid sizing and content-driven breakpoints; check narrow phones, larger phones, and small tablets rather than targeting one device.
- Keep essential information visible. For dense data, use purposeful horizontal scrolling inside a labeled table/chart region, or provide a compact stacked presentation; do not shrink text until it is unreadable.
- Make interactive targets comfortable to tap, provide visible focus, and do not make hover the only way to reveal information.
- Respect safe-area insets, browser chrome, text resizing, reduced motion, and user color-contrast preferences.
- Prefer CSS and semantic HTML changes. Add JavaScript responsive behavior only when layout alone cannot provide the right interaction.

## Development pipeline

### 1. Audit and establish the baseline

- Inventory routes, shared components, CSS breakpoints, modals, data tables, charts, and scroll regions.
- Review each key route at approximately 320, 375, 390, 430, 768, and 1024 CSS pixels; include portrait and landscape checks where relevant.
- Record issues by route and severity: blocked task, clipped/overlapping content, difficult touch interaction, readability, then polish.
- Capture representative before-state screenshots and note the browser/device used so fixes can be compared consistently.

**Deliverable:** prioritized mobile issue list mapped to the component or page responsible.

### 2. Fix the shared shell and interaction patterns

- Refine the navbar for small screens: clear sport switching, reachable primary navigation, compact secondary actions, and no crowded or clipped controls.
- Review page gutters, content width, headings, card grids, footer, sticky elements, and safe-area padding.
- Set consistent mobile rules for form controls, button sizing, spacing, focus states, and overflow behavior.
- Make settings and player dialogs fit the dynamic viewport, scroll internally when needed, and expose an obvious close action.
- Verify menus and dialogs do not trap the page in an unusable scroll state or hide focused controls behind the on-screen keyboard.

**Exit check:** shared shell and dialogs remain usable at 320 CSS pixels and with text zoom, and the page has no unintended horizontal overflow.

### 3. Adapt sport-specific screens

- **NBA:** review game cards and scorebug, game detail tabs, box scores, play-by-play, standings, player lists, team detail, shot charts, and lineups. Keep matchup and live status prominent; make dense box-score and play-by-play data navigable on phones.
- **NFL:** review game cards, drive tracker, team/player stats, standings, and season comparisons. Keep possession, down, distance, and game clock legible; collapse comparison layouts when columns become cramped.
- **UFC:** review event cards, fight cards, rankings, fighter grids and profiles, stats, history, and fighter comparison. Stack comparison content or provide a deliberate swipeable comparison region on narrow screens while retaining fighter labels.
- For every sport, check loading, empty, error, and long-content states, as well as realistic long team/player names and missing imagery.

**Exit check:** a user can reach and complete the primary browse, search/filter, and detail-view tasks for each sport without desktop-only interactions.

### 4. Improve mobile performance

- Establish a production-build baseline for transfer size, initial render, and key route responsiveness on a throttled mobile profile.
- Inspect image dimensions and formats; serve appropriately sized assets, reserve aspect-ratio space, and lazy-load below-the-fold imagery where it does not delay key content.
- Review font loading and unused font weights; avoid layout shifts while fonts and images load.
- Check React rendering and polling on active game views so frequent updates do not cause unnecessary work or disrupt scrolling/focus.
- Use route-level or component-level code splitting only where bundle analysis shows a meaningful benefit.
- Re-measure after each optimization and document the change and impact.

**Exit check:** mobile performance improves or stays within agreed budgets without delaying the primary scores and event information. Set numeric budgets after the baseline is recorded.

### 5. Verify, fix regressions, and release

- Run the existing lint, frontend test, backend test, and production build checks after implementation changes.
- Review the route/device matrix in real mobile browsers or browser device emulation, including at least one iOS Safari and one Android Chrome pass when devices are available.
- Check touch, keyboard-only navigation, focus visibility, screen-reader labels for controls, 200% text zoom, reduced motion, and safe-area behavior.
- Recheck desktop and tablet layouts for regressions; verify links, search, filters, tabs, modal close behavior, and live updates.
- Attach before/after evidence to the release review and list known issues with owner and follow-up phase.

**Release gate:** all critical and high-severity mobile issues are closed; key flows pass on the supported browsers; no new blocking desktop regressions remain.

## Suggested screen review matrix

| Area | Mobile behavior to confirm |
| --- | --- |
| Global navigation | Sport and page navigation are discoverable, reachable, and do not overflow |
| Home/live score views | Score, status, matchup, and primary links fit without clipping |
| Lists and search | Search/filter controls remain usable with the keyboard open; cards stack cleanly |
| Tables and analytics | Data is readable and scrollable within its region, with column labels retained |
| Detail pages | Tabs, summaries, charts, and play-by-play adapt to portrait and landscape |
| Modals and menus | Content fits the visible viewport and controls remain reachable while scrolling |
| Media and loading | Images reserve space; loading, empty, and error states fit narrow widths |

## Definition of done

- Core NBA, NFL, and UFC workflows work at 320 CSS pixels and above without clipped controls or unintended page-level horizontal scrolling.
- Dense data has a clear mobile presentation and an accessible way to reach all retained information.
- Interactive controls are touch-friendly, keyboard operable, and visibly focused; labels and status are available to assistive technology.
- Safe areas, dynamic browser viewport, text zoom, and reduced-motion preferences are handled where applicable.
- Mobile performance has a recorded before/after measurement and no regression to key content availability.
- The project’s existing checks pass, the mobile browser/device matrix is documented, and desktop/tablet layouts are reviewed.

## Risks and decisions to resolve during implementation

- Dense score and statistics layouts may require choosing between a compact card view and contained horizontal scrolling; decide per data type based on readability and task completion.
- Sticky navigation or score controls can consume scarce viewport height; validate their value on short screens before retaining them.
- Device coverage varies by team; document actual browsers/devices used and use emulation as a supplement, not as proof of all real-device behavior.
- Avoid setting performance budgets before measuring the current production build; establish thresholds from the baseline and deployment constraints.

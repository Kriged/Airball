# Airball

A full-stack, multi-sport match center for NBA, NFL, and UFC data. Airball combines a React/Vite frontend with a Flask API layer to provide live scores, standings, player and fighter profiles, stats, schedules, and event detail pages.

## Features

- NBA, NFL, and UFC sections with sport-aware navigation
- Live and scheduled game/event listings
- Game details, box scores, play-by-play, lineups, and team pages
- NBA and NFL standings, player search, stat leaders, and season history
- UFC events, fighters, rankings, archived fights, leaderboards, and fighter comparison
- Provider-backed API adapters with caching and offline fallbacks
- Responsive dark UI with stream-sync controls and team/fighter imagery

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, React Router, Vite |
| Backend | Flask, Flask-CORS |
| Data providers | ESPN, API-Sports, BallDontLie, TheSportsDB |
| Testing | Vitest, Pytest |
| Styling | CSS |

## Project structure

```text
├── backend/
│   ├── adapters/         # Sport and provider integrations
│   ├── core/             # Shared cache, HTTP client, and rate limiter
│   ├── data/ufc/         # Bundled UFC fighter, event, and fight data
│   ├── sports/           # Adapter registration
│   └── app.py            # Flask application
├── src/
│   ├── components/       # Shared React components
│   ├── context/          # Active sport context
│   ├── pages/            # NBA, NFL, and UFC pages
│   └── utils/            # Client caching, polling, media helpers
├── tests/
│   ├── proxy/            # Frontend/proxy tests
│   └── test_*.py         # Backend API tests
├── package.json
├── requirements.txt
└── vite.config.js
```

## Getting started

### Prerequisites

- Node.js 20+
- Python 3.10+
- npm

### Installation

```bash
git clone <your-repository-url>
cd BasketballDatabase

npm install
python -m pip install -r requirements.txt
```

### Environment variables

Create a local `.env` file for optional provider integrations:

```env
# TheSportsDB
THESPORTSDB_KEY=3

# API-Sports NFL
NFL_API_KEY=your_api_sports_key

# BallDontLie NBA
BALLDONTLIE_API_KEY=your_balldontlie_key
```

Never commit provider credentials. Keep `.env` ignored and rotate any key that has been exposed.

### Run locally

```bash
npm run dev
```

This starts:

- Vite frontend: `http://localhost:5173`
- Flask API: `http://localhost:5000`

Vite proxies `/api` requests to the Flask server during development.

## Available scripts

```bash
# Start frontend and backend together
npm run dev

# Create a production frontend build
npm run build

# Check frontend code quality
npm run lint

# Run Vitest tests
npm test -- --run

# Run backend tests
python -m pytest -q
```

## API overview

### General

| Endpoint | Description |
| --- | --- |
| `GET /api/health` | API health and supported sports |

### NBA

| Endpoint | Description |
| --- | --- |
| `GET /api/nba/games/today` | Today’s games |
| `GET /api/nba/games` | Game list |
| `GET /api/nba/games/:gameId` | Game details |
| `GET /api/nba/standings` | Current standings |
| `GET /api/nba/players` | Player list/search |
| `GET /api/nba/stats/leaders` | Statistical leaders |
| `GET /api/nba/balldontlie/teams` | BallDontLie team data |
| `GET /api/nba/balldontlie/players` | BallDontLie player data |

### NFL

| Endpoint | Description |
| --- | --- |
| `GET /api/nfl/games/today` | Today’s games |
| `GET /api/nfl/games` | Game list |
| `GET /api/nfl/standings` | Current standings |
| `GET /api/nfl/players?search=Mahomes` | Player search |
| `GET /api/nfl/stats/leaders` | Statistical leaders |
| `GET /api/nfl/apisports/status` | API-Sports integration status |
| `GET /api/nfl/apisports/teams` | API-Sports teams |
| `GET /api/nfl/apisports/standings` | API-Sports standings |

### UFC

| Endpoint | Description |
| --- | --- |
| `GET /api/ufc/events` | UFC events |
| `GET /api/ufc/events/:eventId` | Event and fight-card details |
| `GET /api/ufc/fighters` | Fighters, search, filters, and pagination |
| `GET /api/ufc/fighters/:fighterId` | Fighter profile |
| `GET /api/ufc/fighters/:fighterId/stats` | Fighter career statistics |
| `GET /api/ufc/fighters/compare?fighter1=:id&fighter2=:id` | Fighter comparison |
| `GET /api/ufc/fights` | Archived fights |
| `GET /api/ufc/stats/leaders` | UFC statistical leaders |
| `GET /api/ufc/stats/overview` | UFC database overview |
| `GET /api/ufc/rankings` | UFC rankings |

## Resilience and caching

The backend uses an in-memory stale-while-revalidate cache to reduce provider calls and keep the experience responsive. Where supported, adapters fall back to bundled or normalized data when an external provider is unavailable or rate-limited.

## Testing

```bash
npm test -- --run
python -m pytest -q
```

The test suite covers provider response normalization, cache behavior, failure handling, security hardening, and the NBA, NFL, and UFC API routes.

## License

This project is licensed under the [MIT License](LICENSE) © 2026 Kriged.

## Data Attribution & Third-Party Terms

All sports scores, statistics, player profiles, and logos are retrieved through third-party APIs and public services subject to their respective terms of use:
- **ESPN APIs**: Scoreboards and play-by-play data are fetched via ESPN public endpoints. Intended for non-commercial personal viewing. All trademarks belong to ESPN, NBA, NFL, and UFC.
- **TheSportsDB**: Team logos and fighter photos are provided under [TheSportsDB Free API](https://www.thesportsdb.com) terms, restricted to non-commercial/hobbyist use.
- **API-Sports**: NFL statistics and rosters are provided under [API-Sports Terms of Service](https://api-sports.io/terms). Raw data redistribution is prohibited; commercial use requires a paid subscription.
- **BallDontLie**: NBA stats and player directories are provided under [BallDontLie Terms](https://www.balldontlie.io). Non-commercial use on free tier; trademarks belong to NBA Properties, Inc.

See [NOTICE](NOTICE) for complete third-party licensing and usage terms.


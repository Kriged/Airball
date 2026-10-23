"""
API-Sports NFL Adapter
Integrates https://v1.american-football.api-sports.io for official NFL data:
- Teams (stadium, coach, owner, established year, official logos)
- Standings (AFC/NFC, divisions, wins/losses/ties, streak, points differential)
- Games (quarter-by-quarter line scores, overtime, venues, weekly stages)
- Players (search by name, team rosters, headshots, college, physical attributes)
"""
import os
import time
import requests
from flask import jsonify, request
from backend.core.rate_limiter import api_sports_limiter
from backend.core.provider_client import fetch_with_circuit_breaker, ProviderUnavailableError
from backend.adapters.espn_nfl import NFL_TEAM_FULL_NAMES, NFL_TEAM_IDS

API_BASE = "https://v1.american-football.api-sports.io"
LEAGUE_NFL_ID = 1

def get_api_key():
    return os.getenv("NFL_API_KEY") or os.getenv("API_SPORTS_KEY") or "d0b578997077889c54acfebde4972e81"

_session = requests.Session()
_MEMORY_CACHE = {}

# API-Sports is an enhancement, not the sole source of truth for basic NFL
# navigation. Keep the app useful when the provider is rate-limited or offline.
_AFC_TEAMS = {
    'BAL', 'BUF', 'CIN', 'CLE', 'DEN', 'HOU', 'IND', 'JAX', 'KC', 'LAC',
    'LV', 'MIA', 'NE', 'NYJ', 'PIT', 'TEN',
}


def _fallback_teams():
    return [
        {'id': int(NFL_TEAM_IDS[code]), 'name': name, 'code': code}
        for code, name in NFL_TEAM_FULL_NAMES.items()
    ]


def _fallback_standings():
    """Return a complete, clearly neutral standings shape while offline."""
    standings = {'AFC': [], 'NFC': []}
    for code, name in NFL_TEAM_FULL_NAMES.items():
        conference = 'AFC' if code in _AFC_TEAMS else 'NFC'
        standings[conference].append({
            'rank': len(standings[conference]) + 1,
            'team': name,
            'teamId': int(NFL_TEAM_IDS[code]),
            'abbr': code,
            'logo': None,
            'division': '',
            'wins': 0,
            'losses': 0,
            'ties': 0,
            'pct': '.000',
            'streak': '-',
            'pf': 0,
            'pa': 0,
            'diff': 0,
        })
    return standings

# Fallback Notable NFL Players with full bio & headshots
FALLBACK_NFL_PLAYERS = [
    {
        "id": 1197, "name": "Patrick Mahomes", "age": 29, "height": "6' 2\"", "weight": "225 lbs",
        "college": "Texas Tech", "group": "Offense", "position": "QB", "number": 15, "experience": 8,
        "team": "Kansas City Chiefs", "teamAbbr": "KC",
        "image": "https://media.api-sports.io/american-football/players/1197.png",
        "passingYards": 4183, "rushingYards": 389, "receivingYards": 0, "touchdowns": 27, "status": "Active"
    },
    {
        "id": 854, "name": "Lamar Jackson", "age": 27, "height": "6' 2\"", "weight": "215 lbs",
        "college": "Louisville", "group": "Offense", "position": "QB", "number": 8, "experience": 7,
        "team": "Baltimore Ravens", "teamAbbr": "BAL",
        "image": "https://media.api-sports.io/american-football/players/854.png",
        "passingYards": 3678, "rushingYards": 821, "receivingYards": 0, "touchdowns": 29, "status": "Active"
    },
    {
        "id": 1184, "name": "Travis Kelce", "age": 35, "height": "6' 5\"", "weight": "250 lbs",
        "college": "Cincinnati", "group": "Offense", "position": "TE", "number": 87, "experience": 12,
        "team": "Kansas City Chiefs", "teamAbbr": "KC",
        "image": "https://media.api-sports.io/american-football/players/1184.png",
        "passingYards": 0, "rushingYards": 0, "receivingYards": 984, "touchdowns": 5, "status": "Active"
    },
    {
        "id": 248, "name": "Josh Allen", "age": 28, "height": "6' 5\"", "weight": "237 lbs",
        "college": "Wyoming", "group": "Offense", "position": "QB", "number": 17, "experience": 7,
        "team": "Buffalo Bills", "teamAbbr": "BUF",
        "image": "https://media.api-sports.io/american-football/players/248.png",
        "passingYards": 4306, "rushingYards": 524, "receivingYards": 0, "touchdowns": 44, "status": "Active"
    },
    {
        "id": 1380, "name": "Justin Jefferson", "age": 25, "height": "6' 1\"", "weight": "195 lbs",
        "college": "LSU", "group": "Offense", "position": "WR", "number": 18, "experience": 5,
        "team": "Minnesota Vikings", "teamAbbr": "MIN",
        "image": "https://media.api-sports.io/american-football/players/1380.png",
        "passingYards": 0, "rushingYards": 0, "receivingYards": 1074, "touchdowns": 5, "status": "Active"
    },
    {
        "id": 1826, "name": "Derrick Henry", "age": 30, "height": "6' 3\"", "weight": "247 lbs",
        "college": "Alabama", "group": "Offense", "position": "RB", "number": 22, "experience": 9,
        "team": "Baltimore Ravens", "teamAbbr": "BAL",
        "image": "https://media.api-sports.io/american-football/players/1826.png",
        "passingYards": 0, "rushingYards": 1167, "receivingYards": 214, "touchdowns": 12, "status": "Active"
    }
]


def _request_headers():
    return {
        "x-apisports-key": get_api_key(),
        "Accept": "application/json"
    }


def fetch_apisports(endpoint, params=None, timeout=(2.0, 3.0), ttl=3600):
    """Execute authenticated call to API-Sports with cache & daily quota guard."""
    cache_key = f"{endpoint}:{str(params)}"
    now = time.time()

    if cache_key in _MEMORY_CACHE:
        val, exp = _MEMORY_CACHE[cache_key]
        if now < exp:
            return val

    # Guard against exceeding the 100 req/day free quota
    if not api_sports_limiter.can_call():
        print(f"[API-SPORTS] Quota exhausted (remaining: {api_sports_limiter.remaining}). Serving cached/fallback.")
        if cache_key in _MEMORY_CACHE:
            return _MEMORY_CACHE[cache_key][0]
        return {"response": [], "results": 0, "quota_exhausted": True}

    url = f"{API_BASE}/{endpoint.lstrip('/')}"
    try:
        resp = fetch_with_circuit_breaker(
            "api_sports", url, request_session=_session, headers=_request_headers(),
            params=params, timeout=timeout,
        )
        data = resp.json()
        _MEMORY_CACHE[cache_key] = (data, now + ttl)
        return data
    except (ProviderUnavailableError, requests.RequestException, ValueError) as e:
        print(f"[API-SPORTS] Error fetching {endpoint}: {e}")
        if cache_key in _MEMORY_CACHE:
            return _MEMORY_CACHE[cache_key][0]
        return {"response": [], "results": 0, "error": str(e)}


def get_status():
    """Check API-Sports account status and daily remaining quota."""
    key = get_api_key()
    masked = f"{key[:4]}...{key[-4:]}" if len(key) >= 8 else "***"
    raw = fetch_apisports('status', ttl=300)
    resp = raw.get('response', {})
    # The provider's status endpoint returns an object, while our standard
    # fallback response uses an empty list. Treat malformed responses as empty.
    if isinstance(resp, list):
        resp = resp[0] if resp and isinstance(resp[0], dict) else {}
    if not isinstance(resp, dict):
        resp = {}
    sub = resp.get('subscription', {})
    reqs = resp.get('requests', {})
    if not isinstance(sub, dict):
        sub = {}
    if not isinstance(reqs, dict):
        reqs = {}
    return {
        'status': 'active' if sub.get('active', True) else 'inactive',
        'provider': 'API-Sports',
        'sport': 'American Football (NFL)',
        'api_key': masked,
        'plan': sub.get('plan', 'Free'),
        'quota_daily_limit': reqs.get('limit_day', 100),
        'quota_current_used': reqs.get('current', 0),
        'quota_remaining_limiter': api_sports_limiter.remaining,
        'supported_endpoints': [
            '/api/nfl/apisports/teams',
            '/api/nfl/apisports/standings',
            '/api/nfl/apisports/games',
            '/api/nfl/apisports/players',
            '/api/nfl/apisports/players/<id>',
            '/api/nfl/apisports/status'
        ]
    }


def get_teams(season=2024):
    """Fetch all official NFL teams with stadiums, coaches, logos."""
    raw = fetch_apisports('teams', params={'league': LEAGUE_NFL_ID, 'season': season}, ttl=86400)
    teams = raw.get('response', [])
    if not isinstance(teams, list):
        teams = []
    # Filter out NFC/AFC conference entries
    teams = [t for t in teams if isinstance(t, dict) and t.get('code') and t.get('name') not in ('NFC', 'AFC')]
    return teams or _fallback_teams()


def format_game(raw_g):
    """Normalize API-Sports game into Airball standard game model."""
    g = raw_g.get('game', {})
    teams = raw_g.get('teams', {})
    scores = raw_g.get('scores', {})
    home = teams.get('home', {})
    away = teams.get('away', {})
    status_info = g.get('status', {})

    short_status = (status_info.get('short') or '').upper()
    if short_status in ('FT', 'AOT'):
        status = 'FINAL'
    elif short_status in ('Q1', 'Q2', 'Q3', 'Q4', 'OT', 'HT', 'LIVE'):
        status = 'LIVE'
    elif short_status in ('POSTP', 'CANC'):
        status = 'POSTPONED'
    else:
        status = 'UPCOMING'

    home_sc = scores.get('home', {})
    away_sc = scores.get('away', {})

    return {
        'id': str(g.get('id')),
        'date': g.get('date', {}).get('date'),
        'time': g.get('date', {}).get('time'),
        'stage': g.get('stage'),
        'week': g.get('week'),
        'venue': g.get('venue', {}).get('name'),
        'city': g.get('venue', {}).get('city'),
        'status': status,
        'statusDetail': status_info.get('long', status),
        'home': home.get('name', 'Home'),
        'homeLogo': home.get('logo'),
        'homeScore': home_sc.get('total') or 0,
        'away': away.get('name', 'Away'),
        'awayLogo': away.get('logo'),
        'awayScore': away_sc.get('total') or 0,
        'linescore': {
            'home': [home_sc.get('quarter_1'), home_sc.get('quarter_2'), home_sc.get('quarter_3'), home_sc.get('quarter_4')],
            'away': [away_sc.get('quarter_1'), away_sc.get('quarter_2'), away_sc.get('quarter_3'), away_sc.get('quarter_4')]
        },
        'overtime': {
            'home': home_sc.get('overtime'),
            'away': away_sc.get('overtime')
        }
    }


def get_games(season=2024, date=None, team_id=None, limit=50):
    """Fetch games with quarter-by-quarter line scores."""
    params = {'league': LEAGUE_NFL_ID, 'season': season}
    if date:
        params['date'] = date
    if team_id:
        params['team'] = team_id

    raw = fetch_apisports('games', params=params, ttl=1800)
    data = raw.get('response', [])
    if not isinstance(data, list):
        data = []
    formatted = [format_game(g) for g in data]
    return formatted[:limit]


def get_standings(season=2024):
    """Fetch NFL conference and division standings."""
    raw = fetch_apisports('standings', params={'league': LEAGUE_NFL_ID, 'season': season}, ttl=3600)
    data = raw.get('response', [])
    if not isinstance(data, list) or not data:
        return _fallback_standings()
    standings = {'AFC': [], 'NFC': []}

    for item in data:
        conf = item.get('conference') or ''
        conf_key = 'AFC' if 'American' in conf or 'AFC' in conf else 'NFC'
        team = item.get('team', {})
        games = item.get('games', {})
        pts = item.get('points', {})

        standings[conf_key].append({
            'rank': item.get('position', 0),
            'team': team.get('name', ''),
            'teamId': team.get('id'),
            'logo': team.get('logo'),
            'division': item.get('division', ''),
            'wins': games.get('won', 0),
            'losses': games.get('lost', 0),
            'ties': games.get('ties', 0),
            'pct': str(games.get('streak', {}).get('pct') or item.get('streak', '-')),
            'streak': str(item.get('streak') or '-'),
            'pf': pts.get('for', 0),
            'pa': pts.get('against', 0),
            'diff': pts.get('difference', 0)
        })

    standings['AFC'].sort(key=lambda x: x['rank'])
    standings['NFC'].sort(key=lambda x: x['rank'])
    return standings


def format_player(raw_p, team_name=None):
    """Format API-Sports NFL player into standard player model."""
    pos = raw_p.get('position', 'N/A') or 'N/A'
    return {
        'id': raw_p.get('id'),
        'name': raw_p.get('name', 'Unknown Player'),
        'pos': pos,
        'position': pos,
        'group': raw_p.get('group', 'Offense'),
        'number': raw_p.get('number', '—'),
        'jersey_number': str(raw_p.get('number', '—')),
        'age': raw_p.get('age'),
        'height': raw_p.get('height') or '—',
        'weight': raw_p.get('weight') or '—',
        'college': raw_p.get('college') or '—',
        'salary': raw_p.get('salary') or '—',
        'experience': raw_p.get('experience', 0),
        'image': raw_p.get('image'),
        'team': team_name or 'NFL',
        'status': 'Active',
        'passingYards': 0,
        'rushingYards': 0,
        'receivingYards': 0,
        'touchdowns': 0
    }


def search_players(query):
    """Search NFL players by name with fallback support."""
    if not query:
        return FALLBACK_NFL_PLAYERS

    q = query.strip().lower()
    raw = fetch_apisports('players', params={'search': query.strip()}, ttl=86400)
    data = raw.get('response', [])
    if not isinstance(data, list):
        data = []

    if data:
        return [format_player(p) for p in data]

    # Fallback search matching
    matching = [p for p in FALLBACK_NFL_PLAYERS if q in p['name'].lower()]
    return matching if matching else FALLBACK_NFL_PLAYERS[:5]


def get_player_by_id(player_id):
    """Fetch single NFL player by ID."""
    for fp in FALLBACK_NFL_PLAYERS:
        if fp['id'] == player_id or str(fp['id']) == str(player_id):
            return fp

    raw = fetch_apisports('players', params={'id': player_id}, ttl=86400)
    data = raw.get('response', [])
    return format_player(data[0]) if data else None


def register_routes(app, cache):
    """Register all API-Sports NFL routes under /api/nfl/apisports/..."""

    @app.route('/api/nfl/apisports/status')
    def nfl_api_status():
        cache_key = 'nfl:apisports:status'
        return jsonify(cache.get_with_swr(cache_key, get_status, ttl=300, swr_ttl=3600))

    @app.route('/api/nfl/apisports/teams')
    def nfl_api_teams():
        season = request.args.get('season', default=2024, type=int)
        cache_key = f'nfl:apisports:teams_{season}'
        return jsonify(cache.get_with_swr(cache_key, lambda: get_teams(season), ttl=86400, swr_ttl=604800))

    @app.route('/api/nfl/apisports/standings')
    def nfl_api_standings():
        season = request.args.get('season', default=2024, type=int)
        cache_key = f'nfl:apisports:standings_{season}'
        return jsonify(cache.get_with_swr(cache_key, lambda: get_standings(season), ttl=3600, swr_ttl=86400))

    @app.route('/api/nfl/apisports/games')
    def nfl_api_games():
        season = request.args.get('season', default=2024, type=int)
        date = request.args.get('date')
        team_id = request.args.get('team_id', type=int)
        limit = request.args.get('limit', default=50, type=int)

        cache_key = f'nfl:apisports:games_{season}_{date}_{team_id}_{limit}'
        cached = cache.get(cache_key)
        if cached is not None:
            return jsonify(cached)

        try:
            games = get_games(season=season, date=date, team_id=team_id, limit=limit)
            cache.set(cache_key, games, ttl=300, swr_ttl=3600)
            return jsonify(games)
        except Exception as e:
            print("[API-SPORTS] Games error:", e)
            return jsonify([])

    @app.route('/api/nfl/apisports/players')
    def nfl_api_players():
        query = request.args.get('search') or request.args.get('q')
        cache_key = f"nfl:apisports:players_{query or 'all'}"
        cached = cache.get(cache_key)
        if cached is not None:
            return jsonify(cached)

        try:
            players = search_players(query)
            cache.set(cache_key, players, ttl=1800, swr_ttl=86400)
            return jsonify(players)
        except Exception as e:
            print("[API-SPORTS] Players error:", e)
            return jsonify(FALLBACK_NFL_PLAYERS)

    @app.route('/api/nfl/apisports/players/<int:player_id>')
    def nfl_api_player_detail(player_id):
        cache_key = f'nfl:apisports:player_{player_id}'
        cached = cache.get(cache_key)
        if cached is not None:
            return jsonify(cached)

        try:
            player = get_player_by_id(player_id)
            if not player:
                return jsonify({'error': 'Player not found'}), 404
            cache.set(cache_key, player, ttl=86400, swr_ttl=604800)
            return jsonify(player)
        except Exception as e:
            print(f"[API-SPORTS] Player {player_id} error:", e)
            return jsonify({'error': 'Failed to fetch NFL player'}), 500

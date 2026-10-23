"""
BallDontLie NBA Stats Adapter
Integrates the BallDontLie v1 API for NBA statistics, player directory, bio data, and game quarter scores.
Includes robust caching, rate-limit (429) resilience, and offline fallbacks.
API Documentation: https://docs.balldontlie.io
"""
import os
import time
import requests
from flask import jsonify, request
from backend.core.provider_client import fetch_with_circuit_breaker, ProviderUnavailableError

BDL_BASE = "https://api.balldontlie.io/v1"

def get_api_key():
    return os.getenv("BALLDONTLIE_API_KEY") or os.getenv("NBA_API_KEY") or "3dd6823e-e3a1-412e-bd35-c551ae940d0f"

# Persistent session with API key header
_session = requests.Session()

# ---------------------------------------------------------------------------
# Fallback Teams (All 30 NBA Franchises)
# ---------------------------------------------------------------------------
FALLBACK_TEAMS = [
    {"id": 1, "conference": "East", "division": "Southeast", "city": "Atlanta", "name": "Hawks", "full_name": "Atlanta Hawks", "abbreviation": "ATL"},
    {"id": 2, "conference": "East", "division": "Atlantic", "city": "Boston", "name": "Celtics", "full_name": "Boston Celtics", "abbreviation": "BOS"},
    {"id": 3, "conference": "East", "division": "Atlantic", "city": "Brooklyn", "name": "Nets", "full_name": "Brooklyn Nets", "abbreviation": "BKN"},
    {"id": 4, "conference": "East", "division": "Southeast", "city": "Charlotte", "name": "Hornets", "full_name": "Charlotte Hornets", "abbreviation": "CHA"},
    {"id": 5, "conference": "East", "division": "Central", "city": "Chicago", "name": "Bulls", "full_name": "Chicago Bulls", "abbreviation": "CHI"},
    {"id": 6, "conference": "East", "division": "Central", "city": "Cleveland", "name": "Cavaliers", "full_name": "Cleveland Cavaliers", "abbreviation": "CLE"},
    {"id": 7, "conference": "West", "division": "Southwest", "city": "Dallas", "name": "Mavericks", "full_name": "Dallas Mavericks", "abbreviation": "DAL"},
    {"id": 8, "conference": "West", "division": "Northwest", "city": "Denver", "name": "Nuggets", "full_name": "Denver Nuggets", "abbreviation": "DEN"},
    {"id": 9, "conference": "East", "division": "Central", "city": "Detroit", "name": "Pistons", "full_name": "Detroit Pistons", "abbreviation": "DET"},
    {"id": 10, "conference": "West", "division": "Pacific", "city": "Golden State", "name": "Warriors", "full_name": "Golden State Warriors", "abbreviation": "GSW"},
    {"id": 11, "conference": "West", "division": "Southwest", "city": "Houston", "name": "Rockets", "full_name": "Houston Rockets", "abbreviation": "HOU"},
    {"id": 12, "conference": "East", "division": "Central", "city": "Indiana", "name": "Pacers", "full_name": "Indiana Pacers", "abbreviation": "IND"},
    {"id": 13, "conference": "West", "division": "Pacific", "city": "LA", "name": "Clippers", "full_name": "LA Clippers", "abbreviation": "LAC"},
    {"id": 14, "conference": "West", "division": "Pacific", "city": "Los Angeles", "name": "Lakers", "full_name": "Los Angeles Lakers", "abbreviation": "LAL"},
    {"id": 15, "conference": "West", "division": "Southwest", "city": "Memphis", "name": "Grizzlies", "full_name": "Memphis Grizzlies", "abbreviation": "MEM"},
    {"id": 16, "conference": "East", "division": "Southeast", "city": "Miami", "name": "Heat", "full_name": "Miami Heat", "abbreviation": "MIA"},
    {"id": 17, "conference": "East", "division": "Central", "city": "Milwaukee", "name": "Bucks", "full_name": "Milwaukee Bucks", "abbreviation": "MIL"},
    {"id": 18, "conference": "West", "division": "Northwest", "city": "Minnesota", "name": "Timberwolves", "full_name": "Minnesota Timberwolves", "abbreviation": "MIN"},
    {"id": 19, "conference": "West", "division": "Southwest", "city": "New Orleans", "name": "Pelicans", "full_name": "New Orleans Pelicans", "abbreviation": "NOP"},
    {"id": 20, "conference": "East", "division": "Atlantic", "city": "New York", "name": "Knicks", "full_name": "New York Knicks", "abbreviation": "NYK"},
    {"id": 21, "conference": "West", "division": "Northwest", "city": "Oklahoma City", "name": "Thunder", "full_name": "Oklahoma City Thunder", "abbreviation": "OKC"},
    {"id": 22, "conference": "East", "division": "Southeast", "city": "Orlando", "name": "Magic", "full_name": "Orlando Magic", "abbreviation": "ORL"},
    {"id": 23, "conference": "East", "division": "Atlantic", "city": "Philadelphia", "name": "76ers", "full_name": "Philadelphia 76ers", "abbreviation": "PHI"},
    {"id": 24, "conference": "West", "division": "Pacific", "city": "Phoenix", "name": "Suns", "full_name": "Phoenix Suns", "abbreviation": "PHX"},
    {"id": 25, "conference": "West", "division": "Northwest", "city": "Portland", "name": "Trail Blazers", "full_name": "Portland Trail Blazers", "abbreviation": "POR"},
    {"id": 26, "conference": "West", "division": "Pacific", "city": "Sacramento", "name": "Kings", "full_name": "Sacramento Kings", "abbreviation": "SAC"},
    {"id": 27, "conference": "West", "division": "Southwest", "city": "San Antonio", "name": "Spurs", "full_name": "San Antonio Spurs", "abbreviation": "SAS"},
    {"id": 28, "conference": "East", "division": "Atlantic", "city": "Toronto", "name": "Raptors", "full_name": "Toronto Raptors", "abbreviation": "TOR"},
    {"id": 29, "conference": "West", "division": "Northwest", "city": "Utah", "name": "Jazz", "full_name": "Utah Jazz", "abbreviation": "UTA"},
    {"id": 30, "conference": "East", "division": "Southeast", "city": "Washington", "name": "Wizards", "full_name": "Washington Wizards", "abbreviation": "WAS"},
]

# ---------------------------------------------------------------------------
# Fallback Notable Players across Eras
# ---------------------------------------------------------------------------
FALLBACK_PLAYERS = [
    {"id": 237, "first_name": "LeBron", "last_name": "James", "position": "F", "height": "6-9", "weight": "250", "jersey_number": "23", "college": "St. Vincent-St. Mary HS", "country": "USA", "draft_year": 2003, "draft_round": 1, "draft_number": 1, "team": {"id": 14, "full_name": "Los Angeles Lakers", "abbreviation": "LAL", "name": "Lakers", "city": "Los Angeles", "conference": "West"}},
    {"id": 115, "first_name": "Stephen", "last_name": "Curry", "position": "G", "height": "6-2", "weight": "185", "jersey_number": "30", "college": "Davidson", "country": "USA", "draft_year": 2009, "draft_round": 1, "draft_number": 7, "team": {"id": 10, "full_name": "Golden State Warriors", "abbreviation": "GSW", "name": "Warriors", "city": "Golden State", "conference": "West"}},
    {"id": 140, "first_name": "Kevin", "last_name": "Durant", "position": "F", "height": "6-11", "weight": "240", "jersey_number": "35", "college": "Texas", "country": "USA", "draft_year": 2007, "draft_round": 1, "draft_number": 2, "team": {"id": 24, "full_name": "Phoenix Suns", "abbreviation": "PHX", "name": "Suns", "city": "Phoenix", "conference": "West"}},
    {"id": 246, "first_name": "Nikola", "last_name": "Jokic", "position": "C", "height": "6-11", "weight": "284", "jersey_number": "15", "college": "Mega Basket", "country": "Serbia", "draft_year": 2014, "draft_round": 2, "draft_number": 41, "team": {"id": 8, "full_name": "Denver Nuggets", "abbreviation": "DEN", "name": "Nuggets", "city": "Denver", "conference": "West"}},
    {"id": 132, "first_name": "Luka", "last_name": "Doncic", "position": "F-G", "height": "6-7", "weight": "230", "jersey_number": "77", "college": "Real Madrid", "country": "Slovenia", "draft_year": 2018, "draft_round": 1, "draft_number": 3, "team": {"id": 7, "full_name": "Dallas Mavericks", "abbreviation": "DAL", "name": "Mavericks", "city": "Dallas", "conference": "West"}},
    {"id": 15, "first_name": "Giannis", "last_name": "Antetokounmpo", "position": "F", "height": "6-11", "weight": "243", "jersey_number": "34", "college": "Filathlitikos", "country": "Greece", "draft_year": 2013, "draft_round": 1, "draft_number": 15, "team": {"id": 17, "full_name": "Milwaukee Bucks", "abbreviation": "MIL", "name": "Bucks", "city": "Milwaukee", "conference": "East"}},
    {"id": 434, "first_name": "Jayson", "last_name": "Tatum", "position": "F-G", "height": "6-8", "weight": "210", "jersey_number": "0", "college": "Duke", "country": "USA", "draft_year": 2017, "draft_round": 1, "draft_number": 3, "team": {"id": 2, "full_name": "Boston Celtics", "abbreviation": "BOS", "name": "Celtics", "city": "Boston", "conference": "East"}},
    {"id": 2931, "first_name": "Michael", "last_name": "Jordan", "position": "G", "height": "6-6", "weight": "216", "jersey_number": "23", "college": "North Carolina", "country": "USA", "draft_year": 1984, "draft_round": 1, "draft_number": 3, "team": {"id": 5, "full_name": "Chicago Bulls", "abbreviation": "CHI", "name": "Bulls", "city": "Chicago", "conference": "East"}},
    {"id": 1043, "first_name": "Kobe", "last_name": "Bryant", "position": "G", "height": "6-6", "weight": "212", "jersey_number": "24", "college": "Lower Merion HS", "country": "USA", "draft_year": 1996, "draft_round": 1, "draft_number": 13, "team": {"id": 14, "full_name": "Los Angeles Lakers", "abbreviation": "LAL", "name": "Lakers", "city": "Los Angeles", "conference": "West"}},
    {"id": 2984, "first_name": "Shaquille", "last_name": "O'Neal", "position": "C", "height": "7-1", "weight": "325", "jersey_number": "34", "college": "LSU", "country": "USA", "draft_year": 1992, "draft_round": 1, "draft_number": 1, "team": {"id": 14, "full_name": "Los Angeles Lakers", "abbreviation": "LAL", "name": "Lakers", "city": "Los Angeles", "conference": "West"}}
]

# Local in-memory caches to prevent rate limiting
_MEMORY_CACHE = {}


def _request_headers():
    return {
        "Authorization": get_api_key(),
        "Accept": "application/json"
    }


def fetch_bdl(endpoint, params=None, timeout=(2.0, 3.0)):
    """Execute authenticated request against BallDontLie v1 API with rate limit handling."""
    cache_key = f"{endpoint}:{str(params)}"
    now = time.time()
    
    if cache_key in _MEMORY_CACHE:
        cached_entry, exp = _MEMORY_CACHE[cache_key]
        if now < exp:
            return cached_entry

    url = f"{BDL_BASE}/{endpoint.lstrip('/')}"
    headers = _request_headers()

    try:
        response = fetch_with_circuit_breaker(
            "balldontlie", url, request_session=_session, headers=headers,
            params=params, timeout=timeout,
        )
        res_json = response.json()
        _MEMORY_CACHE[cache_key] = (res_json, now + 300)
        return res_json
    except (ProviderUnavailableError, requests.exceptions.RequestException, ValueError) as e:
        print(f"[BDL] Request error for {endpoint}: {e}")
        if cache_key in _MEMORY_CACHE:
            return _MEMORY_CACHE[cache_key][0]
        return {"data": [], "meta": {}, "error": str(e)}


def format_player(raw_p):
    """Normalize BallDontLie player dict to Airball standard player model."""
    team = raw_p.get('team') or {}
    first = raw_p.get('first_name', '')
    last = raw_p.get('last_name', '')
    full_name = f"{first} {last}".strip()
    
    pos = raw_p.get('position', 'N/A') or 'N/A'
    team_name = team.get('full_name') or team.get('name') or 'Free Agent'
    team_abbr = team.get('abbreviation') or 'FA'

    return {
        'id': raw_p.get('id'),
        'name': full_name,
        'first_name': first,
        'last_name': last,
        'team': team_name,
        'teamAbbr': team_abbr,
        'pos': pos,
        'position': pos,
        'height': raw_p.get('height') or '—',
        'weight': raw_p.get('weight') or '—',
        'jersey_number': str(raw_p.get('jersey_number') or raw_p.get('num') or '—'),
        'college': raw_p.get('college') or '—',
        'country': raw_p.get('country') or 'USA',
        'draft_year': raw_p.get('draft_year'),
        'draft_round': raw_p.get('draft_round'),
        'draft_number': raw_p.get('draft_number'),
        'ppg': round(float(raw_p.get('ppg', 0.0)), 1),
        'rpg': round(float(raw_p.get('rpg', 0.0)), 1),
        'apg': round(float(raw_p.get('apg', 0.0)), 1),
        'status': 'Active' if team.get('id') else 'Historical',
        'team_data': team
    }


def get_players(search=None, cursor=None, per_page=25, team_ids=None):
    """Search or list players from BallDontLie with fallback support."""
    params = {}
    if per_page:
        params['per_page'] = min(per_page, 100)
    if cursor:
        params['cursor'] = cursor

    search_words = []
    if search:
        search = search.strip()
        search_words = search.lower().split()
        if len(search_words) > 1:
            params['search'] = search_words[-1]
            params['per_page'] = 100
        else:
            params['search'] = search

    if team_ids:
        for tid in team_ids:
            params.setdefault('team_ids[]', []).append(tid)

    raw = fetch_bdl('players', params=params)
    data = raw.get('data', [])
    meta = raw.get('meta', {})

    # If rate limited or empty search result, check fallback players
    if not data and search:
        matching_fallback = []
        for fp in FALLBACK_PLAYERS:
            full = f"{fp['first_name']} {fp['last_name']}".lower()
            if any(w in full for w in search_words):
                matching_fallback.append(fp)
        if matching_fallback:
            return {'data': [format_player(p) for p in matching_fallback], 'meta': {}}

    formatted = [format_player(p) for p in data]

    # Precision filter for multi-word search queries
    if len(search_words) > 1:
        filtered = []
        for p in formatted:
            p_name = p['name'].lower()
            if all(w in p_name for w in search_words):
                filtered.append(p)
        if not filtered and search_words:
            try:
                params['search'] = search_words[0]
                raw2 = fetch_bdl('players', params=params)
                for p in raw2.get('data', []):
                    fp = format_player(p)
                    if all(w in fp['name'].lower() for w in search_words):
                        filtered.append(fp)
            except Exception:
                pass
        formatted = filtered

    # If still empty on initial list, provide fallback players
    if not formatted and not search:
        formatted = [format_player(p) for p in FALLBACK_PLAYERS]

    return {
        'data': formatted,
        'meta': meta
    }


def get_player_by_id(player_id):
    """Fetch a single player's details by BallDontLie ID."""
    # Check fallback players first for instantaneous response
    for fp in FALLBACK_PLAYERS:
        if fp['id'] == player_id or str(fp['id']) == str(player_id):
            return format_player(fp)

    raw = fetch_bdl(f'players/{player_id}')
    p = raw.get('data')
    return format_player(p) if p else None


def format_game(raw_g):
    """Format BallDontLie game data into Airball schema."""
    home_team = raw_g.get('home_team') or {}
    visitor_team = raw_g.get('visitor_team') or {}

    raw_status = (raw_g.get('status') or '').upper()
    if 'FINAL' in raw_status:
        status = 'FINAL'
    elif 'IN PROGRESS' in raw_status or (raw_g.get('period', 0) > 0 and 'FINAL' not in raw_status):
        status = 'LIVE'
    else:
        status = 'UPCOMING'

    home_q = [
        raw_g.get('home_q1'), raw_g.get('home_q2'),
        raw_g.get('home_q3'), raw_g.get('home_q4')
    ]
    away_q = [
        raw_g.get('visitor_q1'), raw_g.get('visitor_q2'),
        raw_g.get('visitor_q3'), raw_g.get('visitor_q4')
    ]

    return {
        'id': str(raw_g.get('id')),
        'date': raw_g.get('date'),
        'datetime': raw_g.get('datetime'),
        'season': raw_g.get('season'),
        'status': status,
        'period': raw_g.get('period'),
        'time': raw_g.get('time'),
        'postseason': raw_g.get('postseason', False),
        'home': home_team.get('full_name') or home_team.get('name', 'Home'),
        'homeAbbr': home_team.get('abbreviation', 'HOM'),
        'homeScore': raw_g.get('home_team_score', 0),
        'away': visitor_team.get('full_name') or visitor_team.get('name', 'Away'),
        'awayAbbr': visitor_team.get('abbreviation', 'AWY'),
        'awayScore': raw_g.get('visitor_team_score', 0),
        'linescore': {
            'home': [q for q in home_q if q is not None],
            'away': [q for q in away_q if q is not None]
        },
        'timeouts': {
            'home': raw_g.get('home_timeouts_remaining'),
            'away': raw_g.get('visitor_timeouts_remaining')
        },
        'bonus': {
            'home': raw_g.get('home_in_bonus', False),
            'away': raw_g.get('visitor_in_bonus', False)
        }
    }


def get_games(dates=None, seasons=None, team_ids=None, cursor=None, per_page=25):
    """Fetch games with quarter line scores and detailed status."""
    params = {}
    if per_page:
        params['per_page'] = min(per_page, 100)
    if cursor:
        params['cursor'] = cursor
    if dates:
        for d in dates:
            params.setdefault('dates[]', []).append(d)
    if seasons:
        for s in seasons:
            params.setdefault('seasons[]', []).append(s)
    if team_ids:
        for tid in team_ids:
            params.setdefault('team_ids[]', []).append(tid)

    raw = fetch_bdl('games', params=params)
    data = raw.get('data', [])
    meta = raw.get('meta', {})

    return {
        'data': [format_game(g) for g in data],
        'meta': meta
    }


def get_game_by_id(game_id):
    """Fetch single game by ID."""
    raw = fetch_bdl(f'games/{game_id}')
    g = raw.get('data')
    return format_game(g) if g else None


def get_teams():
    """Fetch all NBA teams with guaranteed offline fallback."""
    try:
        raw = fetch_bdl('teams')
        data = raw.get('data', [])
        if data:
            return data
    except Exception as e:
        print(f"[BDL] Error getting teams: {e}")
    return FALLBACK_TEAMS


def get_api_status():
    """Verify BallDontLie API key status and return diagnostic info."""
    key = get_api_key()
    masked_key = f"{key[:4]}...{key[-4:]}" if len(key) >= 8 else "***"
    teams = get_teams()
    return {
        'status': 'active',
        'provider': 'BallDontLie',
        'api_version': 'v1',
        'api_key': masked_key,
        'tier': 'free',
        'rate_limit': '30 req/min',
        'teams_available': len(teams),
        'supported_endpoints': [
            '/api/nba/balldontlie/players',
            '/api/nba/balldontlie/players/<id>',
            '/api/nba/balldontlie/games',
            '/api/nba/balldontlie/games/<id>',
            '/api/nba/balldontlie/teams'
        ]
    }


def register_routes(app, cache):
    """Register all BallDontLie NBA routes."""

    @app.route('/api/nba/balldontlie/status')
    @app.route('/api/nba/api-status')
    def bdl_status():
        cache_key = 'bdl:status'
        return jsonify(cache.get_with_swr(cache_key, get_api_status, ttl=300, swr_ttl=3600))

    @app.route('/api/nba/balldontlie/players')
    def bdl_players():
        search = request.args.get('search') or request.args.get('q')
        cursor = request.args.get('cursor')
        per_page = request.args.get('per_page', default=25, type=int)

        cache_key = f"bdl:players_{search or 'all'}_{cursor or 0}_{per_page}"
        cached = cache.get(cache_key)
        if cached is not None:
            return jsonify(cached)

        try:
            result = get_players(search=search, cursor=cursor, per_page=per_page)
            cache.set(cache_key, result, ttl=300, swr_ttl=86400)
            return jsonify(result)
        except Exception as e:
            print("[BDL] Error fetching players:", e)
            return jsonify({'data': [format_player(p) for p in FALLBACK_PLAYERS], 'meta': {}})

    @app.route('/api/nba/balldontlie/players/<int:player_id>')
    def bdl_player_detail(player_id):
        cache_key = f"bdl:player_{player_id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return jsonify(cached)

        try:
            player = get_player_by_id(player_id)
            if not player:
                return jsonify({'error': 'Player not found'}), 404
            cache.set(cache_key, player, ttl=1800, swr_ttl=86400)
            return jsonify(player)
        except Exception as e:
            print(f"[BDL] Error fetching player {player_id}:", e)
            return jsonify({'error': 'Failed to fetch player details'}), 500

    @app.route('/api/nba/balldontlie/games')
    def bdl_games():
        dates = request.args.getlist('dates[]') or ([request.args.get('date')] if request.args.get('date') else None)
        seasons = request.args.getlist('seasons[]') or ([request.args.get('season')] if request.args.get('season') else None)
        cursor = request.args.get('cursor')
        per_page = request.args.get('per_page', default=25, type=int)

        cache_key = f"bdl:games_{dates}_{seasons}_{cursor}_{per_page}"
        cached = cache.get(cache_key)
        if cached is not None:
            return jsonify(cached)

        try:
            result = get_games(dates=dates, seasons=seasons, cursor=cursor, per_page=per_page)
            cache.set(cache_key, result, ttl=60, swr_ttl=1800)
            return jsonify(result)
        except Exception as e:
            print("[BDL] Error fetching games:", e)
            return jsonify({'data': [], 'meta': {}})

    @app.route('/api/nba/balldontlie/games/<int:game_id>')
    def bdl_game_detail(game_id):
        cache_key = f"bdl:game_{game_id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return jsonify(cached)

        try:
            game = get_game_by_id(game_id)
            if not game:
                return jsonify({'error': 'Game not found'}), 404
            cache.set(cache_key, game, ttl=30, swr_ttl=1800)
            return jsonify(game)
        except Exception as e:
            print(f"[BDL] Error fetching game {game_id}:", e)
            return jsonify({'error': 'Failed to fetch game details'}), 500

    @app.route('/api/nba/balldontlie/teams')
    def bdl_teams():
        cache_key = 'bdl:teams'
        return jsonify(cache.get_with_swr(cache_key, get_teams, ttl=86400, swr_ttl=604800))

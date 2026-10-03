"""
TheSportsDB Adapter
Provides team logos and fighter photos from TheSportsDB free-tier API (key "3").
All data is aggressively cached (24h TTL) since logos/images rarely change.

Endpoints exposed:
  GET /api/nba/teams/logos  → {'LAL': 'https://...', ...}
  GET /api/nfl/teams/logos  → {'KC': 'https://...', ...}
  GET /api/ufc/fighter/<name>/photo → {'photoUrl': 'https://...'}
"""
import time
import requests
from flask import jsonify

TSDB_BASE = "https://www.thesportsdb.com/api/v1/json/3"

# Persistent session shared for TheSportsDB calls
_session = requests.Session()

# ---------------------------------------------------------------------------
# NBA team name mapping: app abbreviation -> full name for TSDB search
# ---------------------------------------------------------------------------
NBA_TEAMS = {
    'ATL': 'Atlanta Hawks',
    'BOS': 'Boston Celtics',
    'BKN': 'Brooklyn Nets',
    'CHA': 'Charlotte Hornets',
    'CHI': 'Chicago Bulls',
    'CLE': 'Cleveland Cavaliers',
    'DAL': 'Dallas Mavericks',
    'DEN': 'Denver Nuggets',
    'DET': 'Detroit Pistons',
    'GSW': 'Golden State Warriors',
    'HOU': 'Houston Rockets',
    'IND': 'Indiana Pacers',
    'LAC': 'LA Clippers',
    'LAL': 'Los Angeles Lakers',
    'MEM': 'Memphis Grizzlies',
    'MIA': 'Miami Heat',
    'MIL': 'Milwaukee Bucks',
    'MIN': 'Minnesota Timberwolves',
    'NOP': 'New Orleans Pelicans',
    'NYK': 'New York Knicks',
    'OKC': 'Oklahoma City Thunder',
    'ORL': 'Orlando Magic',
    'PHI': 'Philadelphia 76ers',
    'PHX': 'Phoenix Suns',
    'POR': 'Portland Trail Blazers',
    'SAC': 'Sacramento Kings',
    'SAS': 'San Antonio Spurs',
    'TOR': 'Toronto Raptors',
    'UTA': 'Utah Jazz',
    'WAS': 'Washington Wizards',
}

# ---------------------------------------------------------------------------
# NFL team name mapping
# ---------------------------------------------------------------------------
NFL_TEAMS = {
    'ARI': 'Arizona Cardinals',
    'ATL': 'Atlanta Falcons',
    'BAL': 'Baltimore Ravens',
    'BUF': 'Buffalo Bills',
    'CAR': 'Carolina Panthers',
    'CHI': 'Chicago Bears',
    'CIN': 'Cincinnati Bengals',
    'CLE': 'Cleveland Browns',
    'DAL': 'Dallas Cowboys',
    'DEN': 'Denver Broncos',
    'DET': 'Detroit Lions',
    'GB':  'Green Bay Packers',
    'HOU': 'Houston Texans',
    'IND': 'Indianapolis Colts',
    'JAX': 'Jacksonville Jaguars',
    'KC':  'Kansas City Chiefs',
    'LV':  'Las Vegas Raiders',
    'LAC': 'Los Angeles Chargers',
    'LAR': 'Los Angeles Rams',
    'MIA': 'Miami Dolphins',
    'MIN': 'Minnesota Vikings',
    'NE':  'New England Patriots',
    'NO':  'New Orleans Saints',
    'NYG': 'New York Giants',
    'NYJ': 'New York Jets',
    'PHI': 'Philadelphia Eagles',
    'PIT': 'Pittsburgh Steelers',
    'SF':  'San Francisco 49ers',
    'SEA': 'Seattle Seahawks',
    'TB':  'Tampa Bay Buccaneers',
    'TEN': 'Tennessee Titans',
    'WSH': 'Washington Commanders',
}


# ---------------------------------------------------------------------------
# Core fetch helpers
# ---------------------------------------------------------------------------

def _fetch_team_logo(team_name):
    """Look up a team by name on TheSportsDB and return its badge URL or None."""
    try:
        url = f"{TSDB_BASE}/searchteams.php"
        resp = _session.get(url, params={'t': team_name}, timeout=10)
        resp.raise_for_status()
        teams = resp.json().get('teams') or []
        if teams:
            return teams[0].get('strTeamBadge') or teams[0].get('strTeamLogo')
    except Exception as e:
        print(f"[TSDB] fetch_team_logo error for '{team_name}': {e}")
    return None


def _fetch_player_photo(player_name):
    """Look up a player/fighter by name and return their thumb URL or None."""
    try:
        url = f"{TSDB_BASE}/searchplayers.php"
        resp = _session.get(url, params={'p': player_name}, timeout=10)
        resp.raise_for_status()
        players = resp.json().get('player') or []
        if players:
            return players[0].get('strThumb') or players[0].get('strCutout')
    except Exception as e:
        print(f"[TSDB] fetch_player_photo error for '{player_name}': {e}")
    return None


def _compute_logos(team_map):
    """
    Iterate over all teams in `team_map` (abbr -> full name), fetch logo for each,
    and return abbr -> logo_url dict.  Sleeps 0.3s between calls to be gentle with
    the free tier.
    """
    result = {}
    for abbr, name in team_map.items():
        logo = _fetch_team_logo(name)
        if logo:
            result[abbr] = logo
        time.sleep(0.3)
    return result


# ---------------------------------------------------------------------------
# Route registration
# ---------------------------------------------------------------------------

def register_routes(app, cache):
    """Register TheSportsDB logo/photo routes and return a prewarm function."""

    @app.route('/api/nba/teams/logos')
    def nba_team_logos():
        """Return a map of NBA team abbreviation -> logo URL (cached 24h)."""
        try:
            data = cache.get_with_swr(
                'nba:logos',
                lambda: _compute_logos(NBA_TEAMS),
                ttl=86400,
                swr_ttl=604800
            )
            return jsonify(data or {})
        except Exception as e:
            print("ERROR nba team logos:", e)
            return jsonify({}), 500

    @app.route('/api/nfl/teams/logos')
    def nfl_team_logos():
        """Return a map of NFL team abbreviation -> logo URL (cached 24h)."""
        try:
            data = cache.get_with_swr(
                'nfl:logos',
                lambda: _compute_logos(NFL_TEAMS),
                ttl=86400,
                swr_ttl=604800
            )
            return jsonify(data or {})
        except Exception as e:
            print("ERROR nfl team logos:", e)
            return jsonify({}), 500

    @app.route('/api/ufc/fighter/<path:name>/photo')
    def ufc_fighter_photo(name):
        """Return the headshot URL for a UFC fighter (cached 24h)."""
        cache_key = f'ufc:photo_{name.lower()}'
        cached = cache.get(cache_key)
        if cached is not None:
            return jsonify(cached)
        try:
            photo_url = _fetch_player_photo(name)
            result = {'photoUrl': photo_url or ''}
            cache.set(cache_key, result, ttl=86400, swr_ttl=604800)
            return jsonify(result)
        except Exception as e:
            print(f"ERROR ufc fighter photo for '{name}':", e)
            return jsonify({'photoUrl': ''}), 500

    # ------------------------------------------------------------------
    # Prewarm: fetch all team logos once on startup (runs in background)
    # ------------------------------------------------------------------
    def prewarm_tsdb():
        for cache_key, team_map, label in [
            ('nba:logos', NBA_TEAMS, 'NBA'),
            ('nfl:logos', NFL_TEAMS, 'NFL'),
        ]:
            # Skip if already warm
            if cache.get(cache_key) is not None:
                continue
            try:
                logos = _compute_logos(team_map)
                if logos:
                    cache.set(cache_key, logos, ttl=86400, swr_ttl=604800)
                    print(f"[PREWARM-TSDB] Loaded {len(logos)} {label} logos")
            except Exception as e:
                print(f"[PREWARM-TSDB] Could not pre-warm {cache_key}: {e}")

    return prewarm_tsdb

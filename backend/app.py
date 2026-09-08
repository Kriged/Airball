import time
import threading
import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

app = Flask(__name__)
CORS(app)

# Persistent HTTP session with connection pooling for low-latency calls to ESPN APIs
session = requests.Session()
retry_strategy = Retry(
    total=2,
    backoff_factor=0.3,
    status_forcelist=[500, 502, 503, 504],
    raise_on_status=False
)
adapter = HTTPAdapter(
    pool_connections=20,
    pool_maxsize=40,
    max_retries=retry_strategy
)
session.mount('https://', adapter)
session.mount('http://', adapter)


class Cache:
    """
    In-memory cache supporting Stale-While-Revalidate (SWR).
    Serves cached data instantly (<1ms). If stale, returns stale data immediately
    and triggers a non-blocking background thread to refresh from ESPN.
    """
    def __init__(self):
        self.store = {}
        self.lock = threading.Lock()
        self.refreshing = set()

    def get(self, key):
        with self.lock:
            if key in self.store:
                entry = self.store[key]
                if time.time() < entry['hard_expiry']:
                    return entry['value']
                else:
                    del self.store[key]
        return None

    def set(self, key, value, ttl=60, swr_ttl=3600):
        with self.lock:
            now = time.time()
            self.store[key] = {
                'value': value,
                'soft_expiry': now + ttl,
                'hard_expiry': now + max(ttl, swr_ttl)
            }

    def get_with_swr(self, key, compute_fn, ttl=60, swr_ttl=3600):
        with self.lock:
            entry = self.store.get(key)
            now = time.time()
            if entry:
                if now < entry['soft_expiry']:
                    return entry['value']
                elif now < entry['hard_expiry']:
                    # Data is past soft TTL but within hard TTL: return immediately and refresh in background
                    if key not in self.refreshing:
                        self.refreshing.add(key)
                        def bg_refresh():
                            try:
                                val = compute_fn()
                                if val is not None:
                                    self.set(key, val, ttl=ttl, swr_ttl=swr_ttl)
                            except Exception as e:
                                print(f"[CACHE] Background refresh error for {key}: {e}")
                            finally:
                                with self.lock:
                                    self.refreshing.discard(key)
                        threading.Thread(target=bg_refresh, daemon=True).start()
                    return entry['value']

        # Cache miss or hard expiry: compute synchronously
        val = compute_fn()
        if val is not None:
            self.set(key, val, ttl=ttl, swr_ttl=swr_ttl)
        return val


cache = Cache()

# Lookup table for team abbreviations to hex colors
TEAM_COLORS = {
    'LAL': '#fdb927', 'BOS': '#007a33', 'GSW': '#1d428a', 'PHX': '#e56020',
    'MIL': '#00471b', 'MIA': '#98002e', 'DEN': '#0e2240', 'DAL': '#0053bc',
    'CHI': '#ce1141', 'CLE': '#860038', 'NYK': '#f58426', 'PHI': '#006bb6',
    'OKC': '#007ac1', 'MIN': '#0c2340', 'LAC': '#c8102e', 'NOP': '#0c2340',
    'IND': '#fdbb30', 'ORL': '#0077c0', 'SAC': '#5a2d81', 'MEM': '#5d76a9',
    'HOU': '#ce1141', 'SAS': '#000000', 'BKN': '#000000', 'CHA': '#00788c',
    'DET': '#c8102e', 'POR': '#e03a3e', 'UTA': '#002b5c', 'WAS': '#002b5c',
    'ATL': '#e31837', 'TOR': '#ce1141'
}

# Bidirectional abbreviation mapping: App abbreviation → ESPN abbreviation
# ESPN uses different abbreviations for some teams in standings/schedule data
APP_TO_ESPN_ABBR = {
    'NYK': 'NY', 'WAS': 'WSH', 'SAS': 'SA',
    'GSW': 'GS', 'UTA': 'UTAH', 'NOP': 'NO'
}

# Reverse map: ESPN abbreviation → App abbreviation
ESPN_TO_APP_ABBR = {v: k for k, v in APP_TO_ESPN_ABBR.items()}


def normalize_abbr_to_app(espn_abbr):
    """Convert an ESPN abbreviation to the app's standard abbreviation."""
    return ESPN_TO_APP_ABBR.get(espn_abbr, espn_abbr)


def normalize_abbr_to_espn(app_abbr):
    """Convert an app abbreviation to the ESPN abbreviation."""
    return APP_TO_ESPN_ABBR.get(app_abbr, app_abbr)


# ESPN team ID lookup
TEAM_IDS = {
    'ATL': '1', 'BOS': '2', 'BKN': '17', 'CHA': '30', 'CHI': '4',
    'CLE': '5', 'DAL': '6', 'DEN': '7', 'DET': '8', 'GSW': '9',
    'HOU': '10', 'IND': '11', 'LAC': '12', 'LAL': '13', 'MEM': '29',
    'MIA': '14', 'MIL': '15', 'MIN': '16', 'NOP': '3', 'NYK': '18',
    'OKC': '25', 'ORL': '19', 'PHI': '20', 'PHX': '21', 'POR': '22',
    'SAC': '23', 'SAS': '24', 'TOR': '28', 'UTA': '26', 'WAS': '27',
}

TEAM_FULL_NAMES = {
    'ATL': 'Atlanta Hawks', 'BOS': 'Boston Celtics', 'BKN': 'Brooklyn Nets',
    'CHA': 'Charlotte Hornets', 'CHI': 'Chicago Bulls', 'CLE': 'Cleveland Cavaliers',
    'DAL': 'Dallas Mavericks', 'DEN': 'Denver Nuggets', 'DET': 'Detroit Pistons',
    'GSW': 'Golden State Warriors', 'HOU': 'Houston Rockets', 'IND': 'Indiana Pacers',
    'LAC': 'LA Clippers', 'LAL': 'Los Angeles Lakers', 'MEM': 'Memphis Grizzlies',
    'MIA': 'Miami Heat', 'MIL': 'Milwaukee Bucks', 'MIN': 'Minnesota Timberwolves',
    'NOP': 'New Orleans Pelicans', 'NYK': 'New York Knicks', 'OKC': 'Oklahoma City Thunder',
    'ORL': 'Orlando Magic', 'PHI': 'Philadelphia 76ers', 'PHX': 'Phoenix Suns',
    'POR': 'Portland Trail Blazers', 'SAC': 'Sacramento Kings', 'SAS': 'San Antonio Spurs',
    'TOR': 'Toronto Raptors', 'UTA': 'Utah Jazz', 'WAS': 'Washington Wizards',
}


def extract_stats_from_competitors(competitors):
    """
    Extract real team statistics directly from the scoreboard competitors list.
    Eliminates the N+1 summary API calls on every scoreboard request.
    """
    stats = {
        'fgPct': {'home': 0.0, 'away': 0.0},
        'fg3Pct': {'home': 0.0, 'away': 0.0},
        'rebounds': {'home': 0, 'away': 0},
        'assists': {'home': 0, 'away': 0},
        'turnovers': {'home': 0, 'away': 0}
    }
    has_any = False
    for c in competitors:
        ha = c.get('homeAway', 'home')
        team_stats = {s['name']: s.get('displayValue', '0') for s in c.get('statistics', [])}
        if team_stats:
            has_any = True
            try:
                stats['fgPct'][ha] = float(team_stats.get('fieldGoalPct', '0'))
            except (ValueError, TypeError):
                pass
            try:
                stats['fg3Pct'][ha] = float(team_stats.get('threePointFieldGoalPct', team_stats.get('threePointPct', '0')))
            except (ValueError, TypeError):
                pass
            try:
                stats['rebounds'][ha] = int(float(team_stats.get('rebounds', team_stats.get('totalRebounds', '0'))))
            except (ValueError, TypeError):
                pass
            try:
                stats['assists'][ha] = int(float(team_stats.get('assists', '0')))
            except (ValueError, TypeError):
                pass
            try:
                stats['turnovers'][ha] = int(float(team_stats.get('turnovers', '0')))
            except (ValueError, TypeError):
                pass
    return stats if has_any else None


def fetch_game_stats(game_id):
    """Fetch real team statistics from ESPN summary API for a game (cached)."""
    cache_key = f'game_stats_{game_id}'
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event={game_id}"
        d = session.get(url, timeout=8).json()

        boxscore = d.get('boxscore', {})
        teams_data = boxscore.get('teams', [])

        stats = {
            'fgPct': {'home': 0.0, 'away': 0.0},
            'fg3Pct': {'home': 0.0, 'away': 0.0},
            'rebounds': {'home': 0, 'away': 0},
            'assists': {'home': 0, 'away': 0},
            'turnovers': {'home': 0, 'away': 0}
        }

        for team_data in teams_data:
            ha = team_data.get('homeAway', 'home')
            team_stats = {s['name']: s.get('displayValue', '0') for s in team_data.get('statistics', [])}
            try:
                stats['fgPct'][ha] = float(team_stats.get('fieldGoalPct', '0'))
            except (ValueError, TypeError):
                pass
            try:
                stats['fg3Pct'][ha] = float(team_stats.get('threePointFieldGoalPct', '0'))
            except (ValueError, TypeError):
                pass
            try:
                stats['rebounds'][ha] = int(float(team_stats.get('totalRebounds', '0')))
            except (ValueError, TypeError):
                pass
            try:
                stats['assists'][ha] = int(float(team_stats.get('assists', '0')))
            except (ValueError, TypeError):
                pass
            try:
                stats['turnovers'][ha] = int(float(team_stats.get('turnovers', '0')))
            except (ValueError, TypeError):
                pass

        cache.set(cache_key, stats, ttl=30, swr_ttl=3600)
        return stats
    except Exception as e:
        print(f"WARN: Could not fetch stats for game {game_id}: {e}")
        return None


# BUG-034: Health check endpoint
@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat()
    })


def compute_today_games():
    """Fetch and map today's games without N+1 HTTP calls."""
    url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard"
    d = session.get(url, timeout=10).json()

    mapped_games = []
    for ev in d.get('events', []):
        comp = ev['competitions'][0]
        home_team = next(c for c in comp['competitors'] if c['homeAway'] == 'home')
        away_team = next(c for c in comp['competitors'] if c['homeAway'] == 'away')

        # BUG-017: Consistent uppercase status
        status = 'UPCOMING'
        if ev['status']['type']['state'] == 'in':
            status = 'LIVE'
        elif ev['status']['type']['completed']:
            status = 'FINAL'

        quarter = ev['status']['type']['detail']
        time_val = ev['status']['displayClock'] if status == 'LIVE' else ('00:00' if status == 'FINAL' else 'Upcoming')

        home_abbr = home_team['team']['abbreviation']
        away_abbr = away_team['team']['abbreviation']

        game_id = ev['id']

        # Extract real stats directly from competitor statistics in scoreboard JSON (NO N+1 calls!)
        game_stats = extract_stats_from_competitors(comp.get('competitors', []))
        if not game_stats:
            game_stats = {
                'fgPct': {'home': 0.0, 'away': 0.0},
                'fg3Pct': {'home': 0.0, 'away': 0.0},
                'rebounds': {'home': 0, 'away': 0},
                'assists': {'home': 0, 'away': 0},
                'turnovers': {'home': 0, 'away': 0}
            }

        mapped_game = {
            'id': game_id,
            'home': home_team['team']['name'],
            'away': away_team['team']['name'],
            'homeAbbr': normalize_abbr_to_app(home_abbr),
            'awayAbbr': normalize_abbr_to_app(away_abbr),
            'homeScore': int(home_team['score']) if home_team['score'] else 0,
            'awayScore': int(away_team['score']) if away_team['score'] else 0,
            'homeColor': TEAM_COLORS.get(normalize_abbr_to_app(home_abbr), '#f58426'),
            'awayColor': TEAM_COLORS.get(normalize_abbr_to_app(away_abbr), '#1d428a'),
            'quarter': quarter,
            'time': time_val,
            'status': status,
            'arena': comp.get('venue', {}).get('fullName', 'NBA Arena'),
            'stats': game_stats,
            'playByPlay': [],
            'boxScore': {'home': [], 'away': []}
        }
        mapped_games.append(mapped_game)

    return mapped_games


@app.route('/api/games/today')
def get_today_games():
    try:
        data = cache.get_with_swr('today_games', compute_today_games, ttl=20, swr_ttl=300)
        return jsonify(data)
    except Exception as e:
        print("ERROR get today games:", e)
        # BUG-013: Return error object instead of empty array on 500
        return jsonify({'error': 'Failed to fetch games', 'games': []}), 500


@app.route('/api/games/<game_id>')
def get_single_game(game_id):
    """Targeted endpoint for single-game details without downloading full league schedule."""
    cache_key = f'game_detail_{game_id}'
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)

    try:
        url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event={game_id}"
        d = session.get(url, timeout=10).json()
        header = d.get('header', {})
        comps = header.get('competitions', [{}])[0]
        competitors = comps.get('competitors', [])
        home = next((c for c in competitors if c.get('homeAway') == 'home'), competitors[0] if competitors else {})
        away = next((c for c in competitors if c.get('homeAway') == 'away'), competitors[1] if len(competitors) > 1 else {})

        status_type = comps.get('status', {}).get('type', {})
        status = 'UPCOMING'
        if status_type.get('completed'):
            status = 'FINAL'
        elif status_type.get('state') == 'in':
            status = 'LIVE'

        home_team = home.get('team', {})
        away_team = away.get('team', {})
        home_abbr = normalize_abbr_to_app(home_team.get('abbreviation', ''))
        away_abbr = normalize_abbr_to_app(away_team.get('abbreviation', ''))

        game_data = {
            'id': str(game_id),
            'date': comps.get('date', '').split('T')[0],
            'home': home_team.get('displayName', home_team.get('name', 'Home')),
            'away': away_team.get('displayName', away_team.get('name', 'Away')),
            'homeAbbr': home_abbr,
            'awayAbbr': away_abbr,
            'homeScore': int(home.get('score', 0)) if home.get('score') else 0,
            'awayScore': int(away.get('score', 0)) if away.get('score') else 0,
            'status': status,
            'quarter': status_type.get('detail', ''),
            'time': comps.get('status', {}).get('displayClock', '00:00'),
            'arena': comps.get('venue', {}).get('fullName', 'NBA Arena')
        }
        cache.set(cache_key, game_data, ttl=15 if status == 'LIVE' else 3600, swr_ttl=86400)
        return jsonify(game_data)
    except Exception as e:
        print(f"ERROR get_single_game {game_id}:", e)
        return jsonify({'error': 'Game not found'}), 404


@app.route('/api/games/<game_id>/playbyplay')
def get_playbyplay(game_id):
    cache_key = f'pbp_{game_id}'
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)

    try:
        url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event={game_id}"
        d = session.get(url, timeout=10).json()
        plays = d.get('plays', [])

        mapped_actions = []
        for play in plays[::-1]:
            score_val = f"{play.get('awayScore', 0)}-{play.get('homeScore', 0)}"
            time_val = play.get('clock', {}).get('displayValue', '00:00')
            text = play.get('text', '')

            mapped_actions.append({
                'time': time_val,
                'text': text,
                'score': score_val
            })
            if len(mapped_actions) >= 30:
                break

        cache.set(cache_key, mapped_actions, ttl=15, swr_ttl=600)
        return jsonify(mapped_actions)
    except Exception as e:
        print("ERROR playbyplay:", e)
        return jsonify([])


@app.route('/api/games/<game_id>/boxscore')
def get_boxscore(game_id):
    cache_key = f'box_{game_id}'
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)

    try:
        url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event={game_id}"
        d = session.get(url, timeout=10).json()

        # Get team ID to homeAway mapping
        team_side_map = {}
        comps = d.get('header', {}).get('competitions', [{}])[0].get('competitors', [])
        for c in comps:
            team_side_map[c.get('team', {}).get('id')] = c.get('homeAway')

        boxscore_data = d.get('boxscore', {}).get('players', [])
        result = {'home': [], 'away': []}

        for team_box in boxscore_data:
            t_id = team_box.get('team', {}).get('id')
            # BUG-024: Smarter fallback — use 'away' if 'home' is already taken
            team_side = team_side_map.get(t_id)
            if team_side is None:
                used_sides = [team_side_map.get(tid) for tid in team_side_map if team_side_map.get(tid)]
                team_side = 'away' if 'home' in used_sides else 'home'

            stats_keys = team_box['statistics'][0]['names']
            athletes = team_box['statistics'][0]['athletes']

            min_idx = stats_keys.index('MIN') if 'MIN' in stats_keys else -1
            pts_idx = stats_keys.index('PTS') if 'PTS' in stats_keys else -1
            reb_idx = stats_keys.index('REB') if 'REB' in stats_keys else -1
            ast_idx = stats_keys.index('AST') if 'AST' in stats_keys else -1
            fg_idx = stats_keys.index('FG') if 'FG' in stats_keys else -1

            mapped = []
            for ath in athletes:
                if ath.get('didNotPlay'):
                    continue
                stats_arr = ath.get('stats', [])
                if not stats_arr:
                    continue

                fg_val = stats_arr[fg_idx] if fg_idx != -1 else '0-0'

                # BUG-023: Safe FG parsing — handle malformed strings
                try:
                    if '-' in str(fg_val):
                        parts = str(fg_val).split('-')
                        fgm = int(parts[0])
                        fga = int(parts[1])
                    else:
                        fgm = 0
                        fga = 0
                except (ValueError, IndexError):
                    fgm = 0
                    fga = 0

                mapped.append({
                    'name': ath['athlete']['displayName'],
                    'min': stats_arr[min_idx] if min_idx != -1 else '0',
                    'pts': int(stats_arr[pts_idx]) if pts_idx != -1 else 0,
                    'reb': int(stats_arr[reb_idx]) if reb_idx != -1 else 0,
                    'ast': int(stats_arr[ast_idx]) if ast_idx != -1 else 0,
                    'fgm': fgm,
                    'fga': fga
                })
            result[team_side] = mapped

        cache.set(cache_key, result, ttl=20, swr_ttl=1200)
        return jsonify(result)
    except Exception as e:
        print("ERROR boxscore:", e)
        return jsonify({'home': [], 'away': []})


def compute_standings():
    d = session.get('https://site.api.espn.com/apis/v2/sports/basketball/nba/standings', timeout=10).json()
    standings = {'Eastern': [], 'Western': []}

    for conf in d.get('children', []):
        c_name = 'Eastern' if 'Eastern' in conf['name'] else 'Western'
        for tm in conf['standings']['entries']:
            stats = {s['name']: s['displayValue'] for s in tm['stats']}

            rank = 0
            for s in tm['stats']:
                if s.get('type') == 'playoffseed':
                    rank = int(s.get('value', 0))
                    break

            l10 = next((s['displayValue'] for s in tm['stats'] if s.get('id') == '901'), '0-0')

            # BUG-001: Normalize ESPN abbreviation to app abbreviation
            espn_abbr = tm['team']['abbreviation']
            app_abbr = normalize_abbr_to_app(espn_abbr)

            standings[c_name].append({
                'rank': rank,
                'team': tm['team']['displayName'],
                'abbr': app_abbr,
                'wins': int(stats.get('wins', 0)),
                'losses': int(stats.get('losses', 0)),
                'pct': stats.get('winPercent', '.000'),
                'gb': stats.get('gamesBehind', '-'),
                'streak': stats.get('streak', '-'),
                'last10': l10
            })

    standings['Eastern'].sort(key=lambda x: x['rank'])
    standings['Western'].sort(key=lambda x: x['rank'])
    return standings


@app.route('/api/standings')
def get_standings():
    try:
        data = cache.get_with_swr('standings', compute_standings, ttl=300, swr_ttl=3600)
        return jsonify(data)
    except Exception as e:
        print("ERROR standings:", e)
        return jsonify({'Eastern': [], 'Western': []})


def compute_players():
    url = 'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete?region=us&lang=en&contentorigin=espn&isqualified=true&page=1&limit=100&sort=offensive.avgPoints%3Adesc'
    d = session.get(url, timeout=10).json()

    global_cats = {c['name']: c['names'] for c in d.get('categories', [])}

    result_players = []
    for p in d.get('athletes', []):
        ath = p['athlete']

        stats_dict = {}
        for cat_data in p.get('categories', []):
            cat_name = cat_data['name']
            names = global_cats.get(cat_name, [])
            values = cat_data.get('values', [])
            for i in range(min(len(names), len(values))):
                stats_dict[names[i]] = float(values[i])

        result_players.append({
            'id': ath['id'],
            'name': ath['displayName'],
            'team': ath['teamShortName'],
            'pos': ath.get('position', {}).get('abbreviation', 'N/A'),
            'ppg': round(stats_dict.get('avgPoints', 0), 1),
            'rpg': round(stats_dict.get('avgRebounds', 0), 1),
            'apg': round(stats_dict.get('avgAssists', 0), 1),
            'status': 'Active'
        })
    return result_players


@app.route('/api/players')
def get_players():
    try:
        data = cache.get_with_swr('players', compute_players, ttl=1800, swr_ttl=86400)
        return jsonify(data)
    except Exception as e:
        print("ERROR players:", e)
        return jsonify([])


def compute_stats_leaders():
    url = 'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete?region=us&lang=en&contentorigin=espn&isqualified=true&page=1&limit=100&sort=offensive.avgPoints%3Adesc'
    d = session.get(url, timeout=10).json()

    global_cats = {c['name']: c['names'] for c in d.get('categories', [])}

    all_players = []
    for p in d.get('athletes', []):
        ath = p['athlete']
        stats_dict = {}
        for cat_data in p.get('categories', []):
            cat_name = cat_data['name']
            names = global_cats.get(cat_name, [])
            values = cat_data.get('values', [])
            for i in range(min(len(names), len(values))):
                stats_dict[names[i]] = float(values[i])

        all_players.append({
            'name': ath['displayName'],
            'team': ath['teamShortName'],
            'Points': stats_dict.get('avgPoints', 0),
            'Rebounds': stats_dict.get('avgRebounds', 0),
            'Assists': stats_dict.get('avgAssists', 0),
            'Steals': stats_dict.get('avgSteals', 0),
            'Blocks': stats_dict.get('avgBlocks', 0)
        })

    def get_top(stat_key):
        sorted_p = sorted(all_players, key=lambda x: x[stat_key], reverse=True)[:8]
        return [{'rank': i+1, 'name': p['name'], 'team': p['team'], 'value': round(p[stat_key], 1)} for i, p in enumerate(sorted_p)]

    return {
        'Points': get_top('Points'),
        'Rebounds': get_top('Rebounds'),
        'Assists': get_top('Assists'),
        'Steals': get_top('Steals'),
        'Blocks': get_top('Blocks')
    }


@app.route('/api/stats/leaders')
def get_stats_leaders():
    try:
        data = cache.get_with_swr('stats_leaders', compute_stats_leaders, ttl=1800, swr_ttl=86400)
        return jsonify(data)
    except Exception as e:
        print("ERROR stats leaders:", e)
        return jsonify({'Points': [], 'Rebounds': [], 'Assists': [], 'Steals': [], 'Blocks': []})


# BUG-029: Updated season data with actual results
@app.route('/api/seasons')
def get_seasons():
    seasons = [
        {'year': '2025-26', 'champion': 'TBD', 'mvp': 'TBD', 'status': 'In Progress', 'games': 1230, 'teams': 30},
        {'year': '2024-25', 'champion': 'Oklahoma City Thunder', 'mvp': 'Nikola Jokić', 'status': 'Completed', 'games': 1230, 'teams': 30},
        {'year': '2023-24', 'champion': 'Boston Celtics', 'mvp': 'Nikola Jokić', 'status': 'Completed', 'games': 1230, 'teams': 30},
        {'year': '2022-23', 'champion': 'Denver Nuggets', 'mvp': 'Joel Embiid', 'status': 'Completed', 'games': 1230, 'teams': 30},
        {'year': '2021-22', 'champion': 'Golden State Warriors', 'mvp': 'Nikola Jokić', 'status': 'Completed', 'games': 1230, 'teams': 30},
        {'year': '2020-21', 'champion': 'Milwaukee Bucks', 'mvp': 'Nikola Jokić', 'status': 'Completed', 'games': 1080, 'teams': 30},
        {'year': '2019-20', 'champion': 'Los Angeles Lakers', 'mvp': 'Giannis Antetokounmpo', 'status': 'Completed', 'games': 971, 'teams': 30},
        {'year': '2018-19', 'champion': 'Toronto Raptors', 'mvp': 'Giannis Antetokounmpo', 'status': 'Completed', 'games': 1230, 'teams': 30},
        {'year': '2017-18', 'champion': 'Golden State Warriors', 'mvp': 'James Harden', 'status': 'Completed', 'games': 1230, 'teams': 30},
        {'year': '2016-17', 'champion': 'Golden State Warriors', 'mvp': 'Russell Westbrook', 'status': 'Completed', 'games': 1230, 'teams': 30},
        {'year': '2015-16', 'champion': 'Cleveland Cavaliers', 'mvp': 'Stephen Curry', 'status': 'Completed', 'games': 1230, 'teams': 30},
    ]
    return jsonify(seasons)


def compute_games_list():
    end_date = datetime.datetime.now()
    start_date = end_date - datetime.timedelta(days=15)
    dates_str = f"{start_date.strftime('%Y%m%d')}-{end_date.strftime('%Y%m%d')}"

    url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates={dates_str}"
    d = session.get(url, timeout=10).json()

    events = d.get('events', [])
    # Fallback to default scoreboard if 15-day range has 0 games (e.g. offseason or preseason)
    if not events:
        fallback_url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard"
        fb_d = session.get(fallback_url, timeout=10).json()
        events = fb_d.get('events', [])

    games = []
    for ev in events:
        comp = ev['competitions'][0]
        home = next((c for c in comp['competitors'] if c['homeAway'] == 'home'), None)
        away = next((c for c in comp['competitors'] if c['homeAway'] == 'away'), None)
        if not home or not away:
            continue

        # BUG-007 + BUG-017: Detect LIVE status and use consistent uppercase
        status = 'UPCOMING'
        if ev['status']['type']['completed']:
            status = 'FINAL'
        elif ev['status']['type']['state'] == 'in':
            status = 'LIVE'

        games.append({
            'id': ev['id'],
            'date': ev['date'].split('T')[0],
            'home': home['team']['name'],
            'away': away['team']['name'],
            'homeScore': int(home['score']) if home['score'] else 0,
            'awayScore': int(away['score']) if away['score'] else 0,
            'status': status,
            'arena': comp.get('venue', {}).get('fullName', 'NBA Arena')
        })

    games.sort(key=lambda x: x['date'], reverse=True)
    return games


# BUG-028: Added caching to games list with SWR
@app.route('/api/games')
def get_games_list():
    try:
        data = cache.get_with_swr('games_list', compute_games_list, ttl=300, swr_ttl=3600)
        return jsonify(data)
    except Exception as e:
        print("ERROR games list:", e)
        return jsonify([])


@app.route('/api/team/<abbr>/info')
def get_team_info(abbr):
    abbr = abbr.upper()
    team_id = TEAM_IDS.get(abbr)
    if not team_id:
        return jsonify({'error': 'Team not found'}), 404
    cache_key = f'team_info_{abbr}'
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)
    try:
        espn_abbr = normalize_abbr_to_espn(abbr)
        d = session.get('https://site.api.espn.com/apis/v2/sports/basketball/nba/standings', timeout=10).json()
        team_record = {}
        for conf in d.get('children', []):
            conf_name = 'Eastern' if 'Eastern' in conf['name'] else 'Western'
            for tm in conf['standings']['entries']:
                if tm['team']['abbreviation'] == espn_abbr:
                    stats = {s['name']: s['displayValue'] for s in tm['stats']}
                    rank = 0
                    for s in tm['stats']:
                        if s.get('type') == 'playoffseed':
                            rank = int(s.get('value', 0))
                            break
                    l10 = next((s['displayValue'] for s in tm['stats'] if s.get('id') == '901'), '0-0')
                    team_record = {
                        'conference': conf_name,
                        'rank': rank,
                        'wins': int(stats.get('wins', 0)),
                        'losses': int(stats.get('losses', 0)),
                        'pct': stats.get('winPercent', '.000'),
                        'streak': stats.get('streak', '-'),
                        'last10': l10,
                        'gb': stats.get('gamesBehind', '-'),
                    }
                    break
        result = {'abbr': abbr, 'name': TEAM_FULL_NAMES.get(abbr, abbr), 'color': TEAM_COLORS.get(abbr, '#1d3557'), **team_record}
        cache.set(cache_key, result, ttl=300, swr_ttl=3600)
        return jsonify(result)
    except Exception as e:
        print(f'ERROR team info {abbr}:', e)
        return jsonify({'abbr': abbr, 'name': TEAM_FULL_NAMES.get(abbr, abbr), 'color': TEAM_COLORS.get(abbr, '#1d3557')})


@app.route('/api/team/<abbr>/schedule')
def get_team_schedule(abbr):
    abbr = abbr.upper()
    team_id = TEAM_IDS.get(abbr)
    if not team_id:
        return jsonify({'error': 'Team not found'}), 404
    cache_key = f'team_sched_{abbr}'
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)
    try:
        url = f'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{team_id}/schedule'
        d = session.get(url, timeout=15).json()
        games = []
        for ev in d.get('events', []):
            comp = ev.get('competitions', [{}])[0]
            competitors = comp.get('competitors', [])
            if len(competitors) < 2:
                continue
            home = next((c for c in competitors if c.get('homeAway') == 'home'), competitors[0])
            away = next((c for c in competitors if c.get('homeAway') == 'away'), competitors[1])
            is_done = comp.get('status', {}).get('type', {}).get('completed', False)
            hs = 0
            asc = 0
            if is_done:
                sv_h = home.get('score')
                sv_a = away.get('score')
                hs = int(sv_h.get('value', 0)) if isinstance(sv_h, dict) else int(sv_h or 0)
                asc = int(sv_a.get('value', 0)) if isinstance(sv_a, dict) else int(sv_a or 0)

            # BUG-002: Normalize ESPN abbreviations to app abbreviations before comparing
            h_ab = normalize_abbr_to_app(home.get('team', {}).get('abbreviation', ''))
            a_ab = normalize_abbr_to_app(away.get('team', {}).get('abbreviation', ''))

            result = None
            if is_done:
                is_home = h_ab == abbr
                # BUG-025: Handle ties correctly
                if hs == asc:
                    result = 'T'
                elif (hs > asc if is_home else asc > hs):
                    result = 'W'
                else:
                    result = 'L'

            # BUG-017: Consistent uppercase status
            games.append({
                'id': ev.get('id'), 'date': ev.get('date', '').split('T')[0],
                'home': home.get('team', {}).get('shortDisplayName', ''),
                'away': away.get('team', {}).get('shortDisplayName', ''),
                'homeAbbr': h_ab, 'awayAbbr': a_ab, 'homeScore': hs, 'awayScore': asc,
                'status': 'FINAL' if is_done else 'UPCOMING',
                'arena': comp.get('venue', {}).get('fullName', 'NBA Arena'), 'result': result,
            })
        games.sort(key=lambda x: x['date'], reverse=True)
        cache.set(cache_key, games, ttl=120, swr_ttl=1800)
        return jsonify(games)
    except Exception as e:
        print(f'ERROR team schedule {abbr}:', e)
        return jsonify([])


@app.route('/api/team/<abbr>/roster')
def get_team_roster(abbr):
    abbr = abbr.upper()
    team_id = TEAM_IDS.get(abbr)
    if not team_id:
        return jsonify({'error': 'Team not found'}), 404
    cache_key = f'team_roster_{abbr}'
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)
    try:
        url = f'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{team_id}/roster'
        d = session.get(url, timeout=15).json()
        players = []
        for ath in d.get('athletes', []):
            pos = ath.get('position', {})
            pos_abbr = pos.get('abbreviation', 'N/A') if isinstance(pos, dict) else 'N/A'
            exp = ath.get('experience', {})
            exp_years = exp.get('years', 0) if isinstance(exp, dict) else 0
            players.append({
                'id': ath.get('id'), 'name': ath.get('displayName', ''),
                'number': ath.get('jersey', ''),
                'pos': pos_abbr,
                'height': ath.get('displayHeight', ''),
                'weight': ath.get('displayWeight', ''),
                'age': ath.get('age', ''),
                'experience': exp_years,
            })
        cache.set(cache_key, players, ttl=600, swr_ttl=86400)
        return jsonify(players)
    except Exception as e:
        print(f'ERROR team roster {abbr}:', e)
        return jsonify([])


def prewarm_cache():
    """Background thread to prewarm essential endpoints on startup."""
    time.sleep(0.5)
    tasks = [
        ('today_games', compute_today_games, 20, 300),
        ('stats_leaders', compute_stats_leaders, 1800, 86400),
        ('games_list', compute_games_list, 300, 3600),
        ('standings', compute_standings, 300, 3600),
    ]
    for key, fn, ttl, swr_ttl in tasks:
        try:
            val = fn()
            if val:
                cache.set(key, val, ttl=ttl, swr_ttl=swr_ttl)
        except Exception as e:
            print(f"[PREWARM] Notice: could not pre-warm {key}: {e}")


threading.Thread(target=prewarm_cache, daemon=True).start()

# BUG-032: Disable debug mode for production safety; enable threaded mode
if __name__ == '__main__':
    app.run(debug=False, port=5000, threaded=True)

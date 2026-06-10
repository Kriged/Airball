import time
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import datetime

app = Flask(__name__)
CORS(app)

class Cache:
    def __init__(self):
        self.store = {}

    def get(self, key):
        if key in self.store:
            entry = self.store[key]
            if time.time() < entry['expiry']:
                return entry['value']
            else:
                del self.store[key]
        return None

    def set(self, key, value, ttl=10):
        self.store[key] = {
            'value': value,
            'expiry': time.time() + ttl
        }

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


def fetch_game_stats(game_id):
    """Fetch real team statistics from ESPN summary API for a game."""
    try:
        url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event={game_id}"
        d = requests.get(url, timeout=8).json()

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


@app.route('/api/games/today')
def get_today_games():
    cache_key = 'today_games'
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)

    try:
        url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard"
        d = requests.get(url, timeout=10).json()

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

            # BUG-004: Default stats (will be overridden with real data for non-upcoming games)
            game_stats = {
                'fgPct': {'home': 0.0, 'away': 0.0},
                'fg3Pct': {'home': 0.0, 'away': 0.0},
                'rebounds': {'home': 0, 'away': 0},
                'assists': {'home': 0, 'away': 0},
                'turnovers': {'home': 0, 'away': 0}
            }

            # Fetch real stats for live/final games
            if status in ('LIVE', 'FINAL'):
                real_stats = fetch_game_stats(game_id)
                if real_stats:
                    game_stats = real_stats

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

        cache.set(cache_key, mapped_games, ttl=30)
        return jsonify(mapped_games)
    except Exception as e:
        print("ERROR get today games:", e)
        # BUG-013: Return error object instead of empty array on 500
        return jsonify({'error': 'Failed to fetch games', 'games': []}), 500

@app.route('/api/games/<game_id>/playbyplay')
def get_playbyplay(game_id):
    cache_key = f'pbp_{game_id}'
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)

    try:
        url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event={game_id}"
        d = requests.get(url, timeout=10).json()
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

        cache.set(cache_key, mapped_actions, ttl=10)
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
        d = requests.get(url, timeout=10).json()

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
                # Determine which side is still available
                used_sides = [team_side_map.get(tid) for tid in team_side_map if team_side_map.get(tid)]
                team_side = 'away' if 'home' in used_sides else 'home'
                print(f"WARN: Team ID {t_id} not found in side map, defaulting to '{team_side}'")

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

        cache.set(cache_key, result, ttl=15)
        return jsonify(result)
    except Exception as e:
        print("ERROR boxscore:", e)
        return jsonify({'home': [], 'away': []})

@app.route('/api/standings')
def get_standings():
    cache_key = 'standings'
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)

    try:
        d = requests.get('https://site.api.espn.com/apis/v2/sports/basketball/nba/standings', timeout=10).json()
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
                    'abbr': app_abbr,  # Use normalized app abbreviation for links
                    'wins': int(stats.get('wins', 0)),
                    'losses': int(stats.get('losses', 0)),
                    'pct': stats.get('winPercent', '.000'),
                    'gb': stats.get('gamesBehind', '-'),
                    'streak': stats.get('streak', '-'),
                    'last10': l10
                })

        standings['Eastern'].sort(key=lambda x: x['rank'])
        standings['Western'].sort(key=lambda x: x['rank'])

        cache.set(cache_key, standings, ttl=300)
        return jsonify(standings)
    except Exception as e:
        print("ERROR standings:", e)
        return jsonify({'Eastern': [], 'Western': []})

@app.route('/api/players')
def get_players():
    cache_key = 'players'
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)

    try:
        url = 'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete?region=us&lang=en&contentorigin=espn&isqualified=true&page=1&limit=100&sort=offensive.avgPoints%3Adesc'
        d = requests.get(url, timeout=10).json()

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

        cache.set(cache_key, result_players, ttl=600)
        return jsonify(result_players)
    except Exception as e:
        print("ERROR players:", e)
        return jsonify([])

@app.route('/api/stats/leaders')
def get_stats_leaders():
    cache_key = 'stats_leaders'
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)

    try:
        url = 'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete?region=us&lang=en&contentorigin=espn&isqualified=true&page=1&limit=100&sort=offensive.avgPoints%3Adesc'
        d = requests.get(url, timeout=10).json()

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

        result = {
            'Points': get_top('Points'),
            'Rebounds': get_top('Rebounds'),
            'Assists': get_top('Assists'),
            'Steals': get_top('Steals'),
            'Blocks': get_top('Blocks')
        }

        cache.set(cache_key, result, ttl=600)
        return jsonify(result)
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

# BUG-028: Added caching to games list
@app.route('/api/games')
def get_games_list():
    cache_key = 'games_list'
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)

    try:
        end_date = datetime.datetime.now()
        start_date = end_date - datetime.timedelta(days=15)
        dates_str = f"{start_date.strftime('%Y%m%d')}-{end_date.strftime('%Y%m%d')}"

        url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates={dates_str}"
        d = requests.get(url, timeout=10).json()

        games = []
        for ev in d.get('events', []):
            comp = ev['competitions'][0]
            home = next((c for c in comp['competitors'] if c['homeAway'] == 'home'), None)
            away = next((c for c in comp['competitors'] if c['homeAway'] == 'away'), None)
            if not home or not away: continue

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
        cache.set(cache_key, games, ttl=60)
        return jsonify(games)
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
        d = requests.get('https://site.api.espn.com/apis/v2/sports/basketball/nba/standings', timeout=10).json()
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
        cache.set(cache_key, result, ttl=300)
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
        d = requests.get(url, timeout=15).json()
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
        cache.set(cache_key, games, ttl=120)
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
        d = requests.get(url, timeout=15).json()
        players = []
        for ath in d.get('athletes', []):
            # Each athlete is a direct object in the array
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
        cache.set(cache_key, players, ttl=600)
        return jsonify(players)
    except Exception as e:
        print(f'ERROR team roster {abbr}:', e)
        return jsonify([])

# BUG-032: Disable debug mode for production safety
if __name__ == '__main__':
    app.run(debug=False, port=5000)

import os
import time
from flask import Flask, jsonify, request
from flask_cors import CORS

# Patch nba_api headers before importing any endpoint to bypass Akamai bot detection
from nba_api.stats.library import http as stats_http
from nba_api.live.nba.library import http as live_http

NBA_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.nba.com/',
    'Origin': 'https://www.nba.com/',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0'
}

stats_http.STATS_HEADERS = NBA_HEADERS
live_http.NBALiveHTTP.headers = NBA_HEADERS

# Import nba_api endpoints
from nba_api.live.nba.endpoints import scoreboard, playbyplay, boxscore
from nba_api.stats.endpoints import leaguestandings, leagueleaders, leaguedashplayerstats

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

# Lookup table for popular player positions (fallback logic used if not present)
PLAYER_POSITIONS = {
    'LeBron James': 'SF', 'Stephen Curry': 'PG', 'Kevin Durant': 'SF',
    'Giannis Antetokounmpo': 'PF', 'Nikola Jokić': 'C', 'Luka Dončić': 'PG',
    'Joel Embiid': 'C', 'Jayson Tatum': 'SF', 'Shai Gilgeous-Alexander': 'PG',
    'Anthony Davis': 'PF', 'Devin Booker': 'SG', 'Kyrie Irving': 'PG',
    'Kawhi Leonard': 'SF', 'Paul George': 'SF', 'Damian Lillard': 'PG',
    'Jimmy Butler': 'SF', 'Bam Adebayo': 'C', 'Domantas Sabonis': 'PF',
    'Tyrese Haliburton': 'PG', 'Donovan Mitchell': 'SG', 'Jaylen Brown': 'SG',
    'Victor Wembanyama': 'C', 'Anthony Edwards': 'SG', 'Ja Morant': 'PG',
    'Jalen Brunson': 'PG', 'De\'Aaron Fox': 'PG', 'Trae Young': 'PG',
    'Karl-Anthony Towns': 'C', 'Rudy Gobert': 'C', 'Pascal Siakam': 'PF',
    'Chet Holmgren': 'C', 'Paolo Banchero': 'PF', 'Tyrese Maxey': 'PG',
    'Cade Cunningham': 'PG', 'LaMelo Ball': 'PG', 'Zion Williamson': 'PF'
}

def get_position(name):
    if name in PLAYER_POSITIONS:
        return PLAYER_POSITIONS[name]
    # Consistent fallback hashing
    hash_val = sum(ord(c) for c in name)
    pos_options = ['PG', 'SG', 'SF', 'PF', 'C']
    return pos_options[hash_val % len(pos_options)]


import requests
import datetime


import requests
import datetime

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
            
            status = 'UPCOMING'
            if ev['status']['type']['state'] == 'in':
                status = 'LIVE'
            elif ev['status']['type']['completed']:
                status = 'FINAL'
                
            quarter = ev['status']['type']['detail']
            time_val = ev['status']['displayClock'] if status == 'LIVE' else ('00:00' if status == 'FINAL' else 'Upcoming')
            
            home_abbr = home_team['team']['abbreviation']
            away_abbr = away_team['team']['abbreviation']
            
            mapped_game = {
                'id': ev['id'],
                'home': home_team['team']['name'],
                'away': away_team['team']['name'],
                'homeAbbr': home_abbr,
                'awayAbbr': away_abbr,
                'homeScore': int(home_team['score']) if home_team['score'] else 0,
                'awayScore': int(away_team['score']) if away_team['score'] else 0,
                'homeColor': TEAM_COLORS.get(home_abbr, '#f58426'),
                'awayColor': TEAM_COLORS.get(away_abbr, '#1d428a'),
                'quarter': quarter,
                'time': time_val,
                'status': status,
                'arena': comp.get('venue', {}).get('fullName', 'NBA Arena'),
                'stats': {
                    'fgPct': {'home': 45.0, 'away': 45.0},
                    'fg3Pct': {'home': 35.0, 'away': 35.0},
                    'rebounds': {'home': 40, 'away': 40},
                    'assists': {'home': 20, 'away': 20},
                    'turnovers': {'home': 12, 'away': 12}
                },
                'playByPlay': [],
                'boxScore': {'home': [], 'away': []}
            }
            mapped_games.append(mapped_game)
            
        cache.set(cache_key, mapped_games, ttl=30)
        return jsonify(mapped_games)
    except Exception as e:
        print("ERROR get today games:", e)
        return jsonify([]), 500

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
            team_side = team_side_map.get(t_id, 'home')
            
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
                fgm = fg_val.split('-')[0] if '-' in fg_val else 0
                fga = fg_val.split('-')[1] if '-' in fg_val else 0
                
                mapped.append({
                    'name': ath['athlete']['displayName'],
                    'min': stats_arr[min_idx] if min_idx != -1 else '0',
                    'pts': int(stats_arr[pts_idx]) if pts_idx != -1 else 0,
                    'reb': int(stats_arr[reb_idx]) if reb_idx != -1 else 0,
                    'ast': int(stats_arr[ast_idx]) if ast_idx != -1 else 0,
                    'fgm': int(fgm),
                    'fga': int(fga)
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
                
                standings[c_name].append({
                    'rank': rank,
                    'team': tm['team']['displayName'],
                    'abbr': tm['team']['abbreviation'],
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

@app.route('/api/seasons')
def get_seasons():
    seasons = [
        {'year': '2025-26', 'champion': 'TBD', 'mvp': 'TBD', 'status': 'In Progress', 'games': 1230, 'teams': 30},
        {'year': '2024-25', 'champion': 'TBD', 'mvp': 'TBD', 'status': 'Completed', 'games': 1230, 'teams': 30},
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

@app.route('/api/games')
def get_games_list():
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
            
            games.append({
                'id': ev['id'],
                'date': ev['date'].split('T')[0],
                'home': home['team']['name'],
                'away': away['team']['name'],
                'homeScore': int(home['score']) if home['score'] else 0,
                'awayScore': int(away['score']) if away['score'] else 0,
                'status': 'Final' if ev['status']['type']['completed'] else 'Upcoming',
                'arena': comp.get('venue', {}).get('fullName', 'NBA Arena')
            })
            
        games.sort(key=lambda x: x['date'], reverse=True)
        return jsonify(games)
    except Exception as e:
        print("ERROR games list:", e)
        return jsonify([])

if __name__ == '__main__':
    app.run(debug=True, port=5000)

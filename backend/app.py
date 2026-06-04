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

@app.route('/api/games/today')
def get_today_games():
    cache_key = 'today_games'
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)
    
    try:
        sb = scoreboard.ScoreBoard()
        data = sb.get_dict().get('scoreboard', {})
        games = data.get('games', [])
        
        mapped_games = []
        for g in games:
            status_num = g.get('gameStatus', 1)
            status = 'UPCOMING'
            if status_num == 2:
                status = 'LIVE'
            elif status_num == 3:
                status = 'FINAL'
                
            quarter = g.get('gameStatusText', '')
            game_clock = g.get('gameClock', '')
            time_val = 'Upcoming'
            if status == 'LIVE':
                time_val = game_clock if game_clock else '00:00'
            elif status == 'FINAL':
                time_val = '00:00'
                
            home_team = g.get('homeTeam', {})
            away_team = g.get('awayTeam', {})
            
            home_name = home_team.get('teamName', '')
            away_name = away_team.get('teamName', '')
            home_abbr = home_team.get('teamTricode', '')
            away_abbr = away_team.get('teamTricode', '')
            
            mapped_game = {
                'id': g.get('gameId', ''),
                'home': home_name,
                'away': away_name,
                'homeAbbr': home_abbr,
                'awayAbbr': away_abbr,
                'homeScore': home_team.get('score', 0),
                'awayScore': away_team.get('score', 0),
                'homeColor': TEAM_COLORS.get(home_abbr, '#f58426'),
                'awayColor': TEAM_COLORS.get(away_abbr, '#1d428a'),
                'quarter': quarter,
                'time': time_val,
                'status': status,
                'arena': g.get('arena', {}).get('arenaName', 'NBA Arena'),
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
            
        cache.set(cache_key, mapped_games, ttl=5)
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
        
    if game_id.startswith('mock_'):
        return jsonify([
            {'time': '00:00', 'text': 'End of 4th Quarter. Game Over.', 'score': '104-102'},
            {'time': '00:15', 'text': 'LeBron James hits a clutch step-back jumper!', 'score': '104-102'},
            {'time': '01:05', 'text': 'Jayson Tatum defensive rebound.', 'score': '102-102'},
            {'time': '01:45', 'text': 'Stephen Curry scores a layup.', 'score': '88-85'}
        ])
        
    try:
        pbp = playbyplay.PlayByPlay(game_id=game_id)
        data = pbp.get_dict().get('game', {})
        actions = data.get('actions', [])
        
        mapped_actions = []
        for act in reversed(actions):
            clock = act.get('clock', '')
            time_str = clock.replace('PT', '').replace('M', ':').replace('S', '')
            if ':' in time_str:
                parts = time_str.split(':')
                if len(parts[0]) == 1:
                    parts[0] = '0' + parts[0]
                if len(parts[1]) == 1:
                    parts[1] = '0' + parts[1]
                time_str = ':'.join(parts)
            else:
                time_str = '00:00'
                
            text = act.get('description', '')
            score = f"{act.get('scoreAway', 0)}-{act.get('scoreHome', 0)}"
            
            mapped_actions.append({
                'time': time_str,
                'text': text,
                'score': score
            })
            if len(mapped_actions) >= 30:
                break
                
        cache.set(cache_key, mapped_actions, ttl=5)
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
        
    if game_id.startswith('mock_'):
        return jsonify({
            'home': [
                {'name': 'LeBron James', 'min': '34', 'pts': 28, 'reb': 8, 'ast': 9, 'fgm': 10, 'fga': 18},
                {'name': 'Anthony Davis', 'min': '32', 'pts': 24, 'reb': 12, 'ast': 4, 'fgm': 9, 'fga': 15},
                {'name': 'Austin Reaves', 'min': '30', 'pts': 15, 'reb': 3, 'ast': 5, 'fgm': 5, 'fga': 10}
            ],
            'away': [
                {'name': 'Jayson Tatum', 'min': '35', 'pts': 26, 'reb': 9, 'ast': 5, 'fgm': 9, 'fga': 19},
                {'name': 'Jaylen Brown', 'min': '33', 'pts': 22, 'reb': 6, 'ast': 3, 'fgm': 8, 'fga': 16},
                {'name': 'Derrick White', 'min': '31', 'pts': 12, 'reb': 2, 'ast': 4, 'fgm': 4, 'fga': 8}
            ]
        })
        
    try:
        box = boxscore.BoxScore(game_id=game_id)
        data = box.get_dict().get('game', {})
        
        def map_team_players(team_data):
            players_list = team_data.get('players', [])
            mapped = []
            for p in players_list:
                stats = p.get('statistics', {})
                if stats.get('minutes', '00:00') == '00:00' or not stats.get('fieldGoalsAttempted'):
                    continue
                    
                min_str = stats.get('minutes', '00:00')
                if 'PT' in min_str:
                    min_str = min_str.replace('PT', '').split('M')[0]
                elif ':' in min_str:
                    min_str = min_str.split(':')[0]
                else:
                    min_str = '0'
                    
                name = f"{p.get('firstName', '')} {p.get('familyName', '')}"
                mapped.append({
                    'name': name,
                    'min': min_str,
                    'pts': stats.get('points', 0),
                    'reb': stats.get('reboundsTotal', 0),
                    'ast': stats.get('assists', 0),
                    'fgm': stats.get('fieldGoalsMade', 0),
                    'fga': stats.get('fieldGoalsAttempted', 0)
                })
            return mapped
            
        result = {
            'home': map_team_players(data.get('homeTeam', {})),
            'away': map_team_players(data.get('awayTeam', {}))
        }
        cache.set(cache_key, result, ttl=10)
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
        standings = leaguestandings.LeagueStandings(season='2025-26')
        data = standings.get_dict()
        result_set = data.get('resultSets', [])[0]
        headers = result_set.get('headers', [])
        rows = result_set.get('rowSet', [])
        
        teams_data = [dict(zip(headers, row)) for row in rows]
        
        eastern = []
        western = []
        
        for t in teams_data:
            team_name = t.get('TeamName', '')
            # Match 3-letter code
            abbr = team_name[:3].upper()
            for key, val in TEAM_COLORS.items():
                if key in team_name or team_name in key:
                    abbr = key
                    break
            
            # Fallback map for abbreviations
            abbr_overrides = {
                'Cavaliers': 'CLE', 'Celtics': 'BOS', 'Bucks': 'MIL', '76ers': 'PHI',
                'Heat': 'MIA', 'Knicks': 'NYK', 'Pacers': 'IND', 'Magic': 'ORL',
                'Nuggets': 'DEN', 'Thunder': 'OKC', 'Timberwolves': 'MIN', 'Mavericks': 'DAL',
                'Lakers': 'LAL', 'Clippers': 'LAC', 'Suns': 'PHX', 'Pelicans': 'NOP'
            }
            if team_name in abbr_overrides:
                abbr = abbr_overrides[team_name]

            record = {
                'rank': t.get('PlayoffRank', 1),
                'team': f"{t.get('TeamCity', '')} {team_name}",
                'abbr': abbr,
                'wins': t.get('WINS', 0),
                'losses': t.get('LOSSES', 0),
                'pct': f".{str(int(t.get('WinPCT', 0.0) * 1000)).zfill(3)}" if t.get('WinPCT') is not None else '.000',
                'gb': str(t.get('GamesBack', '-')) if t.get('GamesBack', 0) != 0 else '-',
                'streak': t.get('Streak', 'W1'),
                'last10': t.get('L10', '5-5')
            }
                
            conf = t.get('Conference', 'East')
            if conf.lower() == 'east':
                eastern.append(record)
            else:
                western.append(record)
                
        eastern.sort(key=lambda x: x['rank'])
        western.sort(key=lambda x: x['rank'])
        
        result = {
            'Eastern': eastern,
            'Western': western
        }
        cache.set(cache_key, result, ttl=300)
        return jsonify(result)
    except Exception as e:
        print("ERROR standings:", e)
        return jsonify({'Eastern': [], 'Western': []})

@app.route('/api/stats/leaders')
def get_stats_leaders():
    cache_key = 'stats_leaders'
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)
        
    try:
        # Fetch league leaders once, and we filter categories on backend
        ll = leagueleaders.LeagueLeaders(season='2025-26', stat_category_abbreviation='PTS')
        data = ll.get_dict()
        result_set = data.get('resultSet', {})
        headers = result_set.get('headers', [])
        rows = result_set.get('rowSet', [])
        
        players = [dict(zip(headers, row)) for row in rows]
        
        # Sort and map for different categories
        def get_top_leaders(players_list, sort_col, count=8):
            # Sort by total value / GP descending
            valid_players = [p for p in players_list if p.get('GP', 0) > 0 and p.get(sort_col) is not None]
            valid_players.sort(key=lambda x: x[sort_col] / x['GP'], reverse=True)
            
            top_leaders = []
            for rank_idx, p in enumerate(valid_players[:count]):
                avg_val = round(p[sort_col] / p['GP'], 1)
                top_leaders.append({
                    'rank': rank_idx + 1,
                    'name': p.get('PLAYER', ''),
                    'team': p.get('TEAM', ''),
                    'value': avg_val
                })
            return top_leaders
            
        result = {
            'Points': get_top_leaders(players, 'PTS'),
            'Rebounds': get_top_leaders(players, 'REB'),
            'Assists': get_top_leaders(players, 'AST'),
            'Steals': get_top_leaders(players, 'STL'),
            'Blocks': get_top_leaders(players, 'BLK')
        }
        
        cache.set(cache_key, result, ttl=300)
        return jsonify(result)
    except Exception as e:
        print("ERROR stats leaders:", e)
        return jsonify({
            'Points': [], 'Rebounds': [], 'Assists': [], 'Steals': [], 'Blocks': []
        })


@app.route('/api/players')
def get_players():
    cache_key = 'players'
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)
        
    try:
        ld = leaguedashplayerstats.LeagueDashPlayerStats(season='2025-26')
        data = ld.get_dict()
        result_set = data.get('resultSets', [])[0]
        headers = result_set.get('headers', [])
        rows = result_set.get('rowSet', [])
        
        # Mapping index mapping dynamically
        p_id_idx = headers.index('PLAYER_ID')
        name_idx = headers.index('PLAYER_NAME')
        team_idx = headers.index('TEAM_ABBREVIATION')
        gp_idx = headers.index('GP')
        pts_idx = headers.index('PTS')
        reb_idx = headers.index('REB')
        ast_idx = headers.index('AST')
        
        result_players = []
        for row in rows:
            gp = row[gp_idx]
            if gp == 0:
                continue
                
            name = row[name_idx]
            ppg = round(row[pts_idx] / gp, 1)
            rpg = round(row[reb_idx] / gp, 1)
            apg = round(row[ast_idx] / gp, 1)
            
            result_players.append({
                'id': row[p_id_idx],
                'name': name,
                'team': row[team_idx],
                'pos': get_position(name),
                'ppg': ppg,
                'rpg': rpg,
                'apg': apg,
                'status': 'Active'
            })
            
        # Sort by ppg descending so top players are easily searchable
        result_players.sort(key=lambda x: x['ppg'], reverse=True)
        
        cache.set(cache_key, result_players, ttl=300)
        return jsonify(result_players)
    except Exception as e:
        print("ERROR players:", e)
        return jsonify([])

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
        from nba_api.stats.endpoints import leaguegamefinder
        gf = leaguegamefinder.LeagueGameFinder(season_nullable='2025-26')
        data = gf.get_dict().get('resultSets', [])[0]
        headers = data.get('headers', [])
        rows = data.get('rowSet', [])
        
        games_dict = {}
        for row in rows:
            game_id = row[headers.index('GAME_ID')]
            team_name = row[headers.index('TEAM_NAME')]
            matchup = row[headers.index('MATCHUP')]
            date = row[headers.index('GAME_DATE')]
            pts = row[headers.index('PTS')]
            
            if game_id not in games_dict:
                games_dict[game_id] = {
                    'id': game_id,
                    'date': date,
                    'status': 'Final',
                    'arena': 'NBA Arena'
                }
            
            if '@' in matchup:
                games_dict[game_id]['away'] = team_name
                games_dict[game_id]['awayScore'] = pts if pts is not None else 0
            else:
                games_dict[game_id]['home'] = team_name
                games_dict[game_id]['homeScore'] = pts if pts is not None else 0
                
        mapped_games = list(games_dict.values())
        mapped_games.sort(key=lambda x: x['date'], reverse=True)
        return jsonify(mapped_games[:100])
    except Exception as e:
        print("ERROR games list:", e)
        return jsonify([])

if __name__ == '__main__':
    app.run(debug=True, port=5000)

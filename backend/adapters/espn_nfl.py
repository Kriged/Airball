"""
ESPN NFL Adapter
Provides NFL-specific data fetching logic and route registration.
Uses ESPN's football/nfl API endpoints.
"""
import datetime
from flask import jsonify
from backend.core.provider_client import session


NFL_TEAM_COLORS = {
    'ARI': '#97233F', 'ATL': '#A71930', 'BAL': '#241773', 'BUF': '#00338D',
    'CAR': '#0085CA', 'CHI': '#0B162A', 'CIN': '#FB4F14', 'CLE': '#311D00',
    'DAL': '#041E42', 'DEN': '#FB4F14', 'DET': '#0076B6', 'GB': '#203731',
    'HOU': '#03202F', 'IND': '#002C5F', 'JAX': '#006778', 'KC': '#E31837',
    'LV': '#000000', 'LAC': '#0080C6', 'LAR': '#003594', 'MIA': '#008E97',
    'MIN': '#4F2683', 'NE': '#002244', 'NO': '#D3BC8D', 'NYG': '#0B2265',
    'NYJ': '#125740', 'PHI': '#004C54', 'PIT': '#FFB612', 'SF': '#AA0000',
    'SEA': '#002244', 'TB': '#D50A0A', 'TEN': '#0C2340', 'WSH': '#773141',
}

NFL_TEAM_IDS = {
    'ARI': '22', 'ATL': '1', 'BAL': '33', 'BUF': '2', 'CAR': '29', 'CHI': '3',
    'CIN': '4', 'CLE': '5', 'DAL': '6', 'DEN': '7', 'DET': '8', 'GB': '9',
    'HOU': '34', 'IND': '11', 'JAX': '30', 'KC': '12', 'LV': '13', 'LAC': '24',
    'LAR': '14', 'MIA': '15', 'MIN': '16', 'NE': '17', 'NO': '18', 'NYG': '19',
    'NYJ': '20', 'PHI': '21', 'PIT': '23', 'SF': '25', 'SEA': '26', 'TB': '27',
    'TEN': '10', 'WSH': '28',
}

NFL_TEAM_FULL_NAMES = {
    'ARI': 'Arizona Cardinals', 'ATL': 'Atlanta Falcons', 'BAL': 'Baltimore Ravens',
    'BUF': 'Buffalo Bills', 'CAR': 'Carolina Panthers', 'CHI': 'Chicago Bears',
    'CIN': 'Cincinnati Bengals', 'CLE': 'Cleveland Browns', 'DAL': 'Dallas Cowboys',
    'DEN': 'Denver Broncos', 'DET': 'Detroit Lions', 'GB': 'Green Bay Packers',
    'HOU': 'Houston Texans', 'IND': 'Indianapolis Colts', 'JAX': 'Jacksonville Jaguars',
    'KC': 'Kansas City Chiefs', 'LV': 'Las Vegas Raiders', 'LAC': 'Los Angeles Chargers',
    'LAR': 'Los Angeles Rams', 'MIA': 'Miami Dolphins', 'MIN': 'Minnesota Vikings',
    'NE': 'New England Patriots', 'NO': 'New Orleans Saints', 'NYG': 'New York Giants',
    'NYJ': 'New York Jets', 'PHI': 'Philadelphia Eagles', 'PIT': 'Pittsburgh Steelers',
    'SF': 'San Francisco 49ers', 'SEA': 'Seattle Seahawks', 'TB': 'Tampa Bay Buccaneers',
    'TEN': 'Tennessee Titans', 'WSH': 'Washington Commanders',
}

NFL_BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl"
NFL_V2_BASE = "https://site.api.espn.com/apis/v2/sports/football/nfl"
NFL_WEB_BASE = "https://site.web.api.espn.com/apis/common/v3/sports/football/nfl"


def compute_nfl_today_games():
    """Fetch today's/this week's NFL games from ESPN scoreboard."""
    url = f"{NFL_BASE}/scoreboard"
    d = session.get(url, timeout=10).json()
    mapped_games = []
    for ev in d.get('events', []):
        comp = ev['competitions'][0]
        home_team = next((c for c in comp['competitors'] if c['homeAway'] == 'home'), None)
        away_team = next((c for c in comp['competitors'] if c['homeAway'] == 'away'), None)
        if not home_team or not away_team:
            continue
        status = 'UPCOMING'
        if ev['status']['type']['state'] == 'in':
            status = 'LIVE'
        elif ev['status']['type']['completed']:
            status = 'FINAL'
        quarter = ev['status']['type']['detail']
        time_val = ev['status']['displayClock'] if status == 'LIVE' else ('00:00' if status == 'FINAL' else 'Upcoming')
        home_abbr = home_team['team']['abbreviation']
        away_abbr = away_team['team']['abbreviation']
        mapped_games.append({
            'id': ev['id'],
            'home': home_team['team']['name'],
            'away': away_team['team']['name'],
            'homeAbbr': home_abbr,
            'awayAbbr': away_abbr,
            'homeScore': int(home_team['score']) if home_team.get('score') else 0,
            'awayScore': int(away_team['score']) if away_team.get('score') else 0,
            'homeColor': NFL_TEAM_COLORS.get(home_abbr, '#013369'),
            'awayColor': NFL_TEAM_COLORS.get(away_abbr, '#D50A0A'),
            'quarter': quarter,
            'time': time_val,
            'status': status,
            'arena': comp.get('venue', {}).get('fullName', 'NFL Stadium'),
        })
    return mapped_games


def compute_nfl_games_list():
    """Fetch recent NFL games over the past 15 days."""
    end_date = datetime.datetime.now()
    start_date = end_date - datetime.timedelta(days=15)
    dates_str = f"{start_date.strftime('%Y%m%d')}-{end_date.strftime('%Y%m%d')}"
    url = f"{NFL_BASE}/scoreboard?dates={dates_str}"
    d = session.get(url, timeout=10).json()
    events = d.get('events', [])
    if not events:
        fb_d = session.get(f"{NFL_BASE}/scoreboard", timeout=10).json()
        events = fb_d.get('events', [])
    games = []
    for ev in events:
        comp = ev['competitions'][0]
        home = next((c for c in comp['competitors'] if c['homeAway'] == 'home'), None)
        away = next((c for c in comp['competitors'] if c['homeAway'] == 'away'), None)
        if not home or not away:
            continue
        status = 'UPCOMING'
        if ev['status']['type']['completed']:
            status = 'FINAL'
        elif ev['status']['type']['state'] == 'in':
            status = 'LIVE'
        games.append({
            'id': ev['id'], 'date': ev['date'].split('T')[0],
            'home': home['team']['name'], 'away': away['team']['name'],
            'homeAbbr': home['team']['abbreviation'],
            'awayAbbr': away['team']['abbreviation'],
            'homeScore': int(home['score']) if home.get('score') else 0,
            'awayScore': int(away['score']) if away.get('score') else 0,
            'status': status, 'arena': comp.get('venue', {}).get('fullName', 'NFL Stadium')
        })
    games.sort(key=lambda x: x['date'], reverse=True)
    return games


def compute_nfl_standings():
    """Fetch NFL standings organized by AFC/NFC."""
    d = session.get(f"{NFL_V2_BASE}/standings", timeout=10).json()
    standings = {'AFC': [], 'NFC': []}
    for conf in d.get('children', []):
        c_name = 'AFC' if 'American' in conf.get('name', '') or 'AFC' in conf.get('abbreviation', '') else 'NFC'
        # NFL standings may have divisions nested under conferences
        divisions = conf.get('children', [])
        if divisions:
            for div in divisions:
                div_name = div.get('name', '')
                for tm in div.get('standings', {}).get('entries', []):
                    stats = {s['name']: s.get('displayValue', '0') for s in tm.get('stats', [])}
                    rank = 0
                    for s in tm.get('stats', []):
                        if s.get('type') == 'playoffseed':
                            rank = int(s.get('value', 0))
                            break
                    abbr = tm['team']['abbreviation']
                    standings[c_name].append({
                        'rank': rank,
                        'team': tm['team']['displayName'],
                        'abbr': abbr,
                        'division': div_name,
                        'wins': int(stats.get('wins', 0)),
                        'losses': int(stats.get('losses', 0)),
                        'ties': int(stats.get('ties', 0)),
                        'pct': stats.get('winPercent', '.000'),
                        'pf': stats.get('pointsFor', '0'),
                        'pa': stats.get('pointsAgainst', '0'),
                        'streak': stats.get('streak', '-'),
                    })
        else:
            for tm in conf.get('standings', {}).get('entries', []):
                stats = {s['name']: s.get('displayValue', '0') for s in tm.get('stats', [])}
                rank = 0
                for s in tm.get('stats', []):
                    if s.get('type') == 'playoffseed':
                        rank = int(s.get('value', 0))
                        break
                abbr = tm['team']['abbreviation']
                standings[c_name].append({
                    'rank': rank, 'team': tm['team']['displayName'], 'abbr': abbr,
                    'division': '', 'wins': int(stats.get('wins', 0)),
                    'losses': int(stats.get('losses', 0)), 'ties': int(stats.get('ties', 0)),
                    'pct': stats.get('winPercent', '.000'),
                    'pf': stats.get('pointsFor', '0'), 'pa': stats.get('pointsAgainst', '0'),
                    'streak': stats.get('streak', '-'),
                })
    standings['AFC'].sort(key=lambda x: x['rank'] if x['rank'] > 0 else 999)
    standings['NFC'].sort(key=lambda x: x['rank'] if x['rank'] > 0 else 999)
    return standings


def compute_nfl_players():
    """Fetch NFL player leaders (sorted by passing yards)."""
    url = f'{NFL_WEB_BASE}/statistics/byathlete?region=us&lang=en&contentorigin=espn&isqualified=true&page=1&limit=100&sort=passing.passingYards%3Adesc'
    try:
        d = session.get(url, timeout=10).json()
    except Exception:
        return []
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
                try:
                    stats_dict[names[i]] = float(values[i])
                except (ValueError, TypeError):
                    pass
        result_players.append({
            'id': ath['id'],
            'name': ath['displayName'],
            'team': ath.get('teamShortName', 'FA'),
            'pos': ath.get('position', {}).get('abbreviation', 'N/A'),
            'passingYards': round(stats_dict.get('passingYards', 0), 0),
            'rushingYards': round(stats_dict.get('rushingYards', 0), 0),
            'receivingYards': round(stats_dict.get('receivingYards', 0), 0),
            'touchdowns': round(stats_dict.get('passingTouchdowns', 0) + stats_dict.get('rushingTouchdowns', 0) + stats_dict.get('receivingTouchdowns', 0), 0),
            'status': 'Active'
        })
    return result_players


def compute_nfl_stats_leaders():
    """Fetch NFL stat leaders across multiple categories."""
    categories_map = {
        'Passing': ('passing.passingYards', 'passingYards'),
        'Rushing': ('rushing.rushingYards', 'rushingYards'),
        'Receiving': ('receiving.receivingYards', 'receivingYards'),
        'Sacks': ('defensive.sacks', 'sacks'),
        'Interceptions': ('defensive.interceptions', 'interceptions'),
    }
    result = {}
    for cat_label, (sort_key, stat_key) in categories_map.items():
        try:
            url = f'{NFL_WEB_BASE}/statistics/byathlete?region=us&lang=en&contentorigin=espn&isqualified=true&page=1&limit=8&sort={sort_key}%3Adesc'
            d = session.get(url, timeout=10).json()
            global_cats = {c['name']: c['names'] for c in d.get('categories', [])}
            leaders = []
            for idx, p in enumerate(d.get('athletes', [])[:8]):
                ath = p['athlete']
                stats_dict = {}
                for cat_data in p.get('categories', []):
                    cn = cat_data['name']
                    names = global_cats.get(cn, [])
                    values = cat_data.get('values', [])
                    for i in range(min(len(names), len(values))):
                        try:
                            stats_dict[names[i]] = float(values[i])
                        except (ValueError, TypeError):
                            pass
                value = stats_dict.get(stat_key, 0)
                leaders.append({
                    'rank': idx + 1,
                    'name': ath['displayName'],
                    'team': ath.get('teamShortName', 'FA'),
                    'value': round(value, 1)
                })
            result[cat_label] = leaders
        except Exception as e:
            print(f"[NFL] Could not fetch {cat_label} leaders: {e}")
            result[cat_label] = []
    return result


def register_routes(app, cache):
    """Register all NFL API routes under /api/nfl/..."""

    @app.route('/api/nfl/games/today')
    def nfl_today_games():
        try:
            data = cache.get_with_swr('nfl:today_games', compute_nfl_today_games, ttl=30, swr_ttl=300)
            return jsonify(data)
        except Exception as e:
            print("ERROR nfl today games:", e)
            return jsonify({'error': 'Failed to fetch NFL games', 'games': []}), 500

    @app.route('/api/nfl/games')
    def nfl_games_list():
        try:
            data = cache.get_with_swr('nfl:games_list', compute_nfl_games_list, ttl=300, swr_ttl=3600)
            return jsonify(data)
        except Exception as e:
            print("ERROR nfl games list:", e)
            return jsonify([])

    @app.route('/api/nfl/games/<game_id>')
    def nfl_single_game(game_id):
        cache_key = f'nfl:game_detail_{game_id}'
        cached = cache.get(cache_key)
        if cached is not None:
            return jsonify(cached)
        try:
            url = f"{NFL_BASE}/summary?event={game_id}"
            d = session.get(url, timeout=10).json()
            header = d.get('header', {})
            comps = header.get('competitions', [{}])[0]
            competitors = comps.get('competitors', [])
            home = next((c for c in competitors if c.get('homeAway') == 'home'), competitors[0] if competitors else {})
            away = next((c for c in competitors if c.get('homeAway') == 'away'), competitors[1] if len(competitors) > 1 else {})
            status_type = comps.get('status', {}).get('type', {})
            status = 'UPCOMING'
            if status_type.get('completed'): status = 'FINAL'
            elif status_type.get('state') == 'in': status = 'LIVE'
            home_team = home.get('team', {})
            away_team = away.get('team', {})

            # Extract scoring summary by quarter
            scoring_summary = []
            scoring_plays = d.get('scoringPlays', [])
            for play in scoring_plays:
                scoring_summary.append({
                    'quarter': play.get('period', {}).get('number', 0),
                    'time': play.get('clock', {}).get('displayValue', ''),
                    'team': play.get('team', {}).get('abbreviation', ''),
                    'text': play.get('text', ''),
                    'awayScore': play.get('awayScore', 0),
                    'homeScore': play.get('homeScore', 0),
                })

            # Extract quarter-by-quarter line score
            line_score = []
            for c in competitors:
                team_ls = {'abbr': c.get('team', {}).get('abbreviation', ''), 'periods': []}
                for period in c.get('linescores', []):
                    team_ls['periods'].append(int(float(period.get('displayValue', 0))))
                line_score.append(team_ls)

            game_data = {
                'id': str(game_id), 'date': comps.get('date', '').split('T')[0],
                'home': home_team.get('displayName', 'Home'), 'away': away_team.get('displayName', 'Away'),
                'homeAbbr': home_team.get('abbreviation', ''), 'awayAbbr': away_team.get('abbreviation', ''),
                'homeScore': int(home.get('score', 0)) if home.get('score') else 0,
                'awayScore': int(away.get('score', 0)) if away.get('score') else 0,
                'status': status, 'quarter': status_type.get('detail', ''),
                'time': comps.get('status', {}).get('displayClock', '00:00'),
                'arena': comps.get('venue', {}).get('fullName', 'NFL Stadium'),
                'scoringSummary': scoring_summary,
                'lineScore': line_score,
            }
            cache.set(cache_key, game_data, ttl=15 if status == 'LIVE' else 3600, swr_ttl=86400)
            return jsonify(game_data)
        except Exception as e:
            print(f"ERROR nfl_single_game {game_id}:", e)
            return jsonify({'error': 'Game not found'}), 404

    @app.route('/api/nfl/standings')
    def nfl_standings():
        try:
            data = cache.get_with_swr('nfl:standings', compute_nfl_standings, ttl=300, swr_ttl=3600)
            return jsonify(data)
        except Exception as e:
            print("ERROR nfl standings:", e)
            return jsonify({'AFC': [], 'NFC': []})

    @app.route('/api/nfl/players')
    def nfl_players():
        try:
            data = cache.get_with_swr('nfl:players', compute_nfl_players, ttl=1800, swr_ttl=86400)
            return jsonify(data)
        except Exception as e:
            print("ERROR nfl players:", e)
            return jsonify([])

    @app.route('/api/nfl/stats/leaders')
    def nfl_stats_leaders():
        try:
            data = cache.get_with_swr('nfl:stats_leaders', compute_nfl_stats_leaders, ttl=1800, swr_ttl=86400)
            return jsonify(data)
        except Exception as e:
            print("ERROR nfl stats leaders:", e)
            return jsonify({'Passing': [], 'Rushing': [], 'Receiving': [], 'Sacks': [], 'Interceptions': []})

    @app.route('/api/nfl/seasons')
    def nfl_seasons():
        seasons = [
            {'year': '2025-26', 'champion': 'TBD', 'mvp': 'TBD', 'status': 'In Progress', 'games': 272, 'teams': 32},
            {'year': '2024-25', 'champion': 'Kansas City Chiefs', 'mvp': 'Lamar Jackson', 'status': 'Completed', 'games': 272, 'teams': 32},
            {'year': '2023-24', 'champion': 'Kansas City Chiefs', 'mvp': 'Lamar Jackson', 'status': 'Completed', 'games': 272, 'teams': 32},
            {'year': '2022-23', 'champion': 'Kansas City Chiefs', 'mvp': 'Patrick Mahomes', 'status': 'Completed', 'games': 272, 'teams': 32},
            {'year': '2021-22', 'champion': 'Los Angeles Rams', 'mvp': 'Aaron Rodgers', 'status': 'Completed', 'games': 272, 'teams': 32},
            {'year': '2020-21', 'champion': 'Tampa Bay Buccaneers', 'mvp': 'Aaron Rodgers', 'status': 'Completed', 'games': 256, 'teams': 32},
            {'year': '2019-20', 'champion': 'Kansas City Chiefs', 'mvp': 'Lamar Jackson', 'status': 'Completed', 'games': 256, 'teams': 32},
            {'year': '2018-19', 'champion': 'New England Patriots', 'mvp': 'Patrick Mahomes', 'status': 'Completed', 'games': 256, 'teams': 32},
            {'year': '2017-18', 'champion': 'Philadelphia Eagles', 'mvp': 'Tom Brady', 'status': 'Completed', 'games': 256, 'teams': 32},
            {'year': '2016-17', 'champion': 'New England Patriots', 'mvp': 'Matt Ryan', 'status': 'Completed', 'games': 256, 'teams': 32},
        ]
        return jsonify(seasons)

    @app.route('/api/nfl/team/<abbr>/info')
    def nfl_team_info(abbr):
        abbr = abbr.upper()
        team_id = NFL_TEAM_IDS.get(abbr)
        if not team_id:
            return jsonify({'error': 'Team not found'}), 404
        cache_key = f'nfl:team_info_{abbr}'
        cached = cache.get(cache_key)
        if cached is not None:
            return jsonify(cached)
        try:
            d = session.get(f"{NFL_V2_BASE}/standings", timeout=10).json()
            team_record = {}
            for conf in d.get('children', []):
                conf_name = 'AFC' if 'American' in conf.get('name', '') or 'AFC' in conf.get('abbreviation', '') else 'NFC'
                divisions = conf.get('children', [])
                entries_list = []
                if divisions:
                    for div in divisions:
                        entries_list.extend(div.get('standings', {}).get('entries', []))
                else:
                    entries_list = conf.get('standings', {}).get('entries', [])
                for tm in entries_list:
                    if tm['team']['abbreviation'] == abbr:
                        stats = {s['name']: s.get('displayValue', '0') for s in tm.get('stats', [])}
                        rank = 0
                        for s in tm.get('stats', []):
                            if s.get('type') == 'playoffseed':
                                rank = int(s.get('value', 0))
                                break
                        team_record = {
                            'conference': conf_name, 'rank': rank,
                            'wins': int(stats.get('wins', 0)), 'losses': int(stats.get('losses', 0)),
                            'ties': int(stats.get('ties', 0)),
                            'pct': stats.get('winPercent', '.000'), 'streak': stats.get('streak', '-'),
                        }
                        break
            result = {'abbr': abbr, 'name': NFL_TEAM_FULL_NAMES.get(abbr, abbr), 'color': NFL_TEAM_COLORS.get(abbr, '#013369'), **team_record}
            cache.set(cache_key, result, ttl=300, swr_ttl=3600)
            return jsonify(result)
        except Exception as e:
            print(f'ERROR nfl team info {abbr}:', e)
            return jsonify({'abbr': abbr, 'name': NFL_TEAM_FULL_NAMES.get(abbr, abbr), 'color': NFL_TEAM_COLORS.get(abbr, '#013369')})

    @app.route('/api/nfl/team/<abbr>/schedule')
    def nfl_team_schedule(abbr):
        abbr = abbr.upper()
        team_id = NFL_TEAM_IDS.get(abbr)
        if not team_id:
            return jsonify({'error': 'Team not found'}), 404
        cache_key = f'nfl:team_sched_{abbr}'
        cached = cache.get(cache_key)
        if cached is not None:
            return jsonify(cached)
        try:
            url = f'{NFL_BASE}/teams/{team_id}/schedule'
            d = session.get(url, timeout=15).json()
            games = []
            for ev in d.get('events', []):
                comp = ev.get('competitions', [{}])[0]
                competitors = comp.get('competitors', [])
                if len(competitors) < 2: continue
                home = next((c for c in competitors if c.get('homeAway') == 'home'), competitors[0])
                away = next((c for c in competitors if c.get('homeAway') == 'away'), competitors[1])
                is_done = comp.get('status', {}).get('type', {}).get('completed', False)
                hs, asc = 0, 0
                if is_done:
                    sv_h = home.get('score')
                    sv_a = away.get('score')
                    hs = int(sv_h.get('value', 0)) if isinstance(sv_h, dict) else int(sv_h or 0)
                    asc = int(sv_a.get('value', 0)) if isinstance(sv_a, dict) else int(sv_a or 0)
                h_ab = home.get('team', {}).get('abbreviation', '')
                a_ab = away.get('team', {}).get('abbreviation', '')
                result_val = None
                if is_done:
                    is_home = h_ab == abbr
                    if hs == asc: result_val = 'T'
                    elif (hs > asc if is_home else asc > hs): result_val = 'W'
                    else: result_val = 'L'
                games.append({
                    'id': ev.get('id'), 'date': ev.get('date', '').split('T')[0],
                    'home': home.get('team', {}).get('shortDisplayName', ''),
                    'away': away.get('team', {}).get('shortDisplayName', ''),
                    'homeAbbr': h_ab, 'awayAbbr': a_ab, 'homeScore': hs, 'awayScore': asc,
                    'status': 'FINAL' if is_done else 'UPCOMING',
                    'arena': comp.get('venue', {}).get('fullName', 'NFL Stadium'), 'result': result_val,
                })
            games.sort(key=lambda x: x['date'], reverse=True)
            cache.set(cache_key, games, ttl=120, swr_ttl=1800)
            return jsonify(games)
        except Exception as e:
            print(f'ERROR nfl team schedule {abbr}:', e)
            return jsonify([])

    @app.route('/api/nfl/team/<abbr>/roster')
    def nfl_team_roster(abbr):
        abbr = abbr.upper()
        team_id = NFL_TEAM_IDS.get(abbr)
        if not team_id:
            return jsonify({'error': 'Team not found'}), 404
        cache_key = f'nfl:team_roster_{abbr}'
        cached = cache.get(cache_key)
        if cached is not None:
            return jsonify(cached)
        try:
            url = f'{NFL_BASE}/teams/{team_id}/roster'
            d = session.get(url, timeout=15).json()
            players = []
            for ath in d.get('athletes', []):
                pos = ath.get('position', {})
                pos_abbr = pos.get('abbreviation', 'N/A') if isinstance(pos, dict) else 'N/A'
                exp = ath.get('experience', {})
                exp_years = exp.get('years', 0) if isinstance(exp, dict) else 0
                players.append({
                    'id': ath.get('id'), 'name': ath.get('displayName', ''),
                    'number': ath.get('jersey', ''), 'pos': pos_abbr,
                    'height': ath.get('displayHeight', ''), 'weight': ath.get('displayWeight', ''),
                    'age': ath.get('age', ''), 'experience': exp_years,
                })
            cache.set(cache_key, players, ttl=600, swr_ttl=86400)
            return jsonify(players)
        except Exception as e:
            print(f'ERROR nfl team roster {abbr}:', e)
            return jsonify([])

    # Prewarm
    def prewarm_nfl():
        tasks = [
            ('nfl:today_games', compute_nfl_today_games, 30, 300),
            ('nfl:games_list', compute_nfl_games_list, 300, 3600),
            ('nfl:standings', compute_nfl_standings, 300, 3600),
        ]
        for key, fn, ttl, swr_ttl in tasks:
            try:
                val = fn()
                if val:
                    cache.set(key, val, ttl=ttl, swr_ttl=swr_ttl)
            except Exception as e:
                print(f"[PREWARM-NFL] Notice: could not pre-warm {key}: {e}")

    return prewarm_nfl

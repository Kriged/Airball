"""
UFC Stats API Adapter
Implements the UFC REST API specification based on https://github.com/malichetty/ufc-stats-api:
- Fighters: list, search, filters, pagination, sort_by
- Fighter details: career stats, physical attributes, fight history
- Fighter career stats: striking, grappling, physical breakdown
- Fighter compare: head-to-head comparison with advantage analysis
- Events: upcoming, live, and historical events with full fight cards
- Fights: list fights, round-by-round statistics
- Stats leaders: slpm, str_acc, sapm, str_def, td_avg, td_acc, sub_avg, wins
- Database overview: totals, champions, stances breakdown
- Rankings: live official division & P4P rankings via ESPN MMA API
"""
import os
import json
import re
from datetime import datetime
from flask import request, jsonify
from backend.core.provider_client import session

UFC_BASE = "https://site.api.espn.com/apis/site/v2/sports/mma/ufc"
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'ufc')

# In-memory storage loaded once at startup
FIGHTERS = []
EVENTS = []
FIGHTS = []
OVERVIEW = {}
FIGHTERS_BY_ID = {}
FIGHTERS_BY_NAME = {}
EVENTS_BY_ID = {}
FIGHTS_BY_ID = {}

WEIGHT_CLASSES = [
    'Heavyweight', 'Light Heavyweight', 'Middleweight', 'Welterweight',
    'Lightweight', 'Featherweight', 'Bantamweight', 'Flyweight',
    "Women's Featherweight", "Women's Bantamweight", "Women's Flyweight", "Women's Strawweight"
]


def load_ufc_data():
    """Load pre-compiled UFC datasets from disk."""
    global FIGHTERS, EVENTS, FIGHTS, OVERVIEW, FIGHTERS_BY_ID, FIGHTERS_BY_NAME, EVENTS_BY_ID, FIGHTS_BY_ID
    
    fighters_path = os.path.join(DATA_DIR, 'fighters.json')
    events_path = os.path.join(DATA_DIR, 'events.json')
    fights_path = os.path.join(DATA_DIR, 'fights.json')
    overview_path = os.path.join(DATA_DIR, 'overview.json')

    if os.path.exists(fighters_path):
        try:
            with open(fighters_path, 'r', encoding='utf-8') as f:
                FIGHTERS = json.load(f)
                FIGHTERS_BY_ID = {f['id']: f for f in FIGHTERS if f.get('id')}
                FIGHTERS_BY_NAME = {f['name'].lower(): f for f in FIGHTERS if f.get('name')}
        except Exception as e:
            print(f"[UFC] Error loading fighters: {e}")

    if os.path.exists(events_path):
        try:
            with open(events_path, 'r', encoding='utf-8') as f:
                EVENTS = json.load(f)
                EVENTS_BY_ID = {str(e['id']): e for e in EVENTS if e.get('id')}
        except Exception as e:
            print(f"[UFC] Error loading events: {e}")

    if os.path.exists(fights_path):
        try:
            with open(fights_path, 'r', encoding='utf-8') as f:
                FIGHTS = json.load(f)
                FIGHTS_BY_ID = {str(f['id']): f for f in FIGHTS if f.get('id')}
        except Exception as e:
            print(f"[UFC] Error loading fights: {e}")

    if os.path.exists(overview_path):
        try:
            with open(overview_path, 'r', encoding='utf-8') as f:
                OVERVIEW = json.load(f)
        except Exception as e:
            print(f"[UFC] Error loading overview: {e}")

    print(f"[UFC] Loaded {len(FIGHTERS)} fighters, {len(EVENTS)} events, {len(FIGHTS)} fights")


# Initialize data on module load
load_ufc_data()


# ---------------------------------------------------------------------------
# COMPUTE FUNCTIONS
# ---------------------------------------------------------------------------

def compute_ufc_fighters():
    """Returns all fighters (used for cache prewarming)."""
    return FIGHTERS


def compute_ufc_events():
    """Fetch upcoming and recent UFC events from ESPN."""
    url = f"{UFC_BASE}/scoreboard"
    d = session.get(url, timeout=10).json()
    events = []
    for ev in d.get('events', []):
        comp = ev.get('competitions', [{}])[0]
        status_name = ev.get('status', {}).get('type', {}).get('name', '')
        status = 'UPCOMING'
        if status_name == 'STATUS_FINAL' or ev.get('status', {}).get('type', {}).get('completed'):
            status = 'COMPLETED'
        elif status_name == 'STATUS_CANCELED':
            status = 'CANCELED'
        elif status_name == 'STATUS_POSTPONED':
            status = 'POSTPONED'
        elif ev.get('status', {}).get('type', {}).get('state') == 'in' or status_name == 'STATUS_IN_PROGRESS':
            status = 'LIVE'

        # Extract fighters/bouts from competitors
        bouts = []
        competitors = comp.get('competitors', [])
        if len(competitors) >= 2:
            fighter1 = competitors[0]
            fighter2 = competitors[1]

            bout_status = comp.get('status', {}).get('type', {})
            bout_status_name = bout_status.get('name', '')
            if bout_status_name == 'STATUS_CANCELED':
                result = 'Canceled'
            elif bout_status_name == 'STATUS_POSTPONED':
                result = 'Postponed'
            elif (bout_status_name == 'STATUS_FINAL' or bout_status.get('completed')) and not fighter1.get('winner') and not fighter2.get('winner'):
                result = 'Draw / No Contest'
            else:
                result = bout_status.get('detail', '')

            bouts.append({
                'fighter1': {
                    'name': fighter1.get('athlete', {}).get('displayName', fighter1.get('team', {}).get('name', 'TBD')),
                    'id': fighter1.get('id', ''),
                    'winner': fighter1.get('winner', False),
                    'record': fighter1.get('record', ''),
                    'photoUrl': fighter1.get('athlete', {}).get('headshot', {}).get('href', ''),
                },
                'fighter2': {
                    'name': fighter2.get('athlete', {}).get('displayName', fighter2.get('team', {}).get('name', 'TBD')),
                    'id': fighter2.get('id', ''),
                    'winner': fighter2.get('winner', False),
                    'record': fighter2.get('record', ''),
                    'photoUrl': fighter2.get('athlete', {}).get('headshot', {}).get('href', ''),
                },
                'result': result,
            })

        events.append({
            'id': ev['id'],
            'name': ev.get('name', ev.get('shortName', 'UFC Event')),
            'shortName': ev.get('shortName', ''),
            'date': ev.get('date', '').split('T')[0],
            'venue': comp.get('venue', {}).get('fullName', 'UFC Arena'),
            'status': status,
            'bouts': bouts,
            'fightCard': bouts,
        })
    return events


def compute_ufc_event_detail(event_id):
    """Fetch detailed event info including fight card."""
    eid = str(event_id)
    # Check loaded events first
    if eid in EVENTS_BY_ID:
        return EVENTS_BY_ID[eid]

    # Otherwise query ESPN summary endpoint
    url = f"{UFC_BASE}/summary?event={eid}"
    try:
        d = session.get(url, timeout=10).json()
        header = d.get('header', {})
        comps = header.get('competitions', [{}])[0]
        status_type = comps.get('status', {}).get('type', {})
        status_name = status_type.get('name', '')
        status = 'UPCOMING'
        if status_name == 'STATUS_FINAL' or status_type.get('completed'):
            status = 'COMPLETED'
        elif status_name in ('STATUS_CANCELED', 'STATUS_POSTPONED'):
            status = status_name.replace('STATUS_', '')
        elif status_type.get('state') == 'in':
            status = 'LIVE'

        fight_card = []
        for bout_comp in header.get('competitions', []):
            fighters = bout_comp.get('competitors', [])
            if len(fighters) < 2:
                continue
            f1, f2 = fighters[0], fighters[1]
            fight_card.append({
                'fighter1': {
                    'name': f1.get('athlete', {}).get('displayName', f1.get('team', {}).get('name', 'TBD')),
                    'record': f1.get('record', ''),
                    'winner': f1.get('winner', False),
                    'photoUrl': f1.get('athlete', {}).get('headshot', {}).get('href', ''),
                },
                'fighter2': {
                    'name': f2.get('athlete', {}).get('displayName', f2.get('team', {}).get('name', 'TBD')),
                    'record': f2.get('record', ''),
                    'winner': f2.get('winner', False),
                    'photoUrl': f2.get('athlete', {}).get('headshot', {}).get('href', ''),
                },
                'weightClass': bout_comp.get('type', {}).get('text', ''),
                'result': bout_comp.get('status', {}).get('type', {}).get('detail', ''),
                'method': bout_comp.get('status', {}).get('result', {}).get('name', ''),
                'round': bout_comp.get('status', {}).get('period', 0),
                'time': bout_comp.get('status', {}).get('displayClock', ''),
            })

        return {
            'id': eid,
            'name': header.get('eventName', header.get('season', {}).get('name', 'UFC Event')),
            'date': comps.get('date', '').split('T')[0],
            'venue': comps.get('venue', {}).get('fullName', 'UFC Arena'),
            'status': status,
            'bouts': fight_card,
            'fightCard': fight_card,
        }
    except Exception as e:
        print(f"[UFC] Event detail fetch error: {e}")
        return None


def compute_ufc_rankings():
    """Fetch live UFC official rankings by weight class and P4P from ESPN."""
    rankings_by_division = {wc: [] for wc in WEIGHT_CLASSES}
    rankings_by_division["Men's Pound for Pound"] = []
    rankings_by_division["Women's Pound for Pound"] = []

    try:
        url = f"{UFC_BASE}/rankings"
        d = session.get(url, timeout=10).json()
        
        # Mapping from ESPN category name to standard division name
        division_map = {
            "Men's Pound for Pound": "Men's Pound for Pound",
            "Women's Pound for Pound": "Women's Pound for Pound",
            "Heavyweight": "Heavyweight",
            "Light Heavyweight": "Light Heavyweight",
            "Middleweight": "Middleweight",
            "Welterweight": "Welterweight",
            "Lightweight": "Lightweight",
            "Featherweight": "Featherweight",
            "Bantamweight": "Bantamweight",
            "Flyweight": "Flyweight",
            "Women's Featherweight": "Women's Featherweight",
            "Women's Bantamweight": "Women's Bantamweight",
            "Women's Flyweight": "Women's Flyweight",
            "Women's Strawweight": "Women's Strawweight"
        }

        for r_group in d.get('rankings', []):
            group_name = r_group.get('name', '')
            matched_div = None
            is_champ_group = 'Champion' in group_name

            for key, target in division_map.items():
                if key.lower() in group_name.lower():
                    matched_div = target
                    break

            if not matched_div:
                continue

            for rank_item in r_group.get('ranks', []):
                ath = rank_item.get('athlete', {})
                name = ath.get('displayName')
                if not name:
                    continue

                fighter_entry = {
                    'rank': 0 if is_champ_group else rank_item.get('current', 1),
                    'name': name,
                    'record': rank_item.get('recordSummary', ''),
                    'isChampion': is_champ_group or rank_item.get('hasAccolade', False),
                    'photoUrl': ath.get('headshot', ''),
                    'flag': ath.get('flag', ''),
                    'age': ath.get('age'),
                    'trend': rank_item.get('trend', '-')
                }

                # Check if champion should be prepended
                if is_champ_group:
                    existing = rankings_by_division.setdefault(matched_div, [])
                    # Avoid duplicate champion
                    if not any(x['name'] == name for x in existing):
                        existing.insert(0, fighter_entry)
                else:
                    existing = rankings_by_division.setdefault(matched_div, [])
                    if not any(x['name'] == name for x in existing):
                        existing.append(fighter_entry)

    except Exception as e:
        print(f"[UFC] ESPN rankings fetch partial/error: {e}")

    # Fallback champions if ESPN rankings was down/incomplete
    return rankings_by_division


# ---------------------------------------------------------------------------
# ROUTE REGISTRATION
# ---------------------------------------------------------------------------

def register_routes(app, cache):
    """
    Register all UFC API routes.
    Mounted under both /api/ufc/... and /api/... for full compatibility with ufc-stats-api.
    """

    # -----------------------------------------------------------------------
    # 1. FIGHTERS ENDPOINTS
    # -----------------------------------------------------------------------

    def handle_list_fighters():
        """List fighters with pagination, filtering, and sorting."""
        limit = min(int(request.args.get('limit', 50)), 500)
        offset = max(int(request.args.get('offset', 0)), 0)
        search = request.args.get('search', '').strip().lower()
        weight_class = request.args.get('weight_class', request.args.get('division', '')).strip().lower()
        stance = request.args.get('stance', '').strip().lower()
        min_wins_arg = request.args.get('min_wins')
        sort_by = request.args.get('sort_by', '').strip().lower()
        return_format = request.args.get('format', '').strip().lower()

        results = list(FIGHTERS)

        if search:
            results = [f for f in results if search in f.get('name', '').lower() or search in f.get('nickname', '').lower()]

        if weight_class and weight_class != 'all':
            results = [f for f in results if weight_class in f.get('division', '').lower()]

        if stance and stance != 'all':
            results = [f for f in results if stance == f.get('stance', '').lower()]

        if min_wins_arg is not None and min_wins_arg != '':
            try:
                min_w = int(min_wins_arg)
                results = [f for f in results if f.get('wins', 0) >= min_w]
            except ValueError:
                pass

        if sort_by:
            reverse = True
            if sort_by == 'losses':
                reverse = True
            results = sorted(results, key=lambda x: x.get(sort_by) or 0, reverse=reverse)

        total = len(results)
        paginated = results[offset:offset + limit]

        # Return flat array if explicitly requested or if called without pagination by legacy frontend
        if return_format == 'array':
            return jsonify(paginated)

        return jsonify({
            'total': total,
            'limit': limit,
            'offset': offset,
            'data': paginated
        })

    app.add_url_rule('/api/ufc/fighters', 'ufc_fighters_list', handle_list_fighters, methods=['GET'])
    app.add_url_rule('/api/fighters', 'fighters_list', handle_list_fighters, methods=['GET'])

    def handle_compare_fighters():
        """Compare two fighters head-to-head with calculated advantages."""
        f1_id = request.args.get('fighter1', '').strip()
        f2_id = request.args.get('fighter2', '').strip()

        if not f1_id or not f2_id:
            return jsonify({'error': 'Parameters fighter1 and fighter2 are required'}), 400

        # Lookup by ID or name
        f1 = FIGHTERS_BY_ID.get(f1_id) or FIGHTERS_BY_NAME.get(f1_id.lower())
        f2 = FIGHTERS_BY_ID.get(f2_id) or FIGHTERS_BY_NAME.get(f2_id.lower())

        if not f1:
            return jsonify({'error': f"Fighter '{f1_id}' not found"}), 404
        if not f2:
            return jsonify({'error': f"Fighter '{f2_id}' not found"}), 404

        def safe_num(d, key, default=0.0):
            val = d.get(key)
            return float(val) if val is not None else default

        comparison = {
            'fighter1': {
                'id': f1.get('id'),
                'name': f1.get('name'),
                'record': f1.get('record'),
                'division': f1.get('division'),
                'height': f1.get('height'),
                'weight': f1.get('weight'),
                'reach': f1.get('reach'),
                'stance': f1.get('stance'),
            },
            'fighter2': {
                'id': f2.get('id'),
                'name': f2.get('name'),
                'record': f2.get('record'),
                'division': f2.get('division'),
                'height': f2.get('height'),
                'weight': f2.get('weight'),
                'reach': f2.get('reach'),
                'stance': f2.get('stance'),
            },
            'stats_comparison': {
                'slpm': {'fighter1': safe_num(f1, 'slpm'), 'fighter2': safe_num(f2, 'slpm')},
                'str_acc': {'fighter1': safe_num(f1, 'str_acc'), 'fighter2': safe_num(f2, 'str_acc')},
                'sapm': {'fighter1': safe_num(f1, 'sapm'), 'fighter2': safe_num(f2, 'sapm')},
                'str_def': {'fighter1': safe_num(f1, 'str_def'), 'fighter2': safe_num(f2, 'str_def')},
                'td_avg': {'fighter1': safe_num(f1, 'td_avg'), 'fighter2': safe_num(f2, 'td_avg')},
                'td_acc': {'fighter1': safe_num(f1, 'td_acc'), 'fighter2': safe_num(f2, 'td_acc')},
                'td_def': {'fighter1': safe_num(f1, 'td_def'), 'fighter2': safe_num(f2, 'td_def')},
                'sub_avg': {'fighter1': safe_num(f1, 'sub_avg'), 'fighter2': safe_num(f2, 'sub_avg')},
            },
            'advantages': {
                'fighter1': [],
                'fighter2': []
            }
        }

        stats_to_compare = [
            ('slpm', 'Strikes Landed/Min', True),
            ('str_acc', 'Strike Accuracy', True),
            ('sapm', 'Strikes Absorbed/Min (Defense)', False),
            ('str_def', 'Strike Defense', True),
            ('td_avg', 'Takedown Avg', True),
            ('td_acc', 'Takedown Accuracy', True),
            ('td_def', 'Takedown Defense', True),
            ('sub_avg', 'Submission Avg', True),
        ]

        for stat, label, higher_is_better in stats_to_compare:
            v1 = safe_num(f1, stat)
            v2 = safe_num(f2, stat)
            if v1 and v2:
                if higher_is_better:
                    if v1 > v2:
                        comparison['advantages']['fighter1'].append(label)
                    elif v2 > v1:
                        comparison['advantages']['fighter2'].append(label)
                else:
                    if v1 < v2:
                        comparison['advantages']['fighter1'].append(label)
                    elif v2 < v1:
                        comparison['advantages']['fighter2'].append(label)

        return jsonify(comparison)

    app.add_url_rule('/api/ufc/fighters/compare', 'ufc_fighters_compare', handle_compare_fighters, methods=['GET'])
    app.add_url_rule('/api/fighters/compare', 'fighters_compare', handle_compare_fighters, methods=['GET'])

    def handle_get_fighter(fighter_id):
        """Get detailed fighter info including bio and fight history."""
        fighter = FIGHTERS_BY_ID.get(fighter_id) or FIGHTERS_BY_NAME.get(fighter_id.lower())
        if not fighter:
            return jsonify({'error': 'Fighter not found'}), 404
        return jsonify(fighter)

    app.add_url_rule('/api/ufc/fighters/<fighter_id>', 'ufc_get_fighter', handle_get_fighter, methods=['GET'])
    app.add_url_rule('/api/fighters/<fighter_id>', 'get_fighter', handle_get_fighter, methods=['GET'])

    def handle_get_fighter_stats(fighter_id):
        """Get structured career statistics for a fighter."""
        fighter = FIGHTERS_BY_ID.get(fighter_id) or FIGHTERS_BY_NAME.get(fighter_id.lower())
        if not fighter:
            return jsonify({'error': 'Fighter not found'}), 404

        return jsonify({
            'id': fighter.get('id'),
            'name': fighter.get('name'),
            'record': {
                'wins': fighter.get('wins', 0),
                'losses': fighter.get('losses', 0),
                'draws': fighter.get('draws', 0),
                'total_fights': fighter.get('wins', 0) + fighter.get('losses', 0) + fighter.get('draws', 0)
            },
            'striking': {
                'slpm': fighter.get('slpm'),
                'str_acc': fighter.get('str_acc'),
                'sapm': fighter.get('sapm'),
                'str_def': fighter.get('str_def')
            },
            'grappling': {
                'td_avg': fighter.get('td_avg'),
                'td_acc': fighter.get('td_acc'),
                'td_def': fighter.get('td_def'),
                'sub_avg': fighter.get('sub_avg')
            },
            'physical': {
                'height': fighter.get('height'),
                'weight': fighter.get('weight'),
                'reach': fighter.get('reach'),
                'stance': fighter.get('stance')
            }
        })

    app.add_url_rule('/api/ufc/fighters/<fighter_id>/stats', 'ufc_get_fighter_stats', handle_get_fighter_stats, methods=['GET'])
    app.add_url_rule('/api/fighters/<fighter_id>/stats', 'get_fighter_stats', handle_get_fighter_stats, methods=['GET'])

    # -----------------------------------------------------------------------
    # 2. EVENTS ENDPOINTS
    # -----------------------------------------------------------------------

    def handle_list_events():
        """List events with optional search, pagination, and status filters."""
        try:
            events_list = cache.get_with_swr('ufc:events', compute_ufc_events, ttl=60, swr_ttl=600)
        except Exception as e:
            print("ERROR ufc events:", e)
            # A paginated or filtered request can still be fulfilled from the
            # bundled archive. Keep the unfiltered live-only route's existing
            # safe empty response when ESPN is unavailable.
            if not request.args:
                return jsonify([])
            events_list = []

        limit_arg = request.args.get('limit')
        offset_arg = request.args.get('offset')
        search = request.args.get('search', '').strip().lower()
        status_filter = request.args.get('status', '').strip().upper()
        year = request.args.get('year', '').strip()

        # If search, year, or pagination is requested, merge with archive
        if search or year or limit_arg is not None or offset_arg is not None:
            limit = min(int(limit_arg or 50), 200)
            offset = max(int(offset_arg or 0), 0)

            merged = {str(e['id']): e for e in EVENTS}
            for le in (events_list or []):
                merged[str(le['id'])] = le
            results = sorted(merged.values(), key=lambda x: x.get('date', ''), reverse=True)

            if search:
                results = [e for e in results if search in e.get('name', '').lower() or search in e.get('venue', '').lower()]

            if status_filter and status_filter != 'ALL':
                results = [e for e in results if e.get('status', '').upper() == status_filter]

            if year:
                results = [e for e in results if e.get('date', '').startswith(year)]

            total = len(results)
            paginated = results[offset:offset + limit]

            return jsonify({
                'total': total,
                'limit': limit,
                'offset': offset,
                'data': paginated
            })

        # Plain list without query params
        return jsonify(events_list if events_list is not None else [])

    app.add_url_rule('/api/ufc/events', 'ufc_events_list', handle_list_events, methods=['GET'])
    app.add_url_rule('/api/events', 'events_list', handle_list_events, methods=['GET'])

    def handle_get_event(event_id):
        """Get detailed information for a specific event with fight card."""
        cache_key = f'ufc:event_{event_id}'
        cached = cache.get(cache_key)
        if cached is not None:
            return jsonify(cached)

        event = compute_ufc_event_detail(event_id)
        if event:
            cache.set(cache_key, event, ttl=120, swr_ttl=3600)
            return jsonify(event)
        return jsonify({'error': 'Event not found'}), 404

    app.add_url_rule('/api/ufc/events/<event_id>', 'ufc_get_event', handle_get_event, methods=['GET'])
    app.add_url_rule('/api/events/<event_id>', 'get_event', handle_get_event, methods=['GET'])

    # -----------------------------------------------------------------------
    # 3. FIGHTS ENDPOINTS
    # -----------------------------------------------------------------------

    def handle_list_fights():
        """List all fights with method and search filters."""
        limit = min(int(request.args.get('limit', 50)), 200)
        offset = max(int(request.args.get('offset', 0)), 0)
        search = request.args.get('search', '').strip().lower()
        method = request.args.get('method', '').strip().lower()

        results = list(FIGHTS)
        if search:
            results = [f for f in results if
                       search in f.get('fighter1', {}).get('name', '').lower() or
                       search in f.get('fighter2', {}).get('name', '').lower() or
                       search in f.get('event_name', '').lower()]

        if method:
            results = [f for f in results if method in f.get('method', '').lower()]

        total = len(results)
        paginated = results[offset:offset + limit]

        return jsonify({
            'total': total,
            'limit': limit,
            'offset': offset,
            'data': paginated
        })

    app.add_url_rule('/api/ufc/fights', 'ufc_fights_list', handle_list_fights, methods=['GET'])
    app.add_url_rule('/api/fights', 'fights_list', handle_list_fights, methods=['GET'])

    def handle_get_fight(fight_id):
        """Get round-by-round statistics for a specific fight."""
        fight = FIGHTS_BY_ID.get(str(fight_id))
        if not fight:
            return jsonify({'error': 'Fight not found'}), 404
        return jsonify(fight)

    app.add_url_rule('/api/ufc/fights/<fight_id>', 'ufc_get_fight', handle_get_fight, methods=['GET'])
    app.add_url_rule('/api/fights/<fight_id>', 'get_fight', handle_get_fight, methods=['GET'])

    # -----------------------------------------------------------------------
    # 4. STATS & ANALYTICS ENDPOINTS
    # -----------------------------------------------------------------------

    def handle_stat_leaders():
        """
        Get stat leaders for specific metrics (slpm, str_acc, td_avg, etc.)
        Supports both single-stat query (ufc-stats-api) and multi-category (frontend).
        """
        stat = request.args.get('stat', '').strip().lower()
        limit = min(int(request.args.get('limit', 10)), 50)
        min_fights = max(int(request.args.get('min_fights', 5)), 1)

        # Helper to compute leaders for a given metric
        def get_leaders_for_stat(s_name, lim=10, min_f=5):
            qualified = [
                f for f in FIGHTERS
                if (f.get('wins', 0) + f.get('losses', 0) + f.get('draws', 0)) >= min_f
            ]
            if s_name == 'wins':
                sorted_f = sorted(qualified, key=lambda x: x.get('wins') or 0, reverse=True)
            elif s_name == 'sapm':
                # For strikes absorbed, lower is better
                sorted_f = sorted([f for f in qualified if f.get(s_name) is not None and f.get(s_name) > 0],
                                  key=lambda x: x.get(s_name), reverse=False)
            else:
                sorted_f = sorted([f for f in qualified if f.get(s_name) is not None],
                                  key=lambda x: x.get(s_name) or 0, reverse=True)

            out = []
            for i, f in enumerate(sorted_f[:lim]):
                out.append({
                    'rank': i + 1,
                    'id': f.get('id'),
                    'name': f.get('name'),
                    'value': f.get(s_name) if s_name != 'wins' else f.get('wins'),
                    'record': f.get('record', ''),
                    'division': f.get('division', ''),
                    'stance': f.get('stance', '')
                })
            return out

        # If specific stat requested, return the single-stat response format
        if stat:
            leaders = get_leaders_for_stat(stat, limit, min_fights)
            return jsonify({
                'stat': stat,
                'min_fights': min_fights,
                'leaders': leaders
            })

        # Otherwise return all categories for the frontend dashboard
        return jsonify({
            'Striking (SLpM)': get_leaders_for_stat('slpm', limit, min_fights),
            'Strike Accuracy': get_leaders_for_stat('str_acc', limit, min_fights),
            'Takedowns (Avg)': get_leaders_for_stat('td_avg', limit, min_fights),
            'Takedown Defense': get_leaders_for_stat('td_def', limit, min_fights),
            'Submissions': get_leaders_for_stat('sub_avg', limit, min_fights),
            'Total Wins': get_leaders_for_stat('wins', limit, 1),
            'Strike Defense': get_leaders_for_stat('str_def', limit, min_fights),
        })

    app.add_url_rule('/api/ufc/stats/leaders', 'ufc_stat_leaders', handle_stat_leaders, methods=['GET'])
    app.add_url_rule('/api/stats/leaders', 'stat_leaders', handle_stat_leaders, methods=['GET'])

    def handle_stats_overview():
        """Get overview statistics about the UFC database."""
        if OVERVIEW:
            return jsonify(OVERVIEW)
        # Compute if not loaded
        stances = {
            'orthodox': len([f for f in FIGHTERS if f.get('stance', '').lower() == 'orthodox']),
            'southpaw': len([f for f in FIGHTERS if f.get('stance', '').lower() == 'southpaw']),
            'switch': len([f for f in FIGHTERS if f.get('stance', '').lower() == 'switch']),
        }
        return jsonify({
            'total_fighters': len(FIGHTERS),
            'total_events': len(EVENTS),
            'total_fights': len(FIGHTS),
            'champions': len([f for f in FIGHTERS if f.get('is_champion')]),
            'last_updated': datetime.utcnow().isoformat(),
            'stances': stances
        })

    app.add_url_rule('/api/ufc/stats/overview', 'ufc_stats_overview', handle_stats_overview, methods=['GET'])
    app.add_url_rule('/api/stats/overview', 'stats_overview', handle_stats_overview, methods=['GET'])

    # -----------------------------------------------------------------------
    # 5. RANKINGS & HISTORY
    # -----------------------------------------------------------------------

    def handle_ufc_rankings():
        """Fetch live official rankings by weight class from ESPN MMA API."""
        try:
            data = cache.get_with_swr('ufc:rankings', compute_ufc_rankings, ttl=3600, swr_ttl=86400)
            return jsonify(data or {})
        except Exception as e:
            print("ERROR ufc rankings:", e)
            return jsonify({})

    app.add_url_rule('/api/ufc/rankings', 'ufc_rankings', handle_ufc_rankings, methods=['GET'])
    app.add_url_rule('/api/rankings', 'rankings', handle_ufc_rankings, methods=['GET'])

    @app.route('/api/ufc/history')
    def ufc_history():
        history = [
            {'year': '2026', 'events': 44, 'titleFights': 14, 'highlight': 'Next generation championship era'},
            {'year': '2025', 'events': 42, 'titleFights': 13, 'highlight': 'Global stadium tour and international title defenses'},
            {'year': '2024', 'events': 42, 'titleFights': 14, 'highlight': 'Historic UFC 300 milestone event in Las Vegas'},
            {'year': '2023', 'events': 42, 'titleFights': 15, 'highlight': 'Islam Makhachev & Jon Jones pound-for-pound dominance'},
            {'year': '2022', 'events': 42, 'titleFights': 14, 'highlight': 'Israel Adesanya & Leon Edwards iconic title moments'},
            {'year': '2021', 'events': 41, 'titleFights': 16, 'highlight': 'Kamaru Usman welterweight reign'},
            {'year': '2020', 'events': 37, 'titleFights': 11, 'highlight': 'COVID-era "Fight Island" events in Abu Dhabi'},
            {'year': '2019', 'events': 42, 'titleFights': 14, 'highlight': 'Jorge Masvidal BMF title & fastest KO in history'},
            {'year': '2018', 'events': 39, 'titleFights': 14, 'highlight': 'Khabib vs McGregor UFC 229 record PPV'},
            {'year': '2017', 'events': 38, 'titleFights': 12, 'highlight': 'UFC debut on ESPN networks'},
            {'year': '2016', 'events': 40, 'titleFights': 15, 'highlight': 'Conor McGregor simultaneous double champion'},
        ]
        return jsonify(history)

    # -----------------------------------------------------------------------
    # Prewarm tasks
    # -----------------------------------------------------------------------
    def prewarm_ufc():
        tasks = [
            ('ufc:events', compute_ufc_events, 60, 600),
            ('ufc:fighters', compute_ufc_fighters, 1800, 86400),
            ('ufc:rankings', compute_ufc_rankings, 3600, 86400),
        ]
        for key, fn, ttl, swr_ttl in tasks:
            try:
                val = fn()
                if val:
                    cache.set(key, val, ttl=ttl, swr_ttl=swr_ttl)
            except Exception as e:
                print(f"[PREWARM-UFC] Notice: could not pre-warm {key}: {e}")

    return prewarm_ufc

"""
Build UFC Data from HuggingFace and ESPN
Creates clean, optimized local JSON datasets for the UFC Stats API:
- backend/data/ufc/fighters.json
- backend/data/ufc/events.json
- backend/data/ufc/fights.json
- backend/data/ufc/overview.json
"""
import os
import json
import re
import urllib.request

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', 'data', 'ufc')
os.makedirs(DATA_DIR, exist_ok=True)

def parse_height(h):
    if not h:
        return None
    try:
        val = float(h)
        feet = int(val // 12)
        inches = int(round(val % 12))
        return f"{feet}' {inches}\""
    except:
        return str(h)

def parse_weight(w):
    if not w:
        return None
    try:
        return f"{int(round(float(w)))} lbs."
    except:
        return str(w)

def parse_reach(r):
    if not r:
        return None
    try:
        return f"{int(round(float(r)))}\""
    except:
        return str(r)

def parse_pct(val):
    if not val:
        return 0.0
    try:
        if isinstance(val, str) and '%' in val:
            return round(float(val.replace('%', '').strip()) / 100.0, 2)
        v = float(val)
        return round(v / 100.0, 2) if v > 1.0 else round(v, 2)
    except:
        return 0.0

def parse_float(val):
    if not val or val == '--':
        return 0.0
    try:
        return round(float(val), 2)
    except:
        return 0.0

def build_fighters():
    print("[1/3] Downloading HuggingFace UFC fighters dataset...")
    url = 'https://huggingface.co/datasets/tawhidmonowar/ufc-fighters-stats-and-records-dataset/resolve/main/ufc_fighters_stats_and_records.json'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    raw_data = json.loads(urllib.request.urlopen(req, timeout=40).read().decode('utf-8'))
    print(f"Downloaded {len(raw_data)} fighters.")

    fighters = []
    seen_ids = set()

    for item in raw_data:
        about = item.get('about', {})
        stats = item.get('stats', {})
        record = item.get('record', {})

        name = about.get('name', '').strip()
        if not name:
            continue

        raw_id = about.get('id', '') or name.lower().replace(' ', '-').replace("'", '')
        # Ensure unique ID
        fid = raw_id
        counter = 1
        while fid in seen_ids:
            fid = f"{raw_id}-{counter}"
            counter += 1
        seen_ids.add(fid)

        # Parse Record
        wld = record.get('wld', '')
        m = re.match(r'(\d+)-(\d+)-(\d+)', wld)
        if m:
            wins, losses, draws = int(m.group(1)), int(m.group(2)), int(m.group(3))
            rec_str = f"{wins}-{losses}-{draws}"
        else:
            wins, losses, draws = 0, 0, 0
            rec_str = "0-0-0"

        # Division / weight class
        raw_div = about.get('division', '')
        div = raw_div.replace(' Division', '').strip() if raw_div else 'UFC'

        # Accuracy calculations
        sl_landed = parse_float(stats.get('Sig. Strikes Landed'))
        sl_att = parse_float(stats.get('Sig. Strikes Attempted'))
        str_acc = round(sl_landed / sl_att, 2) if sl_att > 0 else 0.0

        td_landed = parse_float(stats.get('Takedowns Landed'))
        td_att = parse_float(stats.get('Takedowns Attempted'))
        td_acc = round(td_landed / td_att, 2) if td_att > 0 else 0.0

        slpm = parse_float(stats.get('Sig. Str. Landed Per Min'))
        sapm = parse_float(stats.get('Sig. Str. Absorbed Per Min'))
        str_def = parse_pct(stats.get('Sig. Str. Defense'))
        td_avg = parse_float(stats.get('Takedown avg Per 15 Min'))
        td_def = parse_pct(stats.get('Takedown Defense'))
        sub_avg = parse_float(stats.get('Submission avg Per 15 Min'))

        # Stance / fighting style
        fighting_style = about.get('Fighting style', '')
        stance = 'Orthodox'
        if 'Southpaw' in fighting_style or 'Southpaw' in name:
            stance = 'Southpaw'
        elif 'Switch' in fighting_style:
            stance = 'Switch'

        is_champ = bool(record.get('Former Champion') or 'Champion' in record.get('Former Champion', ''))

        fighter = {
            'id': fid,
            'name': name,
            'nickname': about.get('nickname', ''),
            'record': rec_str,
            'wins': wins,
            'losses': losses,
            'draws': draws,
            'division': div,
            'weight_class': div,
            'height': parse_height(about.get('Height')),
            'weight': parse_weight(about.get('Weight')),
            'reach': parse_reach(about.get('Reach')),
            'stance': stance,
            'fighting_style': fighting_style or 'Mixed Martial Arts',
            'status': about.get('Status', 'Active'),
            'age': about.get('Age'),
            'country': about.get('Place of Birth', ''),
            'slpm': slpm,
            'str_acc': str_acc,
            'sapm': sapm,
            'str_def': str_def,
            'td_avg': td_avg,
            'td_acc': td_acc,
            'td_def': td_def,
            'sub_avg': sub_avg,
            'is_champion': is_champ,
            'fights': item.get('fight history', [])
        }
        fighters.append(fighter)

    # Save fighters.json
    fighters_path = os.path.join(DATA_DIR, 'fighters.json')
    with open(fighters_path, 'w', encoding='utf-8') as f:
        json.dump(fighters, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(fighters)} fighters to {fighters_path}")
    return fighters

def build_events_and_fights():
    print("[2/3] Fetching UFC events from ESPN...")
    events = []
    fights = []
    seen_events = set()

    # Query multiple years to get comprehensive events
    years = [2026, 2025, 2024, 2023]
    for year in years:
        url = f"https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard?dates={year}&limit=100"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            data = json.loads(urllib.request.urlopen(req, timeout=15).read().decode('utf-8'))
            raw_events = data.get('events', [])
            print(f"  Found {len(raw_events)} events for {year}")

            for ev in raw_events:
                eid = str(ev.get('id'))
                if eid in seen_events:
                    continue
                seen_events.add(eid)

                status_name = ev.get('status', {}).get('type', {}).get('name', '')
                status = 'UPCOMING'
                if status_name == 'STATUS_FINAL' or ev.get('status', {}).get('type', {}).get('completed'):
                    status = 'COMPLETED'
                elif status_name in ('STATUS_CANCELED', 'STATUS_POSTPONED'):
                    status = status_name.replace('STATUS_', '')
                elif ev.get('status', {}).get('type', {}).get('state') == 'in':
                    status = 'LIVE'

                bouts = []
                for comp in ev.get('competitions', []):
                    competitors = comp.get('competitors', [])
                    if len(competitors) < 2:
                        continue
                    c1 = competitors[0]
                    c2 = competitors[1]

                    bout_status = comp.get('status', {}).get('type', {})
                    detail = bout_status.get('detail', '')
                    method = comp.get('status', {}).get('result', {}).get('name', '')
                    rnd = comp.get('status', {}).get('period', 0)
                    clock = comp.get('status', {}).get('displayClock', '')

                    f1_info = {
                        'id': c1.get('athlete', {}).get('id', c1.get('id', '')),
                        'name': c1.get('athlete', {}).get('displayName', c1.get('team', {}).get('name', 'TBD')),
                        'winner': c1.get('winner', False),
                        'record': c1.get('record', ''),
                        'photoUrl': c1.get('athlete', {}).get('headshot', {}).get('href', ''),
                    }
                    f2_info = {
                        'id': c2.get('athlete', {}).get('id', c2.get('id', '')),
                        'name': c2.get('athlete', {}).get('displayName', c2.get('team', {}).get('name', 'TBD')),
                        'winner': c2.get('winner', False),
                        'record': c2.get('record', ''),
                        'photoUrl': c2.get('athlete', {}).get('headshot', {}).get('href', ''),
                    }

                    bout = {
                        'id': str(comp.get('id', f"{eid}-{len(bouts)+1}")),
                        'weightClass': comp.get('type', {}).get('text', ''),
                        'fighter1': f1_info,
                        'fighter2': f2_info,
                        'result': detail,
                        'method': method,
                        'round': rnd,
                        'time': clock,
                    }
                    bouts.append(bout)

                    # Also add to fights collection
                    fight_item = {
                        'id': str(comp.get('id', f"{eid}-{len(bouts)}")),
                        'event_id': eid,
                        'event_name': ev.get('name', ''),
                        'date': ev.get('date', '').split('T')[0],
                        'weight_class': comp.get('type', {}).get('text', ''),
                        'fighter1': f1_info,
                        'fighter2': f2_info,
                        'method': method or detail,
                        'round': rnd,
                        'time': clock,
                        'totals': {
                            'fighter1': {'fighter': f1_info['name'], 'winner': f1_info['winner']},
                            'fighter2': {'fighter': f2_info['name'], 'winner': f2_info['winner']},
                        }
                    }
                    fights.append(fight_item)

                venue_name = 'UFC Arena'
                venue_loc = ''
                if ev.get('competitions') and ev['competitions'][0].get('venue'):
                    v = ev['competitions'][0]['venue']
                    venue_name = v.get('fullName', 'UFC Arena')
                    city = v.get('address', {}).get('city', '')
                    country = v.get('address', {}).get('country', '')
                    venue_loc = f"{city}, {country}".strip(', ')

                event_obj = {
                    'id': eid,
                    'name': ev.get('name', 'UFC Event'),
                    'shortName': ev.get('shortName', ''),
                    'date': ev.get('date', '').split('T')[0],
                    'venue': venue_name,
                    'location': venue_loc,
                    'status': status,
                    'bouts': bouts,
                    'fightCard': bouts
                }
                events.append(event_obj)
        except Exception as e:
            print(f"  Error fetching events for {year}: {e}")

    # Sort events by date descending
    events.sort(key=lambda x: x.get('date', ''), reverse=True)

    events_path = os.path.join(DATA_DIR, 'events.json')
    with open(events_path, 'w', encoding='utf-8') as f:
        json.dump(events, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(events)} events to {events_path}")

    fights_path = os.path.join(DATA_DIR, 'fights.json')
    with open(fights_path, 'w', encoding='utf-8') as f:
        json.dump(fights, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(fights)} fights to {fights_path}")

    return events, fights

def build_overview(fighters, events, fights):
    print("[3/3] Building database overview stats...")
    stances = {
        'orthodox': len([f for f in fighters if f.get('stance', '').lower() == 'orthodox']),
        'southpaw': len([f for f in fighters if f.get('stance', '').lower() == 'southpaw']),
        'switch': len([f for f in fighters if f.get('stance', '').lower() == 'switch'])
    }
    overview = {
        'total_fighters': len(fighters),
        'total_events': len(events),
        'total_fights': len(fights),
        'champions': len([f for f in fighters if f.get('is_champion')]),
        'last_updated': '2026-10-18T22:30:00Z',
        'stances': stances
    }
    overview_path = os.path.join(DATA_DIR, 'overview.json')
    with open(overview_path, 'w', encoding='utf-8') as f:
        json.dump(overview, f, indent=2, ensure_ascii=False)
    print(f"Saved overview to {overview_path}")

if __name__ == '__main__':
    fighters = build_fighters()
    events, fights = build_events_and_fights()
    build_overview(fighters, events, fights)
    print("All UFC data successfully generated!")

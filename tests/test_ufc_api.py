"""
Test UFC Stats API endpoints
"""
import pytest
from backend.app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_ufc_fighters_list(client):
    res = client.get('/api/ufc/fighters?limit=5')
    assert res.status_code == 200
    data = res.get_json()
    assert 'data' in data
    assert len(data['data']) <= 5
    assert data['total'] > 1000

def test_fighters_search_and_filter(client):
    res = client.get('/api/ufc/fighters?search=mcgregor')
    assert res.status_code == 200
    data = res.get_json()
    assert len(data['data']) >= 1
    assert any('McGregor' in f['name'] for f in data['data'])

def test_fighter_details(client):
    res = client.get('/api/ufc/fighters/conor-mcgregor')
    assert res.status_code == 200
    fighter = res.get_json()
    assert 'Conor McGregor' in fighter['name']
    assert 'slpm' in fighter
    assert 'record' in fighter

def test_fighter_stats(client):
    res = client.get('/api/ufc/fighters/conor-mcgregor/stats')
    assert res.status_code == 200
    stats = res.get_json()
    assert 'striking' in stats
    assert 'grappling' in stats
    assert stats['striking']['slpm'] > 0

def test_fighter_compare(client):
    res = client.get('/api/ufc/fighters/compare?fighter1=conor-mcgregor&fighter2=dustin-poirier')
    assert res.status_code == 200
    comp = res.get_json()
    assert 'stats_comparison' in comp
    assert 'advantages' in comp

def test_events_list(client):
    res = client.get('/api/ufc/events?limit=5')
    assert res.status_code == 200
    data = res.get_json()
    assert len(data) > 0 or (isinstance(data, dict) and len(data.get('data', [])) > 0)

def test_fights_list(client):
    res = client.get('/api/ufc/fights?limit=5')
    assert res.status_code == 200
    data = res.get_json()
    assert 'data' in data
    assert len(data['data']) <= 5

def test_stats_leaders_single(client):
    res = client.get('/api/ufc/stats/leaders?stat=slpm&limit=5')
    assert res.status_code == 200
    data = res.get_json()
    assert data['stat'] == 'slpm'
    assert len(data['leaders']) <= 5

def test_stats_overview(client):
    res = client.get('/api/ufc/stats/overview')
    assert res.status_code == 200
    data = res.get_json()
    assert data['total_fighters'] > 1000
    assert 'stances' in data

def test_events_list_default_returns_archive(client):
    res = client.get('/api/ufc/events')
    assert res.status_code == 200
    data = res.get_json()
    assert isinstance(data, list)
    assert len(data) >= 200
    completed = [e for e in data if e.get('status') == 'COMPLETED']
    assert len(completed) >= 200
    first_bouts = completed[0].get('bouts', [])
    assert len(first_bouts) > 0
    # Winner boolean is present
    f1 = first_bouts[0]['fighter1']
    f2 = first_bouts[0]['fighter2']
    assert 'winner' in f1 and 'winner' in f2

def test_fighter_details_includes_fight_history(client):
    res = client.get('/api/ufc/fighters/charles-oliveira')
    assert res.status_code == 200
    data = res.get_json()
    assert 'fights' in data
    assert len(data['fights']) > 0
    first_fight = data['fights'][0]
    assert 'result' in first_fight
    assert 'opponent' in first_fight
    assert 'event' in first_fight

def test_fights_search_by_year_and_query(client):
    res = client.get('/api/ufc/fights?year=2024&limit=10')
    assert res.status_code == 200
    data = res.get_json()
    assert len(data['data']) > 0
    assert all(f.get('date', '').startswith('2024') for f in data['data'])

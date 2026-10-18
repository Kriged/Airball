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

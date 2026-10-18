"""
Tests for BallDontLie NBA Stats API integration
"""
import pytest
from backend.app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_bdl_status(client):
    res = client.get('/api/nba/balldontlie/status')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'active'
    assert data['provider'] == 'BallDontLie'
    assert data['api_version'] == 'v1'
    assert '3dd6' in data['api_key']

def test_bdl_teams(client):
    res = client.get('/api/nba/balldontlie/teams')
    assert res.status_code == 200
    teams = res.get_json()
    assert len(teams) >= 30
    assert any(t.get('abbreviation') == 'LAL' for t in teams)
    assert any(t.get('abbreviation') == 'BOS' for t in teams)

def test_bdl_players(client):
    res = client.get('/api/nba/balldontlie/players?per_page=5')
    assert res.status_code == 200
    data = res.get_json()
    assert 'data' in data
    assert len(data['data']) > 0
    p = data['data'][0]
    assert 'name' in p
    assert 'team' in p
    assert 'pos' in p

def test_bdl_player_search(client):
    res = client.get('/api/nba/balldontlie/players?search=Curry')
    assert res.status_code == 200
    data = res.get_json()
    assert len(data['data']) >= 1
    names = [p['name'] for p in data['data']]
    assert any('Curry' in n for n in names)

def test_bdl_player_detail(client):
    res = client.get('/api/nba/players/237')
    assert res.status_code == 200
    p = res.get_json()
    assert 'LeBron' in p['name']
    assert p['draft_year'] == 2003

def test_nba_players_search_route(client):
    res = client.get('/api/players?search=LeBron')
    assert res.status_code == 200
    players = res.get_json()
    assert len(players) >= 1
    assert any('LeBron' in p['name'] for p in players)

def test_bdl_games(client):
    res = client.get('/api/nba/balldontlie/games?per_page=2')
    assert res.status_code == 200
    data = res.get_json()
    assert 'data' in data

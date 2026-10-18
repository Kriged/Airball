"""
Tests for API-Sports NFL Adapter
"""
import pytest
from backend.app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_nfl_apisports_status(client):
    res = client.get('/api/nfl/apisports/status')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'active'
    assert data['provider'] == 'API-Sports'
    assert 'd0b5' in data['api_key']

def test_nfl_apisports_teams(client):
    res = client.get('/api/nfl/apisports/teams')
    assert res.status_code == 200
    teams = res.get_json()
    assert len(teams) >= 30
    assert any(t.get('code') == 'KC' for t in teams)
    assert any(t.get('code') == 'SF' for t in teams)

def test_nfl_apisports_standings(client):
    res = client.get('/api/nfl/apisports/standings')
    assert res.status_code == 200
    standings = res.get_json()
    assert 'AFC' in standings
    assert 'NFC' in standings
    assert len(standings['AFC']) > 0
    assert len(standings['NFC']) > 0

def test_nfl_apisports_games(client):
    res = client.get('/api/nfl/apisports/games?limit=3')
    assert res.status_code == 200
    games = res.get_json()
    assert isinstance(games, list)
    if games:
        g = games[0]
        assert 'home' in g
        assert 'away' in g
        assert 'status' in g

def test_nfl_apisports_player_search(client):
    res = client.get('/api/nfl/apisports/players?search=Mahomes')
    assert res.status_code == 200
    players = res.get_json()
    assert len(players) >= 1
    assert any('Mahomes' in p['name'] for p in players)

def test_nfl_players_route_with_search(client):
    res = client.get('/api/nfl/players?search=Mahomes')
    assert res.status_code == 200
    players = res.get_json()
    assert len(players) >= 1
    assert any('Mahomes' in p['name'] for p in players)

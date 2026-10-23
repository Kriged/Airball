import pytest
from backend.app import app
from backend.adapters.espn_nba import compute_today_games


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as c:
        yield c


def test_nba_games_ist_today():
    """On 2026-10-23 in IST, games played Thursday night US (Friday morning IST) should appear."""
    games = compute_today_games(None, date_str='2026-10-23', tz_name='Asia/Kolkata')
    assert isinstance(games, list)
    game_names = [f"{g['away']} vs {g['home']}" for g in games]
    # Cavaliers at 76ers and Nuggets at Thunder occurred Friday morning IST
    assert any('76ers' in name or 'Cavaliers' in name for name in game_names)
    assert any('Thunder' in name or 'Nuggets' in name for name in game_names)


def test_nba_games_ist_tomorrow():
    """On 2026-10-24 in IST, games played Friday night US (Saturday morning IST) should appear."""
    games = compute_today_games(None, date_str='2026-10-24', tz_name='Asia/Kolkata')
    assert isinstance(games, list)
    game_names = [f"{g['away']} vs {g['home']}" for g in games]
    assert any('Bucks' in name or 'Bulls' in name for name in game_names)
    assert any('Celtics' in name or 'Knicks' in name for name in game_names)


def test_nba_games_us_eastern():
    """In US Eastern, Friday night games belong to 2026-10-23 and Thursday night to 2026-10-22."""
    games_today = compute_today_games(None, date_str='2026-10-23', tz_name='America/New_York')
    games_yesterday = compute_today_games(None, date_str='2026-10-22', tz_name='America/New_York')

    today_names = [f"{g['away']} vs {g['home']}" for g in games_today]
    yesterday_names = [f"{g['away']} vs {g['home']}" for g in games_yesterday]

    assert any('Bucks' in name or 'Bulls' in name for name in today_names)
    assert any('76ers' in name or 'Cavaliers' in name for name in yesterday_names)


def test_nba_today_endpoint_with_tz(client):
    """Verify Flask endpoint accepts ?date= and ?tz= params."""
    res = client.get('/api/games/today?date=2026-10-23&tz=Asia/Kolkata')
    assert res.status_code == 200
    data = res.get_json()
    assert isinstance(data, list)
    assert len(data) >= 1

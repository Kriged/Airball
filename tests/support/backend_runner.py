"""Test-only bridge that runs Flask adapter code with a mocked HTTP session.

It is launched by the Vitest suite.  All HTTP clients used by the selected
adapter are replaced before invoking production code, so this helper never
contacts ESPN or TheSportsDB.
"""
import json
import sys
import threading
import time
from pathlib import Path

import requests
from flask import Flask


ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "tests" / "fixtures"
sys.path.insert(0, str(ROOT))


class MockResponse:
    def __init__(self, payload=None, error=None, status_error=None):
        self.payload = payload
        self.error = error
        self.status_error = status_error

    def json(self):
        if self.error:
            raise self.error
        return self.payload

    def raise_for_status(self):
        if self.status_error:
            raise self.status_error


def fixture(path):
    return json.loads((FIXTURES / path).read_text(encoding="utf-8"))


def load_adapter(sport):
    if sport == "nba":
        import backend.adapters.espn_nba as adapter
        return adapter, adapter.compute_today_games
    if sport == "nfl":
        import backend.adapters.espn_nfl as adapter
        return adapter, adapter.compute_nfl_today_games
    if sport == "ufc":
        import backend.adapters.espn_ufc as adapter
        return adapter, adapter.compute_ufc_events
    raise ValueError(f"Unknown sport: {sport}")


def scoreboard(sport, fixture_name):
    adapter, compute = load_adapter(sport)
    payload = fixture(f"edge_cases/{fixture_name}")
    calls = []

    def get(url, **kwargs):
        calls.append({"url": url, "timeout": kwargs.get("timeout")})
        return MockResponse(payload)

    adapter.session.get = get
    return {"result": compute(None) if sport == "nba" else compute(), "calls": calls}


def failed_route(sport, failure, has_cache):
    from backend.core.cache import Cache

    adapter, _ = load_adapter(sport)
    app = Flask(__name__)
    local_cache = Cache()
    adapter.register_routes(app, local_cache)
    config = {
        "timeout": requests.Timeout("mock timeout"),
        "429": requests.HTTPError("429 mocked"),
        "500": requests.HTTPError("500 mocked"),
        "malformed": json.JSONDecodeError("bad JSON", "{bad", 1),
    }
    error = config[failure]

    def get(*_args, **_kwargs):
        if failure == "malformed":
            return MockResponse(error=error)
        raise error

    adapter.session.get = get
    if has_cache:
        keys = {"nba": "nba:today_games", "nfl": "nfl:today_games", "ufc": "ufc:events"}
        stale = [{"id": "cached", "source": "last-good-response"}]
        # A zero soft TTL intentionally exercises stale-while-revalidate.
        local_cache.set(keys[sport], stale, ttl=0, swr_ttl=30)

    endpoints = {"nba": "/api/nba/games/today", "nfl": "/api/nfl/games/today", "ufc": "/api/ufc/events"}
    response = app.test_client().get(endpoints[sport])
    return {"status": response.status_code, "body": response.get_json()}


def cache_case(case):
    from backend.core.cache import Cache

    cache = Cache()
    calls = 0
    counter_lock = threading.Lock()

    def compute():
        nonlocal calls
        with counter_lock:
            calls += 1
            current = calls
        if case == "concurrent":
            time.sleep(0.05)
        return {"call": current}

    if case == "fresh":
        first = cache.get_with_swr("scoreboard", compute, ttl=60, swr_ttl=60)
        second = cache.get_with_swr("scoreboard", compute, ttl=60, swr_ttl=60)
        return {"calls": calls, "results": [first, second]}
    if case == "expired":
        first = cache.get_with_swr("scoreboard", compute, ttl=0, swr_ttl=0)
        second = cache.get_with_swr("scoreboard", compute, ttl=0, swr_ttl=0)
        return {"calls": calls, "results": [first, second]}
    if case == "concurrent":
        barrier = threading.Barrier(50)
        results = []

        def read():
            barrier.wait()
            results.append(cache.get_with_swr("scoreboard", compute, ttl=60, swr_ttl=60))

        threads = [threading.Thread(target=read) for _ in range(50)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        return {"calls": calls, "results": results}
    raise ValueError(f"Unknown cache case: {case}")


def logo_case(case):
    import backend.adapters.thesportsdb as adapter

    if case == "no-logo":
        payload = fixture("edge_cases/thesportsdb_no_logo.json")
        adapter._session.get = lambda *_args, **_kwargs: MockResponse(payload)
    elif case == "404":
        adapter._session.get = lambda *_args, **_kwargs: MockResponse(
            status_error=requests.HTTPError("404 mocked")
        )
    else:
        raise ValueError(f"Unknown logo case: {case}")
    return {"result": adapter._fetch_team_logo("Unknown Team")}


def main():
    action = sys.argv[1]
    if action == "scoreboard":
        output = scoreboard(sys.argv[2], sys.argv[3])
    elif action == "failed-route":
        output = failed_route(sys.argv[2], sys.argv[3], sys.argv[4] == "cached")
    elif action == "cache":
        output = cache_case(sys.argv[2])
    elif action == "logo":
        output = logo_case(sys.argv[2])
    else:
        raise ValueError(f"Unknown action: {action}")
    print(json.dumps(output))


if __name__ == "__main__":
    main()

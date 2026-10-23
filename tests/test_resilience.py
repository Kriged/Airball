import time

import pytest

from backend.app import app
from backend.core.cache import cache
from backend.core.provider_client import (
    ProviderCircuitOpenError,
    ProviderRateLimitedError,
    fetch_with_circuit_breaker,
)


class RateLimitedResponse:
    status_code = 429
    headers = {"Retry-After": "60"}

    def raise_for_status(self):
        raise AssertionError("A 429 must be handled before raise_for_status")


class CountingSession:
    def __init__(self):
        self.calls = 0

    def get(self, *_args, **_kwargs):
        self.calls += 1
        return RateLimitedResponse()


def test_rate_limit_is_fail_fast_and_opens_circuit():
    provider = "test-rate-limit"
    cache.clear_cooldown(provider)
    session = CountingSession()

    start = time.monotonic()
    with pytest.raises(ProviderRateLimitedError):
        fetch_with_circuit_breaker(provider, "https://example.test/scoreboard", request_session=session)
    assert time.monotonic() - start < 0.05

    with pytest.raises(ProviderCircuitOpenError):
        fetch_with_circuit_breaker(provider, "https://example.test/scoreboard", request_session=session)
    assert session.calls == 1
    cache.clear_cooldown(provider)


def test_edge_cache_headers_and_error_no_store():
    cache.set("nba:today_games", [], ttl=60, swr_ttl=300)
    cache.set("nba:standings", {}, ttl=60, swr_ttl=300)
    client = app.test_client()

    games = client.get("/api/nba/games/today")
    assert games.status_code == 200
    assert games.headers["Cache-Control"] == "public, max-age=15, s-maxage=45, stale-while-revalidate=300"

    standings = client.get("/api/nba/standings")
    assert standings.status_code == 200
    assert "s-maxage=1800" in standings.headers["Cache-Control"]
    assert "stale-while-revalidate=86400" in standings.headers["Cache-Control"]

    missing = client.get("/api/does-not-exist")
    assert missing.status_code == 404
    assert missing.headers["Cache-Control"] == "no-store"

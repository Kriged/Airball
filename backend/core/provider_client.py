import requests
import time
from requests.adapters import HTTPAdapter
from .cache import cache


class FailFastSession(requests.Session):
    """Session used by ESPN adapters that still call ``session.get`` directly."""
    provider_name = "espn"

    def request(self, method, url, **kwargs):
        now = time.time()
        if cache.cooldown_until(self.provider_name) > now:
            raise ProviderCircuitOpenError(f"{self.provider_name} circuit is open")

        # Adapter call sites historically supplied timeout=10. Clamp every call here
        # so one overlooked call cannot consume a serverless request's whole budget.
        kwargs["timeout"] = (2.0, 3.0)
        try:
            response = super().request(method, url, **kwargs)
        except requests.RequestException as error:
            cache.set_cooldown(self.provider_name, now + 15)
            raise ProviderUnavailableError(str(error)) from error

        if response.status_code in (402, 403, 429):
            cache.set_cooldown(self.provider_name, now + _retry_after_seconds(response))
            raise ProviderRateLimitedError(f"{self.provider_name} returned HTTP {response.status_code}")
        if response.status_code >= 500:
            cache.set_cooldown(self.provider_name, now + 15)
            raise ProviderUnavailableError(f"{self.provider_name} returned HTTP {response.status_code}")
        cache.clear_cooldown(self.provider_name)
        return response


# Persistent HTTP session with connection pooling. Retries are deliberately disabled:
# a serverless request must fall back quickly rather than sleeping through a quota error.
session = FailFastSession()
adapter = HTTPAdapter(
    pool_connections=20,
    pool_maxsize=40,
    max_retries=0,
)
session.mount('https://', adapter)
session.mount('http://', adapter)


ESPN_BASE = "https://site.api.espn.com/apis"
ESPN_WEB_BASE = "https://site.web.api.espn.com/apis"

# Sport path segments for ESPN API
SPORT_PATHS = {
    'nba': 'sports/basketball/nba',
    'nfl': 'sports/football/nfl',
    'ufc': 'sports/mma/ufc',
}


def espn_url(sport, endpoint, web=False):
    """Build an ESPN API URL for a given sport and endpoint."""
    base = ESPN_WEB_BASE if web else ESPN_BASE
    sport_path = SPORT_PATHS.get(sport, SPORT_PATHS['nba'])
    return f"{base}/{endpoint.lstrip('/')}" if '/' in endpoint and sport_path in endpoint else f"{base}/site/v2/{sport_path}/{endpoint}"


def espn_v2_url(sport, endpoint):
    """Build an ESPN v2 API URL (used for standings etc.)."""
    sport_path = SPORT_PATHS.get(sport, SPORT_PATHS['nba'])
    return f"{ESPN_BASE}/v2/{sport_path}/{endpoint}"


def espn_web_url(sport, endpoint):
    """Build an ESPN web API URL (used for statistics etc.)."""
    sport_path = SPORT_PATHS.get(sport, SPORT_PATHS['nba'])
    return f"{ESPN_WEB_BASE}/{endpoint.lstrip('/')}" if sport_path in endpoint else f"{ESPN_WEB_BASE}/common/v3/{sport_path}/{endpoint}"


class ProviderUnavailableError(requests.RequestException):
    """A provider is unavailable and callers should use stale or bundled data."""


class ProviderRateLimitedError(ProviderUnavailableError):
    """A provider explicitly rejected the request because of quota or access."""


class ProviderCircuitOpenError(ProviderUnavailableError):
    """The provider was recently unavailable; no network request was attempted."""


def _retry_after_seconds(response, default=60):
    try:
        return max(1, int(response.headers.get("Retry-After", default)))
    except (AttributeError, TypeError, ValueError):
        return default


def fetch_with_circuit_breaker(provider_name, url, *, request_session=None, headers=None,
                               params=None, timeout=(2.0, 3.0)):
    """Make one bounded request, with no retry sleeps and a persisted cooldown."""
    now = time.time()
    if cache.cooldown_until(provider_name) > now:
        raise ProviderCircuitOpenError(f"{provider_name} circuit is open")

    active_session = request_session or session
    try:
        response = active_session.get(url, headers=headers, params=params, timeout=timeout)
    except requests.RequestException as error:
        cache.set_cooldown(provider_name, now + 15)
        raise ProviderUnavailableError(str(error)) from error

    if response.status_code in (402, 403, 429):
        cache.set_cooldown(provider_name, now + _retry_after_seconds(response))
        raise ProviderRateLimitedError(f"{provider_name} returned HTTP {response.status_code}")
    if response.status_code >= 500:
        cache.set_cooldown(provider_name, now + 15)
        raise ProviderUnavailableError(f"{provider_name} returned HTTP {response.status_code}")

    response.raise_for_status()
    cache.clear_cooldown(provider_name)
    return response


def fetch_json(url, timeout=(2.0, 3.0)):
    """Fetch ESPN JSON through the same bounded, fail-fast policy."""
    return fetch_with_circuit_breaker("espn", url, timeout=timeout).json()

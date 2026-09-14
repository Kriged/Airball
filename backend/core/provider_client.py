import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Persistent HTTP session with connection pooling for low-latency calls to ESPN APIs
session = requests.Session()
retry_strategy = Retry(
    total=2,
    backoff_factor=0.3,
    status_forcelist=[500, 502, 503, 504],
    raise_on_status=False
)
adapter = HTTPAdapter(
    pool_connections=20,
    pool_maxsize=40,
    max_retries=retry_strategy
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


def fetch_json(url, timeout=10):
    """Fetch JSON from a URL with error handling."""
    response = session.get(url, timeout=timeout)
    response.raise_for_status()
    return response.json()

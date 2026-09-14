"""
Sport registry — maps sport slugs to their adapters.
Each adapter provides a register_routes(app, cache) function.
"""

from backend.adapters.espn_nba import register_routes as register_nba
from backend.adapters.espn_nfl import register_routes as register_nfl
from backend.adapters.espn_ufc import register_routes as register_ufc


SPORT_ADAPTERS = {
    'nba': register_nba,
    'nfl': register_nfl,
    'ufc': register_ufc,
}


def register_all_sports(app, cache):
    """Register all sport adapters' routes on the Flask app."""
    for sport, register_fn in SPORT_ADAPTERS.items():
        register_fn(app, cache)
        print(f"[REGISTRY] Registered {sport.upper()} routes")

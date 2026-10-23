"""
Airball Multi-Sport Backend
Thin orchestrator that registers sport adapters and shared routes.
"""
import time
import threading
import datetime
import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from backend.core.cache import cache
from backend.sports.registry import register_all_sports
from backend.adapters.thesportsdb import register_routes as register_tsdb

app = Flask(__name__)
CORS(app)


# Vercel's shared CDN performs stale-while-revalidate across all function
# instances. Keep browser freshness short so a tab can still see live scores.
EDGE_TTL_RULES = {
    "/games/today": (45, 300),
    "/standings": (1800, 86400),
    "/stats/": (1800, 86400),
    "/rankings": (3600, 86400),
    "/teams": (43200, 86400),
    "/fighters": (43200, 86400),
}


@app.after_request
def add_vercel_edge_cache_headers(response):
    """Make successful GET API results shareable by Vercel's Edge CDN."""
    if request.method == "GET" and response.status_code == 200:
        s_maxage, stale = 120, 600
        for pattern, values in EDGE_TTL_RULES.items():
            if pattern in request.path:
                s_maxage, stale = values
                break
        response.headers["Cache-Control"] = (
            f"public, max-age=15, s-maxage={s_maxage}, stale-while-revalidate={stale}"
        )
    elif response.status_code >= 400:
        # Error payloads must never become a CDN response for healthy callers.
        response.headers["Cache-Control"] = "no-store"
    return response


# Health check endpoint
@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'ok',
        'sports': ['nba', 'nfl', 'ufc'],
        'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat()
    })


# Register all sport adapters (NBA, NFL, UFC)
register_all_sports(app, cache)

# Register TheSportsDB logo/photo routes
_prewarm_tsdb = register_tsdb(app, cache)


def prewarm_cache():
    """Background thread to prewarm essential endpoints on startup."""
    time.sleep(0.5)
    # Import adapter prewarm functions via registry
    from backend.adapters.espn_nba import register_routes as reg_nba
    from backend.adapters.espn_nfl import register_routes as reg_nfl
    from backend.adapters.espn_ufc import register_routes as reg_ufc

    # The register_routes functions return prewarm functions
    # But since we already called them, we need to call compute functions directly
    from backend.adapters.espn_nba import compute_today_games, compute_stats_leaders, compute_games_list, compute_standings
    from backend.adapters.espn_nfl import compute_nfl_today_games, compute_nfl_games_list, compute_nfl_standings
    from backend.adapters.espn_ufc import compute_ufc_events, compute_ufc_fighters

    tasks = [
        # NBA
        ('nba:today_games', lambda: compute_today_games(cache), 20, 300),
        ('nba:stats_leaders', compute_stats_leaders, 1800, 86400),
        ('nba:games_list', compute_games_list, 300, 3600),
        ('nba:standings', compute_standings, 300, 3600),
        # NFL
        ('nfl:today_games', compute_nfl_today_games, 30, 300),
        ('nfl:games_list', compute_nfl_games_list, 300, 3600),
        ('nfl:standings', compute_nfl_standings, 300, 3600),
        # UFC
        ('ufc:events', compute_ufc_events, 60, 600),
        ('ufc:fighters', compute_ufc_fighters, 1800, 86400),
    ]
    for key, fn, ttl, swr_ttl in tasks:
        try:
            val = fn()
            if val:
                cache.set(key, val, ttl=ttl, swr_ttl=swr_ttl)
        except Exception as e:
            print(f"[PREWARM] Notice: could not pre-warm {key}: {e}")

    # Prewarm TheSportsDB logos after ESPN data is ready (logos are slow — 30+ calls)
    try:
        _prewarm_tsdb()
    except Exception as e:
        print(f"[PREWARM] Notice: TSDB logo prewarm failed: {e}")


# Background work cannot outlive a Vercel response. CDN SWR and the persisted
# cache cover production; local developers can opt into prewarming explicitly.
if os.getenv("AIRBALL_ENABLE_PREWARM") == "1" and not os.getenv("VERCEL"):
    threading.Thread(target=prewarm_cache, daemon=True).start()

# Disable debug mode for production safety; enable threaded mode
if __name__ == '__main__':
    app.run(debug=False, port=5000, threaded=True)

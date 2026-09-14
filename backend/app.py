"""
Airball Multi-Sport Backend
Thin orchestrator that registers sport adapters and shared routes.
"""
import time
import threading
import datetime
from flask import Flask, jsonify
from flask_cors import CORS
from backend.core.cache import cache
from backend.sports.registry import register_all_sports

app = Flask(__name__)
CORS(app)


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


threading.Thread(target=prewarm_cache, daemon=True).start()

# Disable debug mode for production safety; enable threaded mode
if __name__ == '__main__':
    app.run(debug=False, port=5000, threaded=True)

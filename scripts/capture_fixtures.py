import os
import json
import time
import requests

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "..", "tests", "fixtures", "raw")
os.makedirs(FIXTURES_DIR, exist_ok=True)

ENDPOINTS = {
    "nba_scoreboard": "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
    "nfl_scoreboard": "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
    "ufc_scoreboard": "https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard",
}

def capture():
    print(f"Capturing live ESPN responses to {FIXTURES_DIR}...")
    for name, url in ENDPOINTS.items():
        try:
            print(f"Fetching {name}...")
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            
            filepath = os.path.join(FIXTURES_DIR, f"{name}.json")
            with open(filepath, "w") as f:
                json.dump(data, f, indent=2)
            print(f"Saved {name}.json")
            
            time.sleep(1) # Be gentle
        except Exception as e:
            print(f"Failed to capture {name}: {e}")

if __name__ == "__main__":
    capture()

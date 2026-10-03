import os
import json
import copy

BASE_DIR = os.path.dirname(__file__)
RAW_DIR = os.path.join(BASE_DIR, "..", "tests", "fixtures", "raw")
OUT_DIR = os.path.join(BASE_DIR, "..", "tests", "fixtures", "edge_cases")
os.makedirs(OUT_DIR, exist_ok=True)

def load_raw(sport):
    with open(os.path.join(RAW_DIR, f"{sport}_scoreboard.json"), "r") as f:
        return json.load(f)

def save_fixture(sport, name, data):
    with open(os.path.join(OUT_DIR, f"{sport}_{name}.json"), "w") as f:
        json.dump(data, f, indent=2)

def mutate_status(event, status_name, state_name, detail=""):
    event["status"]["type"]["name"] = status_name
    event["status"]["type"]["state"] = state_name
    event["status"]["type"]["detail"] = detail

def generate_nba_fixtures():
    raw = load_raw("nba")
    
    # 1. Empty Scoreboard
    empty = copy.deepcopy(raw)
    empty["events"] = []
    save_fixture("nba", "empty", empty)
    
    if not raw.get("events"):
        return # Cannot generate mutations if no raw events
        
    base_event = raw["events"][0]
    
    # Scheduled
    d = copy.deepcopy(raw)
    mutate_status(d["events"][0], "STATUS_SCHEDULED", "pre", "Scheduled")
    save_fixture("nba", "scheduled", d)
    
    # Live
    d = copy.deepcopy(raw)
    mutate_status(d["events"][0], "STATUS_IN_PROGRESS", "in", "3rd Quarter")
    save_fixture("nba", "live", d)
    
    # Halftime
    d = copy.deepcopy(raw)
    mutate_status(d["events"][0], "STATUS_HALFTIME", "in", "Halftime")
    save_fixture("nba", "halftime", d)
    
    # Final
    d = copy.deepcopy(raw)
    mutate_status(d["events"][0], "STATUS_FINAL", "post", "Final")
    save_fixture("nba", "final", d)
    
    # Postponed
    d = copy.deepcopy(raw)
    mutate_status(d["events"][0], "STATUS_POSTPONED", "post", "Postponed")
    save_fixture("nba", "postponed", d)
    
    # Delayed
    d = copy.deepcopy(raw)
    mutate_status(d["events"][0], "STATUS_DELAYED", "in", "Delayed")
    save_fixture("nba", "delayed", d)
    
    # Overtime
    d = copy.deepcopy(raw)
    mutate_status(d["events"][0], "STATUS_IN_PROGRESS", "in", "OT")
    d["events"][0]["status"]["period"] = 5
    save_fixture("nba", "overtime", d)
    
    # Missing/Null Scores, Clock, Odds
    d = copy.deepcopy(raw)
    d["events"][0]["competitions"][0]["competitors"][0]["score"] = None
    d["events"][0]["competitions"][0]["competitors"][1]["score"] = None
    d["events"][0]["status"]["displayClock"] = None
    if "odds" in d["events"][0]["competitions"][0]:
        del d["events"][0]["competitions"][0]["odds"]
    save_fixture("nba", "missing_data", d)
    
    # Timezone Crossing (Late US Start)
    # E.g. 11 PM EST = 4 AM UTC next day. Kolkata is UTC+5:30 -> 9:30 AM next day
    d = copy.deepcopy(raw)
    d["events"][0]["date"] = "2026-10-31T03:00Z" # 11PM EDT on Oct 30
    save_fixture("nba", "timezone_crossing", d)

def generate_nfl_fixtures():
    raw = load_raw("nfl")
    if not raw.get("events"):
        return
        
    # Regulation Clock
    d = copy.deepcopy(raw)
    mutate_status(d["events"][0], "STATUS_IN_PROGRESS", "in", "2nd Quarter")
    d["events"][0]["status"]["displayClock"] = "12:00"
    save_fixture("nfl", "live_regulation", d)
    
    # Overtime Clock
    d = copy.deepcopy(raw)
    mutate_status(d["events"][0], "STATUS_IN_PROGRESS", "in", "Overtime")
    d["events"][0]["status"]["period"] = 5
    d["events"][0]["status"]["displayClock"] = "05:00"
    save_fixture("nfl", "live_ot", d)
    
def generate_ufc_fixtures():
    raw = load_raw("ufc")
    if not raw.get("events"):
        return
        
    # Standard Card
    save_fixture("ufc", "standard", raw)
    
    # Cancelled Bout
    d = copy.deepcopy(raw)
    if "competitions" in d["events"][0] and len(d["events"][0]["competitions"]) > 0:
        d["events"][0]["competitions"][0]["status"]["type"]["name"] = "STATUS_CANCELED"
    save_fixture("ufc", "cancelled_bout", d)
    
    # Fighter Withdrawal / No Contest / Draw
    # For UFC, these are often represented in the status/result fields. 
    # We will simulate a Draw
    d = copy.deepcopy(raw)
    if "competitions" in d["events"][0]:
        bout = d["events"][0]["competitions"][0]
        bout["status"]["type"]["name"] = "STATUS_FINAL"
        for comp in bout["competitors"]:
            comp["winner"] = False # Neither wins in a draw
    save_fixture("ufc", "draw", d)

def create_malformed():
    with open(os.path.join(OUT_DIR, "malformed.json"), "w") as f:
        f.write("{ invalid json: [ missing quotes }")

if __name__ == "__main__":
    generate_nba_fixtures()
    generate_nfl_fixtures()
    generate_ufc_fixtures()
    create_malformed()
    print("Edge case fixtures generated.")

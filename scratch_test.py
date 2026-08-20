import urllib.request

url = 'http://127.0.0.1:5501/index.html'
print(f"Connecting to live server at {url}...")

try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        print("HTTP Status Code:", resp.status)
        content = resp.read().decode('utf-8')
        print(f"Total HTML Bytes Served: {len(content)} bytes")
        
        checks = {
            "Daily Tasks View": 'id="view-daily-tasks"',
            "Worship View": 'id="view-ibadah"',
            "Streak Tracker View": 'id="view-nofap"',
            "Exercise View": 'id="view-exercise"',
            "Exercise Hero Card": 'id="today-workout-hero"',
            "Exercise Settings Modal": 'id="exercise-settings-modal"',
            "Toast Container": 'id="toast-container"',
            "Service Worker v3": 'v=20260819_3'
        }
        
        print("\n--- Live Server Markup Checks ---")
        for key, val in checks.items():
            present = val in content
            status_str = "SUCCESS" if present else "FAILED"
            print(f"[{status_str}] {key}")

except Exception as err:
    print("Connection Error:", err)

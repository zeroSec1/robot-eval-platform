# Captures clean light-theme screenshots of every page for the user guide.
# Usage: python3 scripts/capture-guide-shots.py  (prod server must be on :3000)

import time
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent.parent / "guide-shots"
OUT.mkdir(exist_ok=True)

SHOTS = [
    ("overview", "/", None),
    ("episodes", "/episodes", None),
    ("episodes_filtered", "/episodes?failure=collision", None),
    ("episode_detail_real", "/episodes/shrimp_ep_00000", None),
    ("episode_detail_failure", "/episodes/pusht_ep_00008", None),
    ("compare", "/compare", None),
]

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=2)

    # Force light theme before any page script runs (print-friendly).
    page.add_init_script("try { localStorage.setItem('theme', 'light'); } catch (e) {}")

    for name, path, clip in SHOTS:
        page.goto(f"http://localhost:3000{path}", wait_until="networkidle")
        time.sleep(1.2)  # let videos fetch poster frames / charts settle
        page.screenshot(path=str(OUT / f"{name}.png"))
        print("captured", name)

    browser.close()

print("done →", OUT)

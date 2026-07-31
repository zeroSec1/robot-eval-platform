from playwright.sync_api import sync_playwright
import json

BASE = "http://localhost:3001"
TEL = json.load(open("./src/data/real-telemetry.json"))
results = []
def check(name, cond, info=""):
    results.append((name, bool(cond), info))

with sync_playwright() as p:
    for engine_name, engine in [("webkit", p.webkit), ("chromium", p.chromium)]:
        b = engine.launch()
        page = b.new_page(viewport={"width": 1280, "height": 950})

        # 1. failed episode from the user's screenshot: real anomaly 7.6s
        page.goto(f"{BASE}/episodes/pusht_ep_00172", wait_until="networkidle")
        chip = page.locator("text=/Anomaly at/").text_content()
        exp172 = TEL["pusht_ep_00172"]["anomalyS"]
        check(f"{engine_name}/ep172-real-chip", f"{exp172}s" in chip and "envelope" in chip, chip.strip())
        sub = page.locator("text=/real telemetry/").count()
        check(f"{engine_name}/ep172-real-label", sub == 1)
        names = page.evaluate("() => [...document.querySelectorAll('.font-mono.text-dim, .font-mono.text-\\\\[11px\\\\]')].map(e=>e.textContent.trim()).filter(t=>/coverage|speed|tracking/.test(t))")
        check(f"{engine_name}/ep172-real-tracks", set(names) >= {"coverage_reward","agent_speed","tracking_error"}, str(names))
        # red marker sits at 7.6/7.8 = ~97% of the track width
        pos = page.evaluate("""() => {
            const track = document.querySelector('.cursor-crosshair > div.relative');
            const marker = track.querySelector('div.absolute.w-px.bg-red');
            if (!marker) return null;
            const t = track.getBoundingClientRect(), m = marker.getBoundingClientRect();
            return (m.left - t.left) / t.width; }""")
        check(f"{engine_name}/ep172-marker-position", pos is not None and abs(pos - 7.6/7.8) < 0.03, f"marker at {pos:.0%}, expect ~{7.6/7.8:.0%}")
        # clicking the marker seeks the video near 7.6s
        box = page.locator(".cursor-crosshair").bounding_box()
        page.mouse.click(box["x"] + box["width"] * (7.6/7.8), box["y"] + box["height"]/2)
        page.wait_for_timeout(800)
        t = page.evaluate("() => document.querySelector('video').currentTime")
        check(f"{engine_name}/ep172-click-seeks", abs(t - 7.6) < 0.5, f"t={t:.2f}")

        # 2. second failure cross-check: 00016 real anomaly 12.4s (was fake 8.6s)
        page.goto(f"{BASE}/episodes/pusht_ep_00016", wait_until="networkidle")
        chip = page.locator("text=/Anomaly at/").text_content()
        exp016 = TEL["pusht_ep_00016"]["anomalyS"]
        check(f"{engine_name}/ep016-matches-data", f"{exp016}s" in chip, chip.strip())

        # 3. successful pusht episode: real telemetry, NO anomaly
        page.goto(f"{BASE}/episodes/pusht_ep_00004", wait_until="networkidle")
        check(f"{engine_name}/success-no-anomaly",
              page.locator("text=No anomaly detected").count() == 1 and page.locator("text=/Anomaly at/").count() == 0)
        check(f"{engine_name}/success-real-label", page.locator("text=/real telemetry/").count() == 1)
        red = page.evaluate("() => document.querySelectorAll('.cursor-crosshair .bg-red').length")
        check(f"{engine_name}/success-no-red-bars", red == 0, f"red elements={red}")

        # 4. non-pusht episode: synthetic label, no telemetry claim, no anomaly
        page.goto(f"{BASE}/episodes/roboturk_laundry_ep_00000", wait_until="networkidle")
        check(f"{engine_name}/roboturk-synthetic-label", page.locator("text=/synthetic signal preview/").count() == 1)
        check(f"{engine_name}/roboturk-no-telemetry-chip", page.locator("text=No telemetry to analyze").count() == 1)
        check(f"{engine_name}/roboturk-no-anomaly", page.locator("text=/Anomaly at/").count() == 0)
        b.close()

    # 5. data-level audit: real anomaly positions are NOT confined to 45-80%
    fracs = []
    eps = json.load(open("./src/data/real-episodes.json"))
    dur = {e["episodeId"]: e["metrics"]["durationS"] for e in eps}
    for eid, v in TEL.items():
        if v["anomalyS"] is not None:
            fracs.append(v["anomalyS"] / dur[eid])
    check("data/anomalies-not-formula-band", min(fracs) < 0.44 or max(fracs) > 0.80,
          f"range {min(fracs):.0%}-{max(fracs):.0%} of episode")
    methods = {v["anomalyMethod"] for v in TEL.values() if v["anomalyS"] is not None}
    check("data/all-envelope-method", all("envelope" in m or "ran out of time" in m for m in methods), str(len(methods)))
    # coverage_reward bars are real: monotone-ish rising shape for a success episode
    cov = TEL["pusht_ep_00004"]["tracks"][0]["bars"]
    check("data/success-coverage-rises", cov[-1] > 0.85 and cov[0] < 0.5, f"start={cov[0]} end={cov[-1]}")

fails = [r for r in results if not r[1]]
for name, ok, info in results:
    print(f"{'PASS' if ok else 'FAIL'}  {name:38s} {info}")
print(f"\n{len(results)-len(fails)}/{len(results)} passed")

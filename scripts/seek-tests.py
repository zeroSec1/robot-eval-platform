from playwright.sync_api import sync_playwright

BASE = "http://localhost:3001"
results = []

def check(name, cond, info=""):
    results.append((name, bool(cond), info))

def video_state(page):
    return page.evaluate("""() => { const v = document.querySelector('video');
        return {t: v.currentTime, paused: v.paused, err: v.error ? v.error.code : null,
                clock: document.querySelector('span.font-mono.tabular-nums')?.textContent}; }""")

def click_timeline(page, frac):
    box = page.locator(".cursor-crosshair").bounding_box()
    x = box["x"] + max(1, min(box["width"] - 1, box["width"] * frac))
    page.mouse.click(x, box["y"] + box["height"] / 2)
    page.wait_for_timeout(600)

with sync_playwright() as p:
    for engine_name, engine in [("webkit", p.webkit), ("chromium", p.chromium)]:
        b = engine.launch()
        page = b.new_page(viewport={"width": 1280, "height": 950})

        # pusht_ep_00004: 15.9s episode, H.264 clip tier (fromS=0)
        page.goto(f"{BASE}/episodes/pusht_ep_00004", wait_until="networkidle")

        # 1. seek at 50% while paused
        click_timeline(page, 0.5)
        s = video_state(page)
        check(f"{engine_name}/paused-seek-50%", abs(s["t"] - 7.95) < 0.8 and s["paused"], f"t={s['t']:.2f} paused={s['paused']}")
        # clock label updated
        check(f"{engine_name}/clock-updates", s["clock"] and s["clock"].startswith("0:0") and not s["clock"].startswith("0:00"), f"clock={s['clock']}")

        # 2. left edge
        click_timeline(page, 0.0)
        s = video_state(page)
        check(f"{engine_name}/left-edge", s["t"] < 0.5, f"t={s['t']:.2f}")

        # 3. right edge (end behavior: clamp or wrap to start, never crash/out-of-range)
        click_timeline(page, 1.0)
        s = video_state(page)
        check(f"{engine_name}/right-edge", s["err"] is None and -0.1 <= s["t"] <= 16.1, f"t={s['t']:.2f}")

        # 4. seek while playing keeps playing
        page.get_by_role("button", name="Play", exact=True).click()
        page.wait_for_timeout(1200)
        click_timeline(page, 0.25)
        page.wait_for_timeout(800)
        s = video_state(page)
        check(f"{engine_name}/seek-while-playing", (not s["paused"]) and 3.0 < s["t"] < 6.5, f"t={s['t']:.2f} paused={s['paused']}")

        # 5. garbage + out-of-range event payloads never crash or move time unexpectedly
        page.evaluate("""() => {
            window.dispatchEvent(new CustomEvent('robot-eval:seek', {detail: NaN}));
            window.dispatchEvent(new CustomEvent('robot-eval:seek', {detail: 'abc'}));
            window.dispatchEvent(new CustomEvent('robot-eval:seek', {}));
        }""")
        page.wait_for_timeout(300)
        s1 = video_state(page)
        check(f"{engine_name}/garbage-payloads", s1["err"] is None and abs(s1["t"] - s["t"]) < 2.5, f"t={s1['t']:.2f}")
        page.evaluate("() => window.dispatchEvent(new CustomEvent('robot-eval:seek', {detail: 99999}))")
        page.wait_for_timeout(400)
        s = video_state(page)
        check(f"{engine_name}/overflow-clamps", s["t"] <= 16.1, f"t={s['t']:.2f}")
        page.evaluate("() => window.dispatchEvent(new CustomEvent('robot-eval:seek', {detail: -5}))")
        page.wait_for_timeout(400)
        s = video_state(page)
        check(f"{engine_name}/negative-clamps", -0.1 <= s["t"] < 1.0, f"t={s['t']:.2f}")

        # 6. anomaly click on a failure episode (user's exact scenario)
        page.goto(f"{BASE}/episodes/pusht_ep_00016", wait_until="networkidle")
        anomaly_text = page.locator("text=/Anomaly at/").text_content()
        anomaly_t = float(anomaly_text.split("~")[1].replace("s", ""))
        dur = float(page.locator("text=/synthetic signal preview/").text_content().split("→")[1].split("s")[0].strip())
        click_timeline(page, anomaly_t / dur)
        s = video_state(page)
        check(f"{engine_name}/anomaly-click", abs(s["t"] - anomaly_t) < 0.8, f"clicked~{anomaly_t}s got t={s['t']:.2f}")

        # 7. long video, no clip tier (roboturk, ~198s)
        page.goto(f"{BASE}/episodes/roboturk_laundry_ep_00000", wait_until="networkidle")
        axis_dur = float(page.locator("text=/synthetic signal preview/").text_content().split("\u2192")[1].split("s")[0].strip())
        click_timeline(page, 0.5)
        page.wait_for_timeout(1500)
        s = video_state(page)
        media_dur = page.evaluate("() => document.querySelector('video').duration")
        expected = min(axis_dur / 2, media_dur)
        check(f"{engine_name}/long-video-50%", abs(s["t"] - expected) < 5, f"axis={axis_dur}s media={media_dur:.1f}s t={s['t']:.2f}")

        b.close()

    # 8. mobile tap (chromium, touch)
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 375, "height": 812}, is_mobile=True, has_touch=True)
    page.goto(f"{BASE}/episodes/pusht_ep_00004", wait_until="networkidle")
    box = page.locator(".cursor-crosshair").bounding_box()
    page.touchscreen.tap(box["x"] + box["width"] * 0.5, box["y"] + box["height"] / 2)
    page.wait_for_timeout(700)
    s = page.evaluate("() => document.querySelector('video').currentTime")
    check("mobile/tap-seek-50%", abs(s - 7.95) < 1.0, f"t={s:.2f}")
    b.close()

fails = [r for r in results if not r[1]]
for name, ok, info in results:
    print(f"{'PASS' if ok else 'FAIL'}  {name:34s} {info}")
print(f"\n{len(results) - len(fails)}/{len(results)} passed")

from playwright.sync_api import sync_playwright
import json, re

BASE = "http://localhost:3001"
REPO = "."
eps = json.load(open(f"{REPO}/src/data/real-episodes.json"))
dss = json.load(open(f"{REPO}/src/data/real-datasets.json"))
tel = json.load(open(f"{REPO}/src/data/real-telemetry.json"))

results = []
def check(name, cond, info=""):
    results.append((name, bool(cond), info))

# expected values computed from raw data
scored = [e for e in eps if e["outcome"]["success"] is not None]
succ = [e for e in scored if e["outcome"]["success"]]
durs = [e["metrics"]["durationS"] for e in eps if e["metrics"]["durationS"] is not None]
exp = {
    "total": len(eps),
    "sources": len(dss),
    "rate": round(100 * len(succ) / len(scored)),
    "succ_n": len(succ), "scored_n": len(scored), "unscored_n": len(eps) - len(scored),
    "avg_dur": round(sum(durs) / len(durs), 1),
    "n_success": len(succ), "n_failure": len(scored) - len(succ),
    "policies": len({e["policyVersion"] for e in eps}),
}
per_ds = {d["datasetId"]: len([e for e in eps if e["datasetId"] == d["datasetId"]]) for d in dss}

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1440, "height": 1000})

    # ---------- HOME ----------
    page.goto(f"{BASE}/", wait_until="networkidle")
    body = page.evaluate("() => document.querySelector('main').innerText")
    check("home/overview-line", f"{exp['sources']} sources · {exp['total']} episodes" in body)
    check("home/total-tile", re.search(rf"TOTAL EPISODES\s*\n\s*{exp['total']}", body, re.I))
    check("home/success-tile", f"{exp['rate']}%" in body and f"{exp['succ_n']} of {exp['scored_n']} scored · {exp['unscored_n']} unscored" in body)
    check("home/avg-duration", f"{exp['avg_dur']}s" in body, f"expect {exp['avg_dur']}s")
    # failure chips: no episode carries a failure category, so every chip must be 0
    chips = page.evaluate("() => [...document.querySelectorAll('a[href*=\"failure=\"]')].map(a => a.innerText.replace(/\\s+/g,' ').trim())")
    check("home/failure-chips-all-zero", len(chips) == 7 and all(c.endswith(" 0") for c in chips), str(chips[:3]))
    # dataset table: every row's episode count matches the data
    rows = page.evaluate("() => [...document.querySelectorAll('table')[0].querySelectorAll('tbody tr')].map(r => [...r.cells].map(c => c.innerText.trim()))")
    ok_rows = 0
    for r in rows:
        slug = r[0].split("\n")[-1].strip()
        if slug in per_ds and int(r[2]) == per_ds[slug]:
            ok_rows += 1
    check("home/dataset-table-counts", ok_rows == len(dss), f"{ok_rows}/{len(dss)} rows match")
    check("home/policy-badge", f"{exp['policies']} policy versions tracked" in body)

    # ---------- EPISODES ----------
    page.goto(f"{BASE}/episodes", wait_until="networkidle")
    check("episodes/count", page.locator(f"text={exp['total']} of {exp['total']} episodes").count() == 1)
    for label, n in [("success", exp["n_success"]), ("failure", exp["n_failure"])]:
        page.goto(f"{BASE}/episodes?outcome={label}", wait_until="networkidle")
        rows_n = page.locator("tbody tr").count()
        check(f"episodes/outcome-{label}", rows_n == n, f"UI {rows_n} vs data {n}")
    # every dataset facet count
    page.goto(f"{BASE}/episodes", wait_until="networkidle")
    facet_ok = 0
    for d in dss:
        c = page.locator(f'button[aria-pressed]:has-text("{d["name"][:25]}")').count()
        btn = page.get_by_role("button", name=re.compile(re.escape(d["name"][:25])))
        txt = btn.first.text_content() if btn.count() else ""
        m = re.search(r"(\d+)\s*$", txt or "")
        if m and int(m.group(1)) == per_ds[d["datasetId"]]:
            facet_ok += 1
    check("episodes/dataset-facet-counts", facet_ok == len(dss), f"{facet_ok}/{len(dss)}")

    # ---------- COMPARE ----------
    from collections import defaultdict
    pol = defaultdict(lambda: [0, 0])
    for e in scored:
        pol[e["policyVersion"]][0] += 1
        if e["outcome"]["success"]: pol[e["policyVersion"]][1] += 1
    page.goto(f"{BASE}/compare?baseline=human-teleop&candidate=sim-grasp-sampler", wait_until="networkidle")
    body = page.evaluate("() => document.querySelector('main').innerText")
    ht = round(100 * pol["human-teleop"][1] / pol["human-teleop"][0])
    check("compare/baseline-rate", f"baseline {ht}%" in body, f"expect {ht}%")

    # ---------- DETAIL PAGES: every sidebar fact vs data, 4 episodes ----------
    for eid in ["pusht_ep_00172", "pusht_ep_00004", "roboturk_laundry_ep_00000", "oxe_pusht_real_ep_00002"]:
        e = next(x for x in eps if x["episodeId"] == eid)
        page.goto(f"{BASE}/episodes/{eid}", wait_until="networkidle")
        body = page.evaluate("() => document.querySelector('main').innerText")
        facts = []
        d = e["metrics"]["durationS"]
        facts.append((f"{d:.1f}s" if d < 60 else f"{int(d//60)}m {round(d%60)}s") in body)
        facts.append(e["task"]["name"] in body)
        facts.append(e["embodiment"]["model"] in body)
        facts.append(str(e["embodiment"]["dof"]) in body)
        facts.append(f"{round(e['coverage']*100)}%" in body)
        outcome_label = "Success" if e["outcome"]["success"] else ("Failure" if e["outcome"]["success"] is False else "Unscored")
        facts.append(outcome_label in body)
        # anomaly chip must match telemetry data exactly
        t = tel.get(eid)
        if t and t["anomalyS"] is not None:
            facts.append(f"Anomaly at ~{t['anomalyS']}s" in body)
        else:
            facts.append("Anomaly at" not in body)
        check(f"detail/{eid}", all(facts), f"facts={['ok' if f else 'BAD' for f in facts]}")

    # ---------- 'coverage_reward' bars equal extracted data ----------
    page.goto(f"{BASE}/episodes/pusht_ep_00172", wait_until="networkidle")
    ui_bars = page.evaluate("""() => {
        const track = document.querySelectorAll('.cursor-crosshair > div.relative')[0];
        return [...track.querySelectorAll('div.flex-1')].map(d => parseFloat(d.style.height) / 100);
    }""")
    data_bars = tel["pusht_ep_00172"]["tracks"][0]["bars"]
    diffs = [abs(a - b) for a, b in zip(ui_bars, data_bars)]
    check("detail/bars-match-extraction", len(ui_bars) == len(data_bars) and max(diffs) < 0.005,
          f"{len(ui_bars)} bars, max diff {max(diffs):.4f}")
    b.close()

fails = [r for r in results if not r[1]]
for name, ok, info in results:
    print(f"{'PASS' if ok else 'FAIL'}  {name:38s} {info}")
print(f"\n{len(results)-len(fails)}/{len(results)} passed")

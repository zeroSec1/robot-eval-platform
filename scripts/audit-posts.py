#!/usr/bin/env python3
"""Audit every published post for citation integrity and factual consistency.

Checks that survive without network access:
  1. Every [n] marker in a post resolves to a source in that post's list.
  2. Every source in the list is actually cited somewhere in the body.
  3. Numbers quoted across posts agree with each other and with the data files.
  4. The RaaS break-even math is re-derived independently of the model script.
  5. Readability targets, and no em dashes.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = (ROOT / "src" / "data" / "blog-posts.ts").read_text()
PAGE = (ROOT / "src" / "app" / "blog" / "[slug]" / "page.tsx").read_text()

problems = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"  ({detail})" if detail and not ok else ""))
    if not ok:
        problems.append(f"{name}: {detail}")


def posts():
    slugs = re.findall(r'slug: "([a-z0-9-]+)"', SRC)
    for i, slug in enumerate(slugs):
        start = SRC.index(f'slug: "{slug}"')
        end = SRC.index(f'slug: "{slugs[i+1]}"') if i + 1 < len(slugs) else len(SRC)
        yield slug, SRC[start:end]


print("== 1. citation integrity ==")
for slug, body in posts():
    # The Sources list is the ordered list that FOLLOWS the "Sources" heading.
    # Any other ol in the body is article content, not a bibliography.
    head = body.find('text: "Sources"')
    tail = body[head:] if head != -1 else ""
    src_block = re.search(r'\{ type: "ol", items: \[(.*?)\n\s*\] \}', tail, re.S)
    if not src_block:
        src_block = re.search(r'"ol",\s*items:\s*\[(.*?)\]\s*\}', tail, re.S)
    n_sources = len(re.findall(r'\n\s+"', src_block.group(1))) if src_block else 0
    prose = body[:head] if head != -1 else body
    # Citation markers also live in the figure components a post renders.
    # Resolve figure key -> component name from the page's FIGURES map, then
    # find the file that exports that component.
    for comp_key in re.findall(r'figure: "([a-z-]+)"', body):
        m = re.search(rf'"?{re.escape(comp_key)}"?:\s*(\w+),', PAGE)
        if not m:
            continue
        comp_name = m.group(1)
        for path in (ROOT / "src" / "components" / "blog").glob("*.tsx"):
            txt = path.read_text()
            if re.search(rf"export function {comp_name}\b", txt):
                prose += txt
    cited = sorted({int(x) for x in re.findall(r"\[(\d+)\]", prose)})
    if not cited and n_sources == 0:
        print(f"  SKIP  {slug} (no citations)")
        continue
    dangling = [c for c in cited if c > n_sources]
    unused = [i for i in range(1, n_sources + 1) if i not in cited]
    check(f"{slug}: every [n] resolves ({len(cited)} markers, {n_sources} sources)",
          not dangling, f"dangling: {dangling}")
    check(f"{slug}: no unused sources", not unused, f"never cited: {unused}")

print("== 2. cross-post number consistency ==")
report = json.loads((ROOT / "src" / "data" / "eval-report.json").read_text())
allposts = {s: b for s, b in posts()}
pairs = [
    ("48.1%", ["evaluation-1-failure-timing", "which-warehouse-robot-to-buy"], "PushT success rate"),
    ("27 fail", ["evaluation-1-failure-timing", "which-warehouse-robot-to-buy"], "failure count"),
    ("40%", ["evaluation-1-failure-timing", "which-warehouse-robot-to-buy"], "false-alarm rate"),
    ("$26.66", ["which-warehouse-robot-to-buy", "ten-questions-robot-vendor"], "BLS wage"),
    ("34%", ["ten-questions-robot-vendor", "rent-vs-buy-raas-math"], "DHL satisfaction"),
]
for needle, slugs, label in pairs:
    present = [s for s in slugs if s in allposts and needle in allposts[s]]
    check(f"{label} '{needle}' consistent across {len(slugs)} posts",
          len(present) == len(slugs), f"missing in {set(slugs) - set(present)}")

check("eval success rate in post matches data file",
      f"{report['pusht']['successRatePct']}%" in allposts["evaluation-1-failure-timing"])

print("== 3. independent re-derivation of the RaaS math ==")
model = json.loads((ROOT / "src" / "data" / "raas-model.json").read_text())
a = model["assumptions"]
P, R = a["unitPriceUSD"]["mid"], a["monthlyRentPerRobotUSD"]["mid"]
m, I = a["annualMaintenanceShareOfCapex"], a["oneTimeIntegrationUSD"]


def simulate(n, price, rent):
    """Brute-force month-by-month crossing, independent of the closed form."""
    t = 0
    while t < 600:
        buy = n * price + I + n * price * m * t / 12
        ren = n * rent * t
        if ren >= buy:
            return t
        t += 1
    return None


for d in model["byFleet"]:
    n = d["fleet"]
    closed = d["breakevenMonths"]
    brute = simulate(n, P, R)
    ok = brute is not None and abs(brute - closed) <= 1
    check(f"fleet {n}: closed form {closed} mo vs simulation {brute} mo", ok)

for row in model["grid"]:
    for c in row:
        brute = simulate(10, c["price"], c["rent"])
        cf = c["breakevenMonths"]
        ok = (cf is None and brute is None) or (cf and brute and abs(brute - cf) <= 1)
        check(f"grid ${c['price']}/${c['rent']}: {cf} mo vs sim {brute} mo", ok)

f = model["figure"]
check("figure six-year buy total matches curve",
      f["sixYearBuyUSD"] == f["buyCumulative"][a["serviceLifeMonths"]])
check("figure six-year rent total matches curve",
      f["sixYearRentUSD"] == f["rentCumulative"][a["serviceLifeMonths"]])
check("stated upfront cost (590000) equals 10*mid price + integration",
      10 * P + I == 590_000, f"got {10*P+I}")
check("six-year difference is rent minus buy",
      f["sixYearDifferenceUSD"] == f["sixYearRentUSD"] - f["sixYearBuyUSD"])

print("== 3b. architecture and pick-rate figure integrity ==")
arch = json.loads((ROOT / "src" / "data" / "architecture-figures.json").read_text())

# every published height must be backed by a verbatim quote containing its own number
for hgt in arch["heights"]:
    q = hgt["quote"]
    metric = str(hgt["metresTotal"]).rstrip("0").rstrip(".")
    imperial = str(hgt["feetTotal"]).rstrip("0").rstrip(".")
    check(f"height quote for {hgt['system']} contains its own figure",
          metric in q or imperial in q, q[:70])

sp = arch["spread"]
tall = max(arch["heights"], key=lambda h: h["metresTotal"])
short = min(arch["heights"], key=lambda h: h["metresTotal"])
check("height spread in metres re-derives",
      round(tall["metresTotal"] - short["metresTotal"], 1) == sp["differenceMetres"])
check("height spread in feet re-derives",
      round(tall["feetTotal"] - short["feetTotal"], 1) == sp["differenceFeet"])
check("height ratio re-derives",
      round(tall["metresTotal"] / short["metresTotal"], 2) == sp["ratio"])
check("E1155 exclusion quote is present and about fixed-path vehicles",
      "shall not be used" in arch["exclusion"]["quote"]
      and "fixed-path vehicle systems" in arch["exclusion"]["quote"])
check("both floor standards are distinct",
      arch["floors"][0]["standard"] != arch["floors"][1]["standard"])
check("at least one vendor lacks a published service-space figure, and it is flagged",
      any(h.get("serviceSpacePublished") is False for h in arch["heights"]))

pr = json.loads((ROOT / "src" / "data" / "pickrate-figures.json").read_text())
s = pr["summary"]
check("pick-rate totals add up",
      s["noConditions"] + s["partialConditions"] + s["noNumberPublished"] == s["total"])
check("pick-rate claims with numbers re-derives",
      s["total"] - s["noNumberPublished"] == s["withNumbers"])
check("no pick-rate claim states full conditions",
      s["fullConditionsStated"] == 0)

print("== 4. readability and style ==")
for slug, _ in posts():
    r = subprocess.run([sys.executable, "scripts/readability-check.py", slug],
                       cwd=ROOT, capture_output=True, text=True)
    check(f"{slug} readability", r.returncode == 0, r.stdout.strip().splitlines()[-1] if r.stdout else "")
check("no em dashes in posts", "—" not in SRC)

print()
if problems:
    print(f"AUDIT FAILED: {len(problems)} problem(s)")
    for p in problems:
        print("  -", p)
    sys.exit(1)
print("AUDIT PASSED: all checks clean")

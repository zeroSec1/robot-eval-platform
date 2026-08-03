#!/usr/bin/env python3
"""Verify the evaluation blog post's numbers, end to end.

Three layers:
  1. Regenerate eval-report.json via build-eval-report.py (which itself
     cross-checks every anomaly against the source parquet and hard-fails
     on any mismatch) and confirm the regeneration is byte-identical to
     what ships.
  2. Invariants on the report the figures rely on.
  3. Every statistic quoted in the evaluation post's prose is derived here
     from the report and asserted to appear verbatim in blog-posts.ts, so
     the text can never drift from the data.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"
REPORT = DATA / "eval-report.json"
POSTS = ROOT / "src" / "data" / "blog-posts.ts"

failures = []


def check(name, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"  ({detail})" if detail and not ok else ""))
    if not ok:
        failures.append(name)


print("== 1. regeneration is deterministic and parquet-verified ==")
before = REPORT.read_bytes()
subprocess.run([sys.executable, "scripts/build-eval-report.py"],
               cwd=ROOT, check=True, capture_output=True)
after = REPORT.read_bytes()
check("build-eval-report.py exits 0 (parquet cross-check passed inside)", True)
check("regenerated report is byte-identical to shipped report", before == after)

r = json.loads(after)

print("== 2. report invariants the figures rely on ==")
det = r["detection"]
fig = r["figures"]
check("totals: 308 episodes / 9 datasets", r["totals"]["episodes"] == 308 and r["totals"]["datasets"] == 9)
check("scored + unscored == total",
      r["totals"]["scored"] + r["totals"]["unscored"] == r["totals"]["episodes"])
check("pusht n == successes + failures",
      r["pusht"]["n"] == r["pusht"]["successes"] + r["pusht"]["failures"])
check("method split covers all failures",
      det["byMethod"]["envelopeDrop"] + det["byMethod"]["peakFallback"] == r["pusht"]["failures"])
check("anomaly strip has one point per failure",
      len(fig["anomalyStrip"]) == r["pusht"]["failures"])
check("strip methods match split",
      sum(1 for p in fig["anomalyStrip"] if p["method"] == "envelope-drop") == det["byMethod"]["envelopeDrop"])
check("every strip anomaly within its episode duration",
      all(0 < p["anomalyS"] <= p["durationS"] + 0.05 for p in fig["anomalyStrip"]))
env = fig["envelope"]
check("envelope arrays aligned",
      len(env["envelopeT"]) == len(env["envelopeP10"]) == len(env["successMedian"]))
check("exemplar arrays aligned", len(env["exemplarT"]) == len(env["exemplarCoverage"]))
check("exemplar anomaly inside its time range",
      0 < env["exemplarAnomalyS"] <= env["exemplarT"][-1])
check("exemplar is an envelope-drop failure",
      any(p["id"] == env["exemplarId"] and p["method"] == "envelope-drop"
          for p in fig["anomalyStrip"]))

print("== 3. post prose quotes exactly what the report says ==")
src = POSTS.read_text()
post = src[src.index('"evaluation-1-failure-timing"'):src.index('"real-anomaly-markers"')]
p = r["pusht"]
oxe = r["scoredDatasets"]["oxe-columbia-pusht-real"]
expected = {
    "success count/total": f"{p['successes']} of {p['n']}",
    "success rate": f"{p['successRatePct']}%",
    "median success duration": f"{p['medianDurationSuccessS']} s",
    "median failure duration": f"{p['medianDurationFailureS']} s",
    "real-robot contrast": f"{oxe['success']} of {oxe['success'] + oxe['failure']} successes",
    "unscored of total": f"{r['totals']['unscored']} of {r['totals']['episodes']}",
    "drop count of failures": f"{det['byMethod']['envelopeDrop']} of the {p['failures']} failures",
    "drop median time": f"{det['envelopeDrop']['timesS']['median']} s",
    "drop range": f"{det['envelopeDrop']['timesS']['min']} to {det['envelopeDrop']['timesS']['max']} s",
    "drop median fraction": f"{det['envelopeDrop']['fractionOfEpisode']['median'] * 100:.1f}% of episode",
    "fallback count": f"other {det['byMethod']['peakFallback']} failures",
    "fallback median fraction": f"{det['peakFallback']['fractionOfEpisode']['median'] * 100:.1f}% of episode",
    "false alarms": f"{det['successesFlaggedByDropRule']} of the {det['successesTotal']}",
    "false alarm rate": f"{det['successesFlaggedByDropRule'] / det['successesTotal'] * 100:.0f}% false-alarm rate",
    "markers reproduce": f"all {p['failures']} failure markers reproduce",
}
for name, needle in expected.items():
    check(f"post quotes {name}: '{needle}'", needle in post, "not found in post text")

print()
if failures:
    print(f"FAILED: {len(failures)} check(s): {failures}")
    sys.exit(1)
print(f"all {13 + len(expected)} checks passed")

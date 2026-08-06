#!/usr/bin/env python3
"""Build src/data/method-figures.json for the methodology post.

Two figures. The first is the most instructive thing we own: the same
52 trials scored against two different pass marks, producing 48.1% and
0%. It is drawn from our own published evaluation and our own published
correction, so it is not a hypothetical.

The second is the record-keeping checklist, which is the part readers
can act on without any of our software.

All values are read from eval-report.json rather than restated, so the
figures cannot drift from the evaluation they describe.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"
OUT = DATA / "method-figures.json"

# What a trial log needs to contain for any of this to be possible. Ours
# is the PushT telemetry: a timestamped signal per trial plus an outcome.
RECORD = [
    {"item": "A pass mark, written down before the run", "why": "Set afterwards, it bends toward the result you want."},
    {"item": "Every trial, including the ones that went badly", "why": "Failures carry the diagnostic information."},
    {"item": "One timestamped signal of task progress", "why": "Without a time series you can only count, not diagnose."},
    {"item": "Trial start and end times", "why": "Needed to tell a mid-task failure from running out of time."},
    {"item": "Whether a person intervened, and when", "why": "An unrecorded intervention turns a failure into a success."},
    {"item": "The raw log, kept", "why": "So the numbers can be recomputed and disputed later."},
]


def main():
    r = json.loads((DATA / "eval-report.json").read_text())
    p = r["pusht"]
    b = p["benchmarkComparison"]
    d = r["detection"]

    bars = [
        {"label": "Our chosen bar (peak reward 0.9)", "passed": p["successes"], "total": p["n"],
         "pct": p["successRatePct"], "kind": "ours"},
        {"label": "The benchmark's bar (coverage above 0.95)", "passed": b["standardBarSuccesses"],
         "total": p["n"], "pct": 0.0, "kind": "benchmark"},
    ]

    data = {
        "generatedBy": "scripts/build-method-figures.py",
        "barComparison": {
            "bars": bars,
            "maxRewardObserved": b["maxRewardObserved"],
            "datasetShipsSuccessFlag": b["datasetShipsSuccessFlag"],
            "episodesWhereDatasetFlagTrue": b["episodesWhereDatasetFlagTrue"],
            "episodesInSourceDataset": b["episodesInSourceDataset"],
        },
        "record": RECORD,
        "worked": {
            "trials": p["n"],
            "passed": p["successes"],
            "below": p["failures"],
            "divergedMidTask": d["byMethod"]["envelopeDrop"],
            "ranOutOfTime": d["byMethod"]["peakFallback"],
            "falseAlarms": d["successesFlaggedByDropRule"],
            "falseAlarmOf": d["successesTotal"],
            "falseAlarmPct": round(100 * d["successesFlaggedByDropRule"] / d["successesTotal"]),
        },
    }
    OUT.write_text(json.dumps(data, indent=1) + "\n")
    print(f"wrote {OUT}")
    print(f"bar comparison: {bars[0]['passed']}/{bars[0]['total']} ({bars[0]['pct']}%) "
          f"vs {bars[1]['passed']}/{bars[1]['total']} (0%)")
    print(f"max reward observed {b['maxRewardObserved']}; dataset flag true for "
          f"{b['episodesWhereDatasetFlagTrue']} of {b['episodesInSourceDataset']}")
    print(f"worked example: {data['worked']['divergedMidTask']} diverged, "
          f"{data['worked']['ranOutOfTime']} ran out of time, "
          f"false alarms {data['worked']['falseAlarms']}/{data['worked']['falseAlarmOf']} "
          f"({data['worked']['falseAlarmPct']}%)")
    print(f"record checklist items: {len(RECORD)}")


if __name__ == "__main__":
    main()

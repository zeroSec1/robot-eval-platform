#!/usr/bin/env python3
"""Build src/data/humanoid-figures.json for the humanoids post.

Two figures, both making the same point from opposite directions: how
much capital the category has raised, and how little it has published.

Funding figures are from company announcements and are cited in the
post. The disclosure scorecard is a factual audit of what appears in
Agility's own 100,000-tote release, which we read in full: it names the
customer and the milestone and states no operating metric.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data" / "humanoid-figures.json"

FUNDING = [
    {"company": "Figure", "raisedUSDm": 1000, "valuationUSDb": 39.0,
     "when": "Sept 2025", "note": "Series C exceeded $1B at a $39B post-money valuation"},
    {"company": "Apptronik", "raisedUSDm": 520, "valuationUSDb": 5.0,
     "when": "Feb 2026", "note": "raised $520M at about $5B"},
    {"company": "Agility Robotics", "raisedUSDm": 400, "valuationUSDb": 1.75,
     "when": "Apr 2025", "note": "about $400M at $1.75B pre-money, Amazon participating"},
]

# What the flagship warehouse deployment has published, audited against
# Agility's own release announcing the 100,000-tote milestone.
SCORECARD = [
    {"metric": "Totes moved, cumulative", "disclosed": True,
     "value": "over 100,000", "note": "the one published figure"},
    {"metric": "Number of robots deployed", "disclosed": False,
     "value": "not disclosed", "note": "no unit count appears in the release"},
    {"metric": "Throughput per robot per hour", "disclosed": False,
     "value": "not disclosed", "note": "unknowable without the fleet size"},
    {"metric": "Comparison to a human doing the task", "disclosed": False,
     "value": "not disclosed", "note": "no baseline given"},
    {"metric": "Uptime or intervention rate", "disclosed": False,
     "value": "not disclosed", "note": "no reliability figure"},
    {"metric": "Cost per tote, or any unit economics", "disclosed": False,
     "value": "not disclosed", "note": "no cost figure"},
]


def main():
    disclosed = sum(1 for s in SCORECARD if s["disclosed"])
    data = {
        "generatedBy": "scripts/build-humanoid-figures.py",
        "funding": FUNDING,
        "fundingTotals": {
            "raisedUSDm": sum(f["raisedUSDm"] for f in FUNDING),
            "combinedValuationUSDb": round(sum(f["valuationUSDb"] for f in FUNDING), 2),
        },
        "scorecard": SCORECARD,
        "scorecardSummary": {
            "disclosed": disclosed,
            "total": len(SCORECARD),
            "notDisclosed": len(SCORECARD) - disclosed,
        },
    }
    OUT.write_text(json.dumps(data, indent=1) + "\n")
    print(f"wrote {OUT}")
    print(f"funding: {[(f['company'], f['raisedUSDm']) for f in FUNDING]}")
    print(f"combined raised ${data['fundingTotals']['raisedUSDm']}M across three companies; "
          f"combined valuation ${data['fundingTotals']['combinedValuationUSDb']}B")
    print(f"scorecard: {disclosed} of {len(SCORECARD)} metrics disclosed")


if __name__ == "__main__":
    main()

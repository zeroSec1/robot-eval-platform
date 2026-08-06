#!/usr/bin/env python3
"""Build src/data/kroger-figures.json for the failed-deployment post.

Every value here is taken from a public filing or a dated news report,
listed in the post's sources. This script exists so the figures cannot
drift from the article text, and so each number carries its origin.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data" / "kroger-figures.json"

# Site funnel. 20 candidate locations identified at partnership launch in
# 2018 (Supermarket News); 8 facilities opened; 3 closed Jan 2026 and 1
# planned site (Charlotte NC) cancelled, leaving 5 (Kroger 10-Q; Ocado
# locations page lists 5 live US CFCs).
FUNNEL = [
    {"stage": "Sites identified in 2018", "count": 20,
     "note": "candidate locations at partnership launch"},
    {"stage": "Facilities actually opened", "count": 8,
     "note": "Monroe, Groveland, Forest Park, Dallas, Pleasant Prairie, Romulus, Aurora, Frederick"},
    {"stage": "Still open after January 2026", "count": 5,
     "note": "three closed, one planned site cancelled"},
]

# Timeline. "warning" marks a publicly visible signal that the programme
# was underperforming, before the write-off.
TIMELINE = [
    {"date": "2018", "sort": 2018.0, "label": "Partnership launched", "kind": "milestone"},
    {"date": "Apr 2021", "sort": 2021.3, "label": "First site opens, Monroe OH", "kind": "milestone"},
    {"date": "Sep 2023", "sort": 2023.7, "label": "Development of new sites paused", "kind": "warning"},
    {"date": "Mar 2024", "sort": 2024.2, "label": "Three spoke sites closed, missed benchmarks", "kind": "warning"},
    {"date": "Sep 2025", "sort": 2025.7, "label": "Site-by-site review announced", "kind": "warning"},
    {"date": "Nov 2025", "sort": 2025.9, "label": "$2.6B impairment announced", "kind": "writeoff"},
    {"date": "Jan 2026", "sort": 2026.05, "label": "Three sites close", "kind": "writeoff"},
]

# Charge components, USD millions, from the 10-Q and 10-K.
CHARGES = {
    "q3ChargeGross": 2585,
    "q3ChargeNetOfTax": 1968,
    "fullYearGross": 2497,
    "fullYearNetOfTax": 1908,
    "cashToOcado": 350,
    "note": "Q3 charge of $2,585M was revised to $2,497M for the full year, so about $88M reversed in Q4.",
}


def main():
    warn = [t for t in TIMELINE if t["kind"] == "warning"]
    first_warning = min(t["sort"] for t in warn)
    writeoff = min(t["sort"] for t in TIMELINE if t["kind"] == "writeoff")

    data = {
        "generatedBy": "scripts/build-kroger-figures.py",
        "funnel": FUNNEL,
        "funnelAttrition": {
            "identifiedToOpened": round(100 * (1 - FUNNEL[1]["count"] / FUNNEL[0]["count"])),
            "openedToRemaining": round(100 * (1 - FUNNEL[2]["count"] / FUNNEL[1]["count"])),
            "identifiedToRemaining": round(100 * (1 - FUNNEL[2]["count"] / FUNNEL[0]["count"])),
        },
        "timeline": TIMELINE,
        "warningLeadYears": round(writeoff - first_warning, 1),
        "charges": CHARGES,
    }
    OUT.write_text(json.dumps(data, indent=1) + "\n")
    print(f"wrote {OUT}")
    print(f"funnel: {[f['count'] for f in FUNNEL]}")
    print(f"attrition identified->remaining: {data['funnelAttrition']['identifiedToRemaining']}%")
    print(f"first public warning to write-off: {data['warningLeadYears']} years")
    print(f"charges: Q3 ${CHARGES['q3ChargeGross']}M gross, full year "
          f"${CHARGES['fullYearGross']}M, cash to vendor ${CHARGES['cashToOcado']}M")


if __name__ == "__main__":
    main()

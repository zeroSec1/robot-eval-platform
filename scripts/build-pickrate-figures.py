#!/usr/bin/env python3
"""Build src/data/pickrate-figures.json for the pick-rate article.

Two figures. The first is an audit of published vendor performance
claims: what the number is, and whether the vendor states the conditions
under which it was measured. The second is the list of questions a rate
has to answer before it means anything.

Every claim below was read from the vendor's own live page. Where a
vendor publishes no number, that is recorded rather than left blank,
because the absence is part of the finding.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data" / "pickrate-figures.json"

CLAIMS = [
    {"vendor": "Locus Robotics", "claim": "Increase your warehouse productivity by 2-3x with robots",
     "kind": "multiple, undefined baseline", "conditions": "none",
     "source": "locusrobotics.com homepage"},
    {"vendor": "Locus Robotics", "claim": "Our productivity rates were 78 UPH and we're currently picking about 150 UPH",
     "kind": "customer testimonial", "conditions": "none",
     "source": "locusrobotics.com, named customer quote"},
    {"vendor": "Exotec", "claim": "Pick from up to 600 containers per hour at each station",
     "kind": "ceiling, per station, containers", "conditions": "none",
     "source": "exotec.com Skypod page"},
    {"vendor": "Geek+ at Walmart", "claim": "Picking productivity jumped from 149 to 533 pieces/person/hour",
     "kind": "per person-hour, excludes robots", "conditions": "none",
     "source": "geekplus.com, Walmart Shenzhen pilot"},
    {"vendor": "Geek+", "claim": "Increase throughput and maintain 99.9% uptime during peak seasons",
     "kind": "availability", "conditions": "none",
     "source": "geekplus.com homepage"},
    {"vendor": "AutoStore", "claim": "4x Space & 99.8% Uptime",
     "kind": "multiple and availability", "conditions": "none",
     "source": "autostoresystem.com homepage"},
    {"vendor": "AutoStore at Boozt", "claim": "Boozt 63 secs order fulfillment time",
     "kind": "named customer result", "conditions": "partial",
     "source": "autostoresystem.com homepage results strip"},
    {"vendor": "Berkshire Grey", "claim": "No performance figure on its landing page",
     "kind": "no number published", "conditions": "not applicable",
     "source": "berkshiregrey.com"},
]

QUESTIONS = [
    {"q": "Per what?", "why": "Per robot, per station, per picker, or per facility. A per-person-hour figure can rise while the facility gets slower."},
    {"q": "Does the clock include travel, idle, charging and exceptions?", "why": "A rate measured only while picking is not a rate you can staff to."},
    {"q": "Measured over what period?", "why": "A peak hour, a good shift and a full quarter give very different numbers."},
    {"q": "On what order and SKU profile?", "why": "Single-line orders of fast movers are the easiest case and the usual demo."},
    {"q": "At what robot-to-picker ratio, and how many of each?", "why": "Rate per person and rate per robot move in opposite directions as you add robots. A vendor can improve one and quietly worsen the other."},
    {"q": "Is it a ceiling or an expectation?", "why": "The words 'up to' convert a marketing number into an upper bound you may never see."},
]


def main():
    stated = sum(1 for c in CLAIMS if c["conditions"] == "partial")
    none = sum(1 for c in CLAIMS if c["conditions"] == "none")
    nonum = sum(1 for c in CLAIMS if c["conditions"] == "not applicable")
    numeric = len(CLAIMS) - nonum

    data = {
        "generatedBy": "scripts/build-pickrate-figures.py",
        "claims": CLAIMS,
        "summary": {
            "total": len(CLAIMS),
            "withNumbers": numeric,
            "noNumberPublished": nonum,
            "fullConditionsStated": 0,
            "partialConditions": stated,
            "noConditions": none,
        },
        "questions": QUESTIONS,
    }
    OUT.write_text(json.dumps(data, indent=1) + "\n")
    print(f"wrote {OUT}")
    print(f"claims audited: {len(CLAIMS)}; with numbers: {numeric}; no number published: {nonum}")
    print(f"full conditions stated: 0; partial: {stated}; none: {none}")
    print(f"questions in checklist: {len(QUESTIONS)}")


if __name__ == "__main__":
    main()

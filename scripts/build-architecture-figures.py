#!/usr/bin/env python3
"""Build src/data/architecture-figures.json for the architecture-fit article.

Two figures. The first compares how much of a building's height each
storage architecture can actually use, because that is the constraint
buyers discover last and can do least about. The second maps traffic
type to the floor tolerance standard that governs it, including the
exclusion most contracts get wrong.

Every number here was read from the vendor's or the standards body's own
page and is quoted verbatim in `quote`. Nothing is derived, estimated or
converted by us: where both metric and imperial appear, both come from
the source.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data" / "architecture-figures.json"

# Verbatim from autostoresystem.com/system/grid and exotec.com/skypod-system/,
# read August 2026. metresStack is the stack itself; metresTotal includes the
# operating and service space the vendor says you must allow.
HEIGHTS = [
    {
        "system": "AutoStore grid, 220mm bins",
        "config": "26 levels",
        "metresStack": 5.8, "metresTotal": 7.8, "feetTotal": 25.7,
        "serviceSpacePublished": True,
        "quote": "220mm Bin x 26 levels This configuration totals 5.8m (19.1ft) With enough space for Robots and recommended servicing, the maximum total height is 7.8m (25.7ft).",
        "source": "autostoresystem.com/system/grid",
    },
    {
        "system": "AutoStore grid, 330mm bins",
        "config": "18 levels",
        "metresStack": 6.0, "metresTotal": 8.0, "feetTotal": 26.2,
        "serviceSpacePublished": True,
        "quote": "330mm Bins x 18 levels 425mm Bins x 14 levels These configurations total 6m (19.7ft) With enough operating space for the Robots and recommended service, the maximum total height is 8m (26.2ft).",
        "source": "autostoresystem.com/system/grid",
    },
    {
        "system": "Exotec Skypod racks",
        "config": "rack-climbing robots",
        "metresStack": 14.0, "metresTotal": 14.0, "feetTotal": 45.0,
        "quote": "Utilize vertical space with racks reaching up to 45 feet (14 meters)",
        "source": "exotec.com/skypod-system",
        "serviceSpacePublished": False,
    },
]

CLEARANCE = {
    "minimumMetres": 0.6, "minimumFeet": 2.0,
    "recommendedMetres": 2.0, "recommendedFeet": 6.5,
    "quote": "For safe operation of the Robot fleet, the system needs 600mm (2ft) of clearance above the Grid. There should also be adequate room for service and support staff to safely operate AutoStore service vehicles on top of the Grid: We recommend a minimum height of 2m (6.5ft) of clear space above the Grid.",
    "source": "autostoresystem.com/system/grid",
}

# The floor-tolerance standards, quoted from ASTM's own catalogue pages.
FLOORS = [
    {
        "traffic": "Free-roaming AMRs",
        "pattern": "random traffic, no fixed path",
        "standard": "ASTM E1155",
        "title": "Standard Test Method for Determining FF Floor Flatness and FL Floor Levelness Numbers",
        "applies": True,
        "note": "Written for randomly trafficked floors, which is what a free-roaming fleet produces.",
        "quote": "Establish compliance of randomly trafficked floor surfaces with specified FF Flatness and FL Levelness tolerances",
        "source": "astm.org/e1155-20.html",
    },
    {
        "traffic": "Fixed-path AGVs and narrow aisle",
        "pattern": "same wheel path, every trip",
        "standard": "ASTM E1486",
        "title": "Standard Test Method for Determining Floor Tolerances Using Waviness, Wheel Path and Levelness Criteria",
        "applies": True,
        "note": "Measures the defined wheel paths a fixed-path vehicle actually runs on.",
        "quote": "elevation differences of defined wheel paths",
        "source": "astm.org/e1486.html",
    },
]

# The trap: the standard most contracts cite excludes the fixed-path case.
EXCLUSION = {
    "standard": "ASTM E1155",
    "quote": "Results of this test method shall not be used to enforce contract flatness and levelness tolerances on those floor installations primarily intended to support the operation of fixed-path vehicle systems (for example, narrow aisle warehouse floors).",
    "clause": "section 5.3",
    "source": "astm.org/e1155-20.html",
}


def main():
    tallest = max(HEIGHTS, key=lambda h: h["metresTotal"])
    shortest = min(HEIGHTS, key=lambda h: h["metresTotal"])
    data = {
        "generatedBy": "scripts/build-architecture-figures.py",
        "heights": HEIGHTS,
        "clearance": CLEARANCE,
        "floors": FLOORS,
        "exclusion": EXCLUSION,
        "spread": {
            "tallest": tallest["system"], "tallestMetres": tallest["metresTotal"],
            "shortest": shortest["system"], "shortestMetres": shortest["metresTotal"],
            "ratio": round(tallest["metresTotal"] / shortest["metresTotal"], 2),
            "differenceMetres": round(tallest["metresTotal"] - shortest["metresTotal"], 1),
            "differenceFeet": round(tallest["feetTotal"] - shortest["feetTotal"], 1),
        },
    }
    OUT.write_text(json.dumps(data, indent=1) + "\n")
    print(f"wrote {OUT}")
    s = data["spread"]
    print(f"tallest {s['tallest']} {s['tallestMetres']}m vs shortest {s['shortest']} {s['shortestMetres']}m")
    print(f"ratio {s['ratio']}x, difference {s['differenceMetres']}m ({s['differenceFeet']}ft)")
    print(f"floor standards: {len(FLOORS)}; exclusion clause: {EXCLUSION['standard']} {EXCLUSION['clause']}")


if __name__ == "__main__":
    main()

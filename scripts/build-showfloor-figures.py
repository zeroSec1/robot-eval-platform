#!/usr/bin/env python3
"""Build src/data/showfloor-figures.json for the trade-show one-pager.

Two figures. The first is the sheet itself: questions you can actually
put to a vendor in five minutes at a booth, each with what a good answer
sounds like. The second is a standards card, so a buyer names the right
standard for the thing they are asking about.

The standards card exists because the easiest mistake here is citing a
performance standard for a safety question. ASTM's own navigation test
method says so in its scope, and that quote is carried below.

Show facts come from MHI's own site and press releases, read August 2026.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data" / "showfloor-figures.json"

SHOW = {
    "lastShow": "MODEX 2026",
    "lastShowWhen": "13 to 16 April 2026",
    "lastShowWhere": "Georgia World Congress Center, Atlanta",
    "registeredVisitors": 50000,
    "exhibitors": 1057,
    "netSquareFeet": 630000,
    "quote": "The 2026 event, sponsored by MHI, welcomed 50,000 registered visitors from every U.S. state and 132 countries, alongside 1,057 exhibitors covering 630,000 net square feet",
    "nextShow": "ProMat 2027",
    "nextShowWhen": "19 to 21 April 2027",
    "nextShowWhere": "McCormick Place, Chicago",
    "nextQuote": "ProMat 2027 will be held in Chicago's McCormick Place from April 19-21, 2027.",
    "source": "MHI press release, 20 April 2026",
}

# Questions that can be answered at a booth. Each is chosen because the
# answer, or the delay before it, tells you something on the spot.
QUESTIONS = [
    {
        "group": "Establish what you are looking at",
        "q": "Is this running your production software, or a demo build?",
        "good": "A straight yes or no. A demo build is fine; not knowing is not.",
    },
    {
        "group": "Establish what you are looking at",
        "q": "How many of these are in production today, and at how many sites?",
        "good": "Two numbers. A large unit count across one site is a different risk from a small count across many.",
    },
    {
        "group": "Establish what you are looking at",
        "q": "Is the demo running on a fixed route, or is it deciding where to go?",
        "good": "Fixed-path and free-roaming systems make different demands on your floor and your building.",
    },
    {
        "group": "Test any number they quote",
        "q": "That rate, per what, and measured over how long?",
        "good": "Per station, per robot, per person, and a window longer than an hour. Vagueness here is the answer.",
    },
    {
        "group": "Test any number they quote",
        "q": "Does the clock include travel, charging, exceptions and idle time?",
        "good": "Yes, with the definition. A rate measured only while picking is not one you can staff to.",
    },
    {
        "group": "Test any number they quote",
        "q": "Will you put that number in a pilot contract as an acceptance test?",
        "good": "Yes, or a clear reason why not. This is the single most informative question on the sheet.",
    },
    {
        "group": "Safety and compliance",
        "q": "Which safety standard does this conform to, and which edition?",
        "good": "A named standard and year. See the standards card below for what each one actually covers.",
    },
    {
        "group": "Safety and compliance",
        "q": "Who does the task-based risk assessment, and when do I see it?",
        "good": "Before commissioning, produced by the integrator with your people involved.",
    },
    {
        "group": "What happens after the sale",
        "q": "Who owns the data this system generates in my building?",
        "good": "A clear answer. In at least one major filed agreement, the vendor owns it.",
    },
    {
        "group": "What happens after the sale",
        "q": "What does the software license cost after year one, and is it transferable?",
        "good": "A number, and whether you can sell the site with a working system in it.",
    },
    {
        "group": "What happens after the sale",
        "q": "Can I have a reference site running my SKU profile, not your best one?",
        "good": "A name and a phone number, or an honest no.",
    },
]

# What each standard actually covers. The point is to stop buyers citing a
# performance test method when they mean safety.
STANDARDS = [
    {
        "id": "ANSI/ITSDF B56.5-2024",
        "covers": "safety",
        "what": "Safety Standard for Driverless, Automatic Guided Industrial Vehicles and Automated Functions of Manned Industrial Vehicles. Effective 16 Dec 2025.",
        "note": "Free on request from ITSDF, in exchange for your name, company and email and an agreement not to resell it.",
        "quote": "Copies of these standards are available for free upon request",
        "source": "itsdf.org",
    },
    {
        "id": "ANSI/A3 R15.08, parts 1 to 3",
        "covers": "safety",
        "what": "Industrial mobile robot safety. Part 1 covers the robot, part 2 the system and application, part 3 the use of it.",
        "note": "Part 3 is the operator's part, published 2026. Asking whether deployment guidance conforms to it is a fair question.",
        "quote": "",
        "source": "automate.org standards store",
    },
    {
        "id": "ASTM Committee F45",
        "covers": "performance, not safety",
        "what": "Performance test methods for robotics and autonomous systems: navigation, docking, obstacle detection, communication, terminology.",
        "note": "Do not cite F45 as a safety credential. Its own navigation test method points you at the safety standards instead.",
        "quote": "This standard does not purport to address all of the safety concerns, if any, associated with its use. Safety standards such as ANSI/ITSDF B56.5, ISO 3691-4:2020, or other safety standards should be followed.",
        "source": "ASTM F3244-21, scope clause 1.3",
    },
    {
        "id": "FEM 9.222",
        "covers": "acceptance testing",
        "what": "European rules for commissioning, hand-over and testing installations with storage and retrieval machines. Free download.",
        "note": "Useful as a model for a contractual acceptance test. It tells you to agree the target before signing, not what the target should be.",
        "quote": "The availability of the installation should be specified, at the latest, before signing the contract with the customer.",
        "source": "FEM 9.222, clause 4.6.3, 06.1989",
    },
]


def main():
    groups = []
    for q in QUESTIONS:
        if q["group"] not in groups:
            groups.append(q["group"])
    data = {
        "generatedBy": "scripts/build-showfloor-figures.py",
        "show": SHOW,
        "questions": QUESTIONS,
        "groups": groups,
        "standards": STANDARDS,
        "counts": {
            "questions": len(QUESTIONS),
            "groups": len(groups),
            "standards": len(STANDARDS),
            "safetyStandards": sum(1 for s in STANDARDS if s["covers"] == "safety"),
        },
    }
    OUT.write_text(json.dumps(data, indent=1) + "\n")
    print(f"wrote {OUT}")
    print(f"questions: {len(QUESTIONS)} in {len(groups)} groups; standards: {len(STANDARDS)}")
    print(f"next show: {SHOW['nextShow']}, {SHOW['nextShowWhen']}, {SHOW['nextShowWhere']}")
    print(f"last show: {SHOW['exhibitors']} exhibitors, {SHOW['registeredVisitors']:,} registered visitors")


if __name__ == "__main__":
    main()

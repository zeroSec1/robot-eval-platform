#!/usr/bin/env python3
"""Build src/data/policy-figures.json for the robot-policy-updates-insurance post.

Every number here is transcribed from a verified primary source, quoted in the
post's Sources list. Each entry carries its own metric and source so the figure
component cannot mix them silently. Re-run after any source re-check:
    python3 scripts/build-policy-figures.py
"""
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "policy-figures.json"

DATA = {
    # IIHS topic page "Advanced driver assistance" (iihs.org), read August 2026.
    # IIHS words: "systems with forward collision warning and automatic braking
    # cut rear-end crashes in half, while forward collision warning alone
    # reduces them by 27% (Cicchino, 2017)"; "Blind spot detection has been
    # shown to reduce lane-change crashes by 14% (Cicchino, 2018)"; "Lane
    # departure warning has not brought down insurance claim rates (HLDI, 2023)".
    # NOTE: each row is measured against its own crash type. The caption must
    # say so; they are not one comparable scale.
    "claimsEvidence": [
        {
            "feature": "Forward collision warning + automatic braking",
            "metric": "rear-end crashes",
            "reductionPct": 50,
            "note": "IIHS: cut rear-end crashes in half",
        },
        {
            "feature": "Forward collision warning alone",
            "metric": "rear-end crashes",
            "reductionPct": 27,
            "note": "IIHS, citing Cicchino 2017",
        },
        {
            "feature": "Blind spot detection",
            "metric": "lane-change crashes",
            "reductionPct": 14,
            "note": "IIHS, citing Cicchino 2018",
        },
        {
            "feature": "Lane departure warning",
            "metric": "insurance claim rates",
            "reductionPct": 0,
            "note": "HLDI 2023: has not brought down claim rates",
        },
    ],
    # The validated-update playbook. Items paraphrase verified regulatory
    # requirements; the bracketed source tag maps to the post's Sources list.
    "playbook": [
        {
            "item": "Version every policy you ship",
            "why": "UN Regulation No. 156 requires all initial and updated software versions to be uniquely identifiable; the system identifier is updated when a change leads to a new or extended type approval.",
        },
        {
            "item": "Assess the update before it goes out",
            "why": "R156 requires a documented process to assess whether an update adds, alters or enables any function not present at approval, and confirmation that it passed verification and validation, per update.",
        },
        {
            "item": "Keep a rollback path",
            "why": "R156 requires that a failed or interrupted update can be restored to the previous version, or the vehicle placed in a safe state.",
        },
        {
            "item": "Pre-declare the changes you plan to make",
            "why": "The FDA authorizes a change plan once, then lets validated model updates ship without a new submission. The EU AI Act exempts pre-determined changes from re-assessment the same way.",
        },
        {
            "item": "Re-check the risk assessment after changes",
            "why": "OSHA's technical manual says the risk assessment documentation should be reviewed if any changes are made to the robot application.",
        },
        {
            "item": "Record what the update changed in the field",
            "why": "An update that lifts the average can still flip individual cases from pass to fail. Per-episode comparison is the only way to see it.",
        },
    ],
}

OUT.write_text(json.dumps(DATA, indent=2) + "\n")
print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")

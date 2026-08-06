#!/usr/bin/env python3
"""Build src/data/contract-figures.json for the pilot-contract article.

Two figures. The first shows what changes at the moment of acceptance,
because that single event moves the burden of proof, the risk of loss
and the available remedy from one party to the other. The second is a
clause checklist, each line paired with real language from a filed
agreement rather than a template we invented.

Every quote below was read from the primary source: statutory text from
law.cornell.edu, contract exhibits from SEC EDGAR, and the opinion PDF
from wicourts.gov. `source` names the document each came from.

This is source material for an article, not legal advice, and the
article says so.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data" / "contract-figures.json"

# What the UCC default rule does at the moment of acceptance. Both columns
# are the statutory default, which a contract can and usually does change.
HINGE = [
    {
        "question": "Who must prove the system works?",
        "before": "The vendor. Until you accept, a non-conforming tender can be rejected.",
        "after": "You. The burden is on the buyer to establish any breach as to goods accepted.",
        "cite": "UCC 2-601, 2-607(4)",
    },
    {
        "question": "Who carries the risk if it is damaged or destroyed?",
        "before": "The vendor. Under a sale on approval, risk and title do not pass until acceptance.",
        "after": "You, from acceptance onward.",
        "cite": "UCC 2-327(1)(a)",
    },
    {
        "question": "Does running the robots count as accepting them?",
        "before": "No. Use consistent with the purpose of trial is not acceptance.",
        "after": "But failing to notify the vendor in time that you are returning them is acceptance.",
        "cite": "UCC 2-327(1)(b)",
    },
    {
        "question": "What happens if you stay quiet about a problem?",
        "before": "Nothing yet. You still have a reasonable opportunity to inspect.",
        "after": "You are barred from any remedy if you do not notify within a reasonable time.",
        "cite": "UCC 2-607(3)(a)",
    },
    {
        "question": "Do you still have to pay?",
        "before": "Not for goods you properly reject.",
        "after": "Yes. The buyer must pay at the contract rate for any goods accepted.",
        "cite": "UCC 2-607(1)",
    },
]

# Clauses to put in a pilot contract, each anchored to real filed language.
CLAUSES = [
    {
        "clause": "Define acceptance as a named test, and say what happens when it fails",
        "why": "Target's agreement names five tests, including a peak season stress test, and requires the whole test to be re-run after the vendor fixes what it broke.",
        "quote": "The Solution shall be subject to the following tests ...: 4.3.1. Factory Acceptance Test; 4.3.2. Site Acceptance Test; 4.3.3. SET Test; 4.3.4. Rate Test; and 4.3.5. Peak Season Stress Test.",
        "source": "Target and Berkshire Grey project agreement, SEC EDGAR, effective 31 Jan 2018",
    },
    {
        "clause": "Say that paying and using the system is not accepting it",
        "why": "This is the direct antidote to the default rule that acts inconsistent with the vendor's ownership can count as acceptance.",
        "quote": "Target's inspection, payment for or retention of Goods shall not constitute an acceptance of Goods not in compliance with the Specs ..., shall not affect Target's right to reject or return the same or require repairs thereto",
        "source": "Target master agreement, SEC EDGAR, effective 31 Jan 2018",
    },
    {
        "clause": "Make the vendor pay for the fallback you have to run",
        "why": "If go-live slips, the labour you kept on to ship orders by hand is a real cost. It can sit with the vendor.",
        "quote": "supporting the fulfillment of orders to Stores manually in the event of a failure to attain the prescribed Milestone Date for the First Full-Scale Live Use until such period as First Full-Scale Live Use is attained",
        "source": "Target and Berkshire Grey project agreement, SEC EDGAR (two conditions on this obligation are redacted)",
    },
    {
        "clause": "Gate the rollout on the pilot, and keep a walk-away right",
        "why": "Walmart could terminate at no extra cost if the proof of concept never passed, subject to a cure period, and lost that right if it waited more than 90 days.",
        "quote": "Walmart may terminate this Agreement without payment of any additional fees or costs ... in the event that the Brooksville POC 2.0 Project fails to achieve Final Acceptance by the Final Acceptance Date",
        "source": "Walmart and Symbotic master automation agreement, SEC EDGAR, dated 29 Jan 2019",
    },
    {
        "clause": "Decide who owns the data before you generate any",
        "why": "In the one filed robotics agreement we found that addresses this, the vendor owns everything the system generates inside your building. The operator carved back only the commercially sensitive slice.",
        "quote": "Symbotic shall own all right, title and Intellectual Property interest in System Data, which shall be the property of or shall vest exclusively in Symbotic.",
        "source": "Walmart and Symbotic master automation agreement, SEC EDGAR, dated 29 Jan 2019",
    },
    {
        "clause": "Start the warranty at live use, not delivery",
        "why": "A warranty that starts when the crates arrive can be half spent before the system does any real work.",
        "quote": "The Solution Warranty ... shall apply for a one-year period, commencing on the date of First Full-Scale Live Use",
        "source": "Target and Berkshire Grey project agreement, SEC EDGAR, effective 31 Jan 2018",
    },
]

# What the default vendor paper looks like, and what a court did with it.
CASE = {
    "name": "Buddy's Plant Plus Corp. v. Viking Masek Global Packaging Technologies, LLC",
    "citation": "2025 WI App 46",
    "court": "Wisconsin Court of Appeals",
    "decided": "30 July 2025",
    "priceUSD": 259450,
    "paidUSD": 129725,
    "outcome": "Recovery limited to the amount already paid; no consequential damages.",
    "quoteFacts": "Despite considerable efforts by the parties, Viking ultimately failed to deliver the machine.",
    "quoteClause": "[Viking]'s maximum liability hereunder is limited to the amount paid to [Viking] hereunder.",
    "quoteHolding": "The limited remedy does not fail of its essential purpose and is not unconscionable.",
    "note": "A state intermediate appellate decision with a dissent, not binding outside Wisconsin.",
    "source": "wicourts.gov opinion PDF, appeal no. 2023AP2428",
}


def main():
    data = {
        "generatedBy": "scripts/build-contract-figures.py",
        "hinge": HINGE,
        "clauses": CLAUSES,
        "case": CASE,
        "counts": {"hingeRows": len(HINGE), "clauses": len(CLAUSES)},
    }
    OUT.write_text(json.dumps(data, indent=1) + "\n")
    print(f"wrote {OUT}")
    print(f"acceptance-hinge rows: {len(HINGE)}; clauses: {len(CLAUSES)}")
    pct = round(100 * CASE["paidUSD"] / CASE["priceUSD"])
    print(f"case: paid ${CASE['paidUSD']:,} of ${CASE['priceUSD']:,} ({pct}%), machine never delivered")


if __name__ == "__main__":
    main()

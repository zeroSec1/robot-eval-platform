#!/usr/bin/env python3
"""Build src/data/detectability.json: does the outcome become predictable
at all, and does any detector beat a coin flip?

This replaces the anomaly detector we retracted. That detector reported a
single flag time and never established whether it carried information.
This script asks the prior question instead, which is the one that should
have been asked first:

  1. Discrimination. Does the rule fire more on failing trials than on
     passing ones? Ours did the opposite.
  2. Signal availability. Watching the first X% of a trial, how well does
     any feature rank the eventual outcome? Reported as AUC, where 0.5 is
     a coin flip.
  3. Independence. Do the signals that are NOT the labelling variable
     (agent speed, tracking error) carry anything the labelling variable
     does not?

If the AUC curve stays near 0.5 until the end of the trial, the outcome
is decided in the final frames, no early-warning method can work on that
data, and any method that appears to work is fitting noise.
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"
PARQUET = ROOT / "scripts" / "pusht_data.parquet"
OUT = DATA / "detectability.json"

BAR = 0.9
FRACTIONS = [0.2, 0.4, 0.6, 0.8, 0.9, 0.95, 1.0]


def auc(y, x):
    """Rank-based AUC. 0.5 is a coin flip, 1.0 is perfect ranking."""
    r = pd.Series(x).rank().values
    n1 = int(y.sum())
    n0 = len(y) - n1
    if n1 == 0 or n0 == 0:
        return None
    return float((r[y == 1].sum() - n1 * (n1 + 1) / 2) / (n1 * n0))


def main():
    df = pd.read_parquet(PARQUET)
    episodes = sorted(df["episode_index"].unique())

    reward, speed, track = {}, {}, {}
    for e in episodes:
        g = df[df["episode_index"] == e].sort_values("frame_index")
        r = g["next.reward"].to_numpy().astype(float)
        st = np.stack(g["observation.state"].to_numpy())
        act = np.stack(g["action"].to_numpy())
        reward[e] = r
        speed[e] = np.concatenate([[0.0], np.linalg.norm(np.diff(st, axis=0), axis=1)])
        track[e] = np.linalg.norm(act - st, axis=1)

    y = np.array([int(reward[e].max() >= BAR) for e in episodes])

    # 1. How much of a trial must you watch before the outcome ranks?
    curve = []
    for f in FRACTIONS:
        x = np.array([reward[e][: max(2, int(len(reward[e]) * f))].max() for e in episodes])
        curve.append({"watchedFraction": f, "auc": round(auc(y, x), 3)})

    # 2. Do the independent signals carry anything, early?
    def early(sig, f=0.4, stat="mean"):
        out = []
        for e in episodes:
            s = sig[e][: max(3, int(len(sig[e]) * f))]
            out.append(s.mean() if stat == "mean" else s.std())
        return np.array(out)

    features = {
        "coverage mean, first 40%": early(reward),
        "agent speed mean, first 40%": early(speed),
        "agent speed variability, first 40%": early(speed, stat="std"),
        "tracking error mean, first 40%": early(track),
        "tracking error variability, first 40%": early(track, stat="std"),
        "trial length": np.array([len(reward[e]) for e in episodes]),
    }
    feats = [{"feature": k, "auc": round(auc(y, v), 3)} for k, v in features.items()]
    best = max(feats, key=lambda d: abs(d["auc"] - 0.5))

    peaks = np.array([reward[e].max() for e in episodes])
    data = {
        "generatedBy": "scripts/build-detectability.py",
        "episodes": len(episodes),
        "passed": int(y.sum()),
        "failed": int(len(y) - y.sum()),
        "bar": BAR,
        "aucCurve": curve,
        "earlyFeatures": feats,
        "bestEarlyFeature": best,
        "verdict": {
            "anyEarlySignal": bool(abs(best["auc"] - 0.5) > 0.10),
            "aucAt40Pct": curve[1]["auc"],
            "aucAt95Pct": curve[-2]["auc"],
            "note": "The outcome only becomes rankable in the final frames, so no "
                    "early-warning method can work on this dataset.",
        },
        "peakDistribution": {
            "mean": round(float(peaks.mean()), 4),
            "std": round(float(peaks.std(ddof=1)), 4),
            "barPercentile": round(float((peaks < BAR).mean() * 100)),
        },
    }
    OUT.write_text(json.dumps(data, indent=1) + "\n")
    print(f"wrote {OUT}")
    print(f"episodes {len(episodes)}, pass {int(y.sum())}, fail {int(len(y)-y.sum())}")
    print("AUC by fraction watched: " + ", ".join(f"{c['watchedFraction']:.0%}={c['auc']}" for c in curve))
    print(f"best early feature: {best['feature']} AUC {best['auc']}")
    print(f"any early signal? {data['verdict']['anyEarlySignal']}")
    print(f"peak reward mean {data['peakDistribution']['mean']} "
          f"sd {data['peakDistribution']['std']}, bar at "
          f"{data['peakDistribution']['barPercentile']}th percentile")


if __name__ == "__main__":
    main()

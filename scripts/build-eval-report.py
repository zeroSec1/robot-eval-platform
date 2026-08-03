#!/usr/bin/env python3
"""Build src/data/eval-report.json for the public evaluation blog post.

Every figure and number in the evaluation post reads from the JSON this
script emits. Detection is recomputed here from the SOURCE parquet with the
exact semantics of extract-pusht-telemetry.py (full frame resolution,
successes extended past their end with their final value, P10 envelope,
0.5 s persistence), then cross-checked against the shipped anomalyS values
in real-telemetry.json; any mismatch is a hard failure. The envelope-drop
rule is additionally run on SUCCESSFUL episodes so the post's
false-positive claim is measured, not assumed.

Run eval-report-tests.py after any data change; the post must never cite a
number this script did not produce.
"""
import json
import statistics as st
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"
PARQUET = ROOT / "scripts" / "pusht_data.parquet"

PERSIST = 5           # 0.5 s at 10 Hz, matches extract-pusht-telemetry.py
FIG_POINTS = 140      # downsampled points for figure curves

ENVELOPE_METHOD = ("first sustained drop below the success-trial coverage "
                   "envelope (10th percentile, 0.5s persistence)")
PEAK_METHOD = ("coverage peak: tracked the success envelope but ran out of "
               "time; progress never improved after this point")


def downsample(series, n=FIG_POINTS):
    series = np.asarray(series, dtype=float)
    idx = np.linspace(0, len(series), n + 1).astype(int)
    return [round(float(np.mean(series[a:b])), 4) if b > a else 0.0
            for a, b in zip(idx[:-1], idx[1:])]


def main():
    episodes = json.loads((DATA / "real-episodes.json").read_text())
    telemetry = json.loads((DATA / "real-telemetry.json").read_text())
    df = pd.read_parquet(PARQUET)

    pusht = [e for e in episodes if e["datasetId"] == "lerobot-pusht"]
    outcome = {e["episodeId"]: e["outcome"]["success"] for e in pusht}
    duration = {e["episodeId"]: e["metrics"]["durationS"] for e in pusht}

    reward, ts = {}, {}
    for e in pusht:
        ep_idx = int(e["episodeId"].split("_")[-1])
        g = df[df["episode_index"] == ep_idx].sort_values("frame_index")
        assert not g.empty, e["episodeId"]
        reward[e["episodeId"]] = g["next.reward"].to_numpy().astype(float)
        ts[e["episodeId"]] = g["timestamp"].to_numpy().astype(float)

    successes = sorted(k for k, s in outcome.items() if s is True)
    failures = sorted(k for k, s in outcome.items() if s is False)

    # Envelope, exactly as extract-pusht-telemetry.py builds it.
    max_len = max(len(reward[k]) for k in successes)
    ext = np.stack([np.pad(reward[k], (0, max_len - len(reward[k])),
                           constant_values=reward[k][-1]) for k in successes])
    envelope = np.percentile(ext, 10, axis=0)

    def detect_drop(r):
        """Envelope-drop rule only; None when the run never leaves the envelope."""
        n = min(len(r), len(envelope))
        below = r[:n] < envelope[:n]
        run = 0
        for i in range(n):
            run = run + 1 if below[i] else 0
            if run >= PERSIST:
                return i - PERSIST + 1
        return None

    # Recompute for failures (with fallback) and cross-check against shipped.
    recomputed = {}
    method = {}
    for k in failures:
        i = detect_drop(reward[k])
        if i is not None:
            recomputed[k] = round(float(ts[k][i]), 1)
            method[k] = "envelope-drop"
        else:
            peak = int(np.argmax(reward[k]))
            recomputed[k] = round(float(ts[k][peak]), 1)
            method[k] = "peak-fallback"

    mismatches = {}
    for k in failures:
        shipped = telemetry[k]["anomalyS"]
        shipped_method = ("envelope-drop"
                          if telemetry[k]["anomalyMethod"] == ENVELOPE_METHOD
                          else "peak-fallback")
        if abs(shipped - recomputed[k]) > 0.05 or shipped_method != method[k]:
            mismatches[k] = {"shipped": shipped, "shippedMethod": shipped_method,
                             "recomputed": recomputed[k], "method": method[k]}
    for k in successes:
        if telemetry[k]["anomalyS"] is not None:
            mismatches[k] = {"shipped": telemetry[k]["anomalyS"],
                             "note": "success unexpectedly carries an anomaly"}
    assert not mismatches, f"shipped vs recomputed mismatch: {mismatches}"

    # Measured false-positive check: envelope-drop rule applied to successes.
    flagged_successes = [k for k in successes if detect_drop(reward[k]) is not None]

    drop_eps = sorted((k for k in failures if method[k] == "envelope-drop"),
                      key=lambda k: recomputed[k])
    peak_eps = sorted((k for k in failures if method[k] == "peak-fallback"),
                      key=lambda k: recomputed[k])
    drop_times = [recomputed[k] for k in drop_eps]
    drop_fracs = sorted(recomputed[k] / duration[k] for k in drop_eps)
    peak_fracs = sorted(recomputed[k] / duration[k] for k in peak_eps)

    # Exemplar for the envelope figure: median envelope-drop failure.
    exemplar = drop_eps[len(drop_eps) // 2]
    fig_t = [round(float(v), 2) for v in
             np.linspace(0, float(ts[exemplar][-1]), FIG_POINTS)]
    env_t = [round(float(v), 2) for v in
             np.linspace(0, (max_len - 1) / 10.0, FIG_POINTS)]

    scored = {
        "lerobot-pusht": {"label": "PushT sim (LeRobot)",
                          "success": len(successes), "failure": len(failures)},
        "oxe-columbia-pusht-real": {
            "label": "PushT real UR5 (Open X-Embodiment)",
            "success": sum(1 for e in episodes
                           if e["datasetId"] == "oxe-columbia-pusht-real"
                           and e["outcome"]["success"] is True),
            "failure": sum(1 for e in episodes
                           if e["datasetId"] == "oxe-columbia-pusht-real"
                           and e["outcome"]["success"] is False),
        },
    }
    unscored = sum(1 for e in episodes
                   if not e.get("outcome") or e["outcome"].get("success") is None)

    report = {
        "generatedBy": "scripts/build-eval-report.py",
        "sourceVerification": {
            "parquetEpisodesChecked": len(pusht),
            "shippedAnomaliesCrossChecked": len(failures),
            "mismatches": 0,
        },
        "totals": {
            "episodes": len(episodes),
            "datasets": len({e["datasetId"] for e in episodes}),
            "scored": sum(v["success"] + v["failure"] for v in scored.values()),
            "unscored": unscored,
        },
        "scoredDatasets": scored,
        "pusht": {
            "n": len(pusht),
            "successes": len(successes),
            "failures": len(failures),
            "successRatePct": round(100 * len(successes) / len(pusht), 1),
            "successCriterion": "max coverage reward >= 0.9 (automatic)",
            "medianDurationSuccessS": round(st.median(duration[k] for k in successes), 1),
            "medianDurationFailureS": round(st.median(duration[k] for k in failures), 1),
        },
        "detection": {
            "envelope": ENVELOPE_METHOD,
            "fallback": PEAK_METHOD,
            "byMethod": {
                "envelopeDrop": len(drop_eps),
                "peakFallback": len(peak_eps),
            },
            "successesFlaggedByDropRule": len(flagged_successes),
            "successesTotal": len(successes),
            "envelopeDrop": {
                "timesS": {"min": drop_times[0],
                           "median": round(st.median(drop_times), 1),
                           "max": drop_times[-1]},
                "fractionOfEpisode": {"median": round(st.median(drop_fracs), 3)},
            },
            "peakFallback": {
                "fractionOfEpisode": {"median": round(st.median(peak_fracs), 3)},
            },
        },
        "figures": {
            "envelope": {
                "envelopeT": env_t,
                "envelopeP10": downsample(envelope),
                "exemplarId": exemplar,
                "exemplarT": fig_t,
                "exemplarCoverage": downsample(reward[exemplar]),
                "exemplarAnomalyS": recomputed[exemplar],
                "successMedian": downsample(np.percentile(ext, 50, axis=0)),
            },
            "anomalyStrip": [
                {"id": k, "anomalyS": recomputed[k], "durationS": duration[k],
                 "method": method[k]}
                for k in drop_eps + peak_eps
            ],
        },
    }

    out = DATA / "eval-report.json"
    out.write_text(json.dumps(report, indent=1) + "\n")
    print(f"wrote {out} ({out.stat().st_size} bytes)")
    print(f"cross-check vs shipped telemetry: {len(failures)} anomalies, 0 mismatches")
    print(f"scored {report['totals']['scored']} / unscored {unscored} of {len(episodes)}")
    print(f"pusht: {len(successes)}/{len(pusht)} success "
          f"({report['pusht']['successRatePct']}%)")
    print(f"methods: envelope-drop {len(drop_eps)}, peak-fallback {len(peak_eps)}")
    print(f"successes flagged by drop rule: {len(flagged_successes)}/{len(successes)}")
    print(f"envelope-drop times s: {report['detection']['envelopeDrop']['timesS']}, "
          f"median fraction {report['detection']['envelopeDrop']['fractionOfEpisode']['median']}")
    print(f"peak-fallback median fraction "
          f"{report['detection']['peakFallback']['fractionOfEpisode']['median']}")
    print(f"exemplar: {exemplar} anomaly at {recomputed[exemplar]}s")


if __name__ == "__main__":
    main()

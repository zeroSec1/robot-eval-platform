"""Extract real per-episode telemetry for the PushT dataset from the LeRobot
parquet, and detect a real anomaly moment for failed episodes.

Tracks (all real, 10 Hz, downsampled to 140 bars, normalized 0..1):
  coverage_reward: next.reward from the environment (T-block target coverage)
  agent_speed:     |delta observation.state| per frame
  tracking_error:  |action - observation.state| (commanded vs actual position)

Anomaly detection (failed episodes only), following the standard
execution-monitoring formulation (Park et al., ICRA 2016; RC-NF 2026):
build the reference model from SUCCESSFUL executions only, then flag the
first sustained deviation beyond a progress-varying threshold.

Concretely: at each 0.1s timestep, the envelope is the 10th percentile of
coverage reward across all successful episodes (each extended past its end
with its final value, since successes terminate on completion). A failed
episode's anomaly is the first moment its coverage stays below that
envelope for at least 0.5s. Fallback when a run never leaves the envelope
(it tracked success pace but ran out of time): the coverage peak.
"""
import json
import numpy as np
import pandas as pd

PARQUET = "/private/tmp/claude-501/-Users-makamboyemomo/b96431de-b2d1-4314-bea6-e087704a6037/scratchpad/pusht_data.parquet"
BARS = 140

eps = json.load(open("src/data/real-episodes.json"))
pusht = [e for e in eps if e["datasetId"] == "lerobot-pusht"]
df = pd.read_parquet(PARQUET)

def downsample(series, bars=BARS):
    idx = np.linspace(0, len(series), bars + 1).astype(int)
    return [float(np.mean(series[a:b])) if b > a else 0.0 for a, b in zip(idx[:-1], idx[1:])]

def norm(bars_arr):
    hi = max(1e-9, np.percentile(bars_arr, 98))
    return [round(min(1.0, max(0.02, v / hi)), 3) for v in bars_arr]

# reference envelope from successful episodes only
succ_curves = []
for e in pusht:
    if e["outcome"]["success"] is True:
        g = df[df["episode_index"] == int(e["episodeId"].split("_")[-1])].sort_values("frame_index")
        succ_curves.append(g["next.reward"].to_numpy().astype(float))
max_len = max(len(c) for c in succ_curves)
ext = np.stack([np.pad(c, (0, max_len - len(c)), constant_values=c[-1]) for c in succ_curves])
envelope = np.percentile(ext, 10, axis=0)
print(f"success reference: {len(succ_curves)} episodes, envelope over {max_len} frames")

PERSIST = 5  # 0.5s at 10 Hz

def detect_anomaly(reward, ts):
    n = min(len(reward), len(envelope))
    below = reward[:n] < envelope[:n]
    run = 0
    for i in range(n):
        run = run + 1 if below[i] else 0
        if run >= PERSIST:
            return round(float(ts[i - PERSIST + 1]), 1), "first sustained drop below the success-trial coverage envelope (10th percentile, 0.5s persistence)"
    peak = int(np.argmax(reward))
    return round(float(ts[peak]), 1), "coverage peak: tracked the success envelope but ran out of time; progress never improved after this point"

out = {}
checked = 0
for e in pusht:
    ep_idx = int(e["episodeId"].split("_")[-1])
    g = df[df["episode_index"] == ep_idx].sort_values("frame_index")
    if g.empty:
        raise SystemExit(f"no parquet rows for {e['episodeId']}")
    dur_parquet = float(g["timestamp"].iloc[-1])
    dur_app = e["metrics"]["durationS"]
    assert abs(dur_parquet - dur_app) < 0.3, (e["episodeId"], dur_parquet, dur_app)
    checked += 1

    state = np.stack(g["observation.state"].to_numpy())
    action = np.stack(g["action"].to_numpy())
    reward = g["next.reward"].to_numpy().astype(float)
    ts = g["timestamp"].to_numpy().astype(float)

    speed = np.linalg.norm(np.diff(state, axis=0), axis=1)
    speed = np.concatenate([[0.0], speed])
    tracking = np.linalg.norm(action - state, axis=1)

    anomaly_s = None
    anomaly_method = None
    if e["outcome"]["success"] is False:
        anomaly_s, anomaly_method = detect_anomaly(reward, ts)

    out[e["episodeId"]] = {
        "hz": 10,
        "tracks": [
            {"name": "coverage_reward", "bars": [round(min(1.0, max(0.02, v)), 3) for v in downsample(reward)]},
            {"name": "agent_speed", "bars": norm(downsample(speed))},
            {"name": "tracking_error", "bars": norm(downsample(tracking))},
        ],
        "anomalyS": anomaly_s,
        "anomalyMethod": anomaly_method,
    }

json.dump(out, open("src/data/real-telemetry.json", "w"), separators=(",", ":"))
failed = [k for k, v in out.items() if v["anomalyS"] is not None]
print(f"episodes: {len(out)} (durations cross-checked: {checked}); failed with real anomaly: {len(failed)}")
for k in ["pusht_ep_00172", "pusht_ep_00016", "pusht_ep_00004"]:
    v = out.get(k, {})
    print(f"  {k}: anomalyS={v.get('anomalyS')} (outcome {'FAIL' if v.get('anomalyS') is not None else 'success/unscored'})")
import os
print("file size:", os.path.getsize("src/data/real-telemetry.json"), "bytes")

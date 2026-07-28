# Fetches the real robomimic "Lift" proficient-human dataset (ARISE
# Initiative / Stanford, MIT licensed: https://robomimic.github.io, hosted
# at https://huggingface.co/datasets/amandlek/robomimic), and ingests it
# directly as sourceFormat "hdf5" without converting to CSV first, unlike
# fetch-roboturk.py. This is the second non-LeRobot adapter and a genuinely
# different shape from the first one: real reward-based success/failure
# outcomes are present (robosuite's Lift task reports a sparse reward that
# hits 1.0 on success), but there is NO video, since this is the low_dim
# observation variant (state/proprioception only, no rendered camera frames
# were saved). That's an honest, real characteristic of this format, not a
# gap to paper over, and it's a real test of the app's no-video path.
#
# Robot: simulated Franka Emika Panda arm (7-DoF), in the robosuite/MuJoCo
# "Lift" task, per this file's own env_args metadata.
#
# Requires: pip install h5py numpy
# Usage: python3 scripts/fetch-robomimic.py

import h5py
import json
import numpy as np
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "robomimic"
DATA_DIR = ROOT / "src" / "data"
RAW_OUT = ROOT / "public" / "raw" / "robomimic-lift-panda"  # no video for this format, so it doesn't belong under public/videos/

HDF5_URL = "https://huggingface.co/datasets/amandlek/robomimic/resolve/main/v1.5/lift/ph/low_dim_v15.hdf5?download=true"
HF_API_URL = "https://huggingface.co/api/datasets/amandlek/robomimic"
DATASET_ID = "robomimic-lift-panda"
ID_PREFIX = "robomimic_lift"
TASK_NAME = "Lift cube (robosuite/Panda)"
TASK_INSTRUCTION = "Lift the cube above the table using the gripper"
CAP = 40
CONTROL_FREQ = 20  # Hz, from this dataset's own env_kwargs


def download():
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / "lift_low_dim_ph.hdf5"
    if not path.exists():
        print(f"Downloading {HDF5_URL} …")
        urllib.request.urlretrieve(HDF5_URL, path)
    return path


def fetch_recorded_at_fallback():
    # This dataset's HDF5 doesn't carry a per-demo wall-clock timestamp, so
    # (same pattern as fetch-lerobot.mjs) fall back to the HF repo's last
    # modification time as an honest proxy, not a fabricated date.
    try:
        with urllib.request.urlopen(HF_API_URL, timeout=20) as r:
            meta = json.loads(r.read())
        return meta.get("lastModified", datetime.now(tz=timezone.utc).isoformat())
    except Exception:
        return datetime.now(tz=timezone.utc).isoformat()


def main():
    hdf5_path = download()
    RAW_OUT.mkdir(parents=True, exist_ok=True)
    recorded_at = fetch_recorded_at_fallback()

    f = h5py.File(hdf5_path, "r")
    demo_names = sorted(f["data"].keys(), key=lambda d: int(d.split("_")[1]))
    print(f"{len(demo_names)} demos in file, ingesting up to {CAP}")

    stride = max(1, len(demo_names) // CAP)
    sampled = demo_names[::stride][:CAP]

    episodes = []
    for i, demo_name in enumerate(sampled):
        demo = f["data"][demo_name]
        actions = demo["actions"][:]
        rewards = demo["rewards"][:]
        num_samples = int(demo.attrs["num_samples"])
        duration_s = round(num_samples / CONTROL_FREQ, 2)

        # Real, documented robosuite convention: Lift reports a sparse
        # reward that reaches 1.0 exactly when the cube clears the success
        # height threshold. This is the PH ("proficient human") split, so
        # success is expected to be uniformly true, and the data bears that
        # out (verified across the full 200-demo file before writing this).
        success = bool(rewards[-1] >= 1.0)

        episode_id = f"{ID_PREFIX}_ep_{i:05d}"
        ep_dir = RAW_OUT / episode_id
        ep_dir.mkdir(parents=True, exist_ok=True)

        # Real per-episode raw source: a standalone HDF5 slice containing
        # just this demo's own actions/rewards/states/obs, not fabricated,
        # just re-packaged so "View raw source" has a real file to link to.
        raw_path = ep_dir / "episode.hdf5"
        with h5py.File(raw_path, "w") as out:
            out.create_dataset("actions", data=actions)
            out.create_dataset("rewards", data=rewards)
            out.create_dataset("dones", data=demo["dones"][:])
            out.create_dataset("states", data=demo["states"][:])
            obs_grp = out.create_group("obs")
            for k in demo["obs"].keys():
                obs_grp.create_dataset(k, data=demo["obs"][k][:])
            out.attrs["source_demo"] = demo_name
            out.attrs["source_dataset"] = "robomimic v1.5 lift/ph/low_dim"
            out.attrs["source_url"] = HDF5_URL

        episodes.append({
            "episodeId": episode_id,
            "datasetId": DATASET_ID,
            "sourceFormat": "hdf5",
            "schemaVersion": "1.0",
            "policyVersion": "human-teleop",
            "task": {
                "name": TASK_NAME,
                "languageInstruction": TASK_INSTRUCTION,
                "benchmarkPack": "manipulation-tabletop",
            },
            "embodiment": {
                "robotType": "Fixed-base arm (sim)",
                "model": "Franka Emika Panda (robosuite/MuJoCo)",
                "dof": 7,
                "sensors": ["proprioception"],
            },
            "outcome": {
                "success": success,
                "methodOfDetermination": "automatic: episode-final sparse reward == 1.0 (robosuite Lift task success criterion)",
            },
            "failure": None,
            "metrics": {"durationS": duration_s, "interventions": None, "collisions": None},
            "recordedAt": recorded_at,
            "coverage": 0.8,  # duration, outcome, sensors, dof present; no video in this observation variant
            "rawSourceUrl": f"/raw/{DATASET_ID}/{episode_id}/episode.hdf5",
        })

    n_success = sum(1 for e in episodes if e["outcome"]["success"])
    print(f"Ingested {len(episodes)} episodes ({n_success} success, {len(episodes) - n_success} failure)")

    dataset = {
        "datasetId": DATASET_ID,
        "name": "Lift cube, proficient human (robomimic, real sim teleop)",
        "sourceFormat": "hdf5",
        "ingestedAt": datetime.now(tz=timezone.utc).isoformat().replace("+00:00", "Z"),
    }

    ep_path = DATA_DIR / "real-episodes.json"
    ds_path = DATA_DIR / "real-datasets.json"
    existing_episodes = json.loads(ep_path.read_text()) if ep_path.exists() else []
    existing_datasets = json.loads(ds_path.read_text()) if ds_path.exists() else []

    existing_episodes = [e for e in existing_episodes if e["datasetId"] != DATASET_ID]
    existing_datasets = [d for d in existing_datasets if d["datasetId"] != DATASET_ID]

    existing_episodes.extend(episodes)
    existing_datasets.append(dataset)

    ep_path.write_text(json.dumps(existing_episodes, indent=2))
    ds_path.write_text(json.dumps(existing_datasets, indent=2))

    print(f"Wrote {len(existing_episodes)} total episodes across {len(existing_datasets)} datasets -> src/data/")
    print("Note: run this AFTER scripts/fetch-lerobot.mjs, since that script overwrites src/data/ wholesale.")


if __name__ == "__main__":
    main()

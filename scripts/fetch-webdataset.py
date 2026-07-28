# Fetches real grasp-evaluation records from NVIDIA's GraspGen dataset
# (CC-BY 4.0: huggingface.co/datasets/nvidia/PhysicalAI-Robotics-GraspGen),
# genuinely shipped as WebDataset tar shards (real robotics data actually
# distributed in this format, not a re-encoding like fetch-mcap.py had to
# resort to).
#
# HONEST SHAPE MISMATCH, read before trusting the episode count: each real
# shard is ~870MB, too large to fully download for this purpose, and more
# importantly, what's INSIDE it isn't temporal rollout data at all. Every
# tar member pair (<uuid>.grasps.json, <uuid>.integer_id) holds 2000 static
# grasp-pose candidates for one object, each with a real simulated
# success/failure label -- no video, no timestamps, no sequential steps.
# This is genuinely representative of what WebDataset is actually used for
# in robotics: large-scale flat training shards, not episode recordings.
# So unlike every other adapter here, these episodes honestly have no
# duration and no video -- that's the real shape of the data, not a gap
# introduced by this script. Each real OBJECT becomes one episode; outcome
# is the majority vote across that object's 2000 real grasp attempts.
#
# Only the first ~30MB of one shard is downloaded (via HTTP Range) and
# parsed as far as a valid tar stream allows, rather than pulling the full
# 870MB shard just to sample a handful of objects from it.
#
# Requires: nothing beyond the stdlib (tarfile, json, urllib)
# Usage: python3 scripts/fetch-webdataset.py

import json
import tarfile
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "webdataset"
DATA_DIR = ROOT / "src" / "data"
RAW_OUT = ROOT / "public" / "raw" / "graspgen-franka-webdataset"

SHARD_URL = "https://huggingface.co/datasets/nvidia/PhysicalAI-Robotics-GraspGen/resolve/main/grasp_data/franka_panda/shard_000.tar"
RANGE_BYTES = 30 * 1024 * 1024
DATASET_ID = "graspgen-franka-webdataset"
ID_PREFIX = "graspgen_franka"
CAP = 15


def download_partial():
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / "shard_000_partial.tar"
    if not path.exists():
        print(f"Downloading first {RANGE_BYTES // 1024 // 1024}MB of {SHARD_URL} …")
        req = urllib.request.Request(SHARD_URL, headers={"Range": f"bytes=0-{RANGE_BYTES - 1}"})
        with urllib.request.urlopen(req, timeout=120) as r, open(path, "wb") as f:
            f.write(r.read())
    return path


def iter_real_objects(tar_path, limit):
    """Yield (uuid, grasps_dict) for each complete pair found before the
    partial download's stream truncates. Truncation is expected and caught,
    not an error -- we're intentionally reading a byte-range prefix."""
    pending = {}
    count = 0
    try:
        with tarfile.open(tar_path, "r|") as tf:
            for member in tf:
                if count >= limit:
                    break
                uid = member.name.split(".")[0]
                if member.name.endswith(".grasps.json"):
                    f = tf.extractfile(member)
                    pending[uid] = json.loads(f.read())
                if uid in pending and member.name.endswith(".integer_id"):
                    yield uid, pending.pop(uid)
                    count += 1
    except tarfile.ReadError:
        pass  # expected: we deliberately only downloaded a byte-range prefix


def main():
    tar_path = download_partial()
    RAW_OUT.mkdir(parents=True, exist_ok=True)

    episodes = []
    for idx, (uid, grasp_record) in enumerate(iter_real_objects(tar_path, CAP)):
        outcomes = grasp_record["grasps"]["object_in_gripper"]
        n_total = len(outcomes)
        n_success = sum(1 for o in outcomes if o)
        success_rate = n_success / n_total
        success = success_rate >= 0.5
        object_file = grasp_record["object"]["file"]
        object_name = object_file.rstrip("/").split("/")[-1].removesuffix(".obj")

        episode_id = f"{ID_PREFIX}_ep_{idx:05d}"
        ep_dir = RAW_OUT / episode_id
        ep_dir.mkdir(parents=True, exist_ok=True)
        raw_path = ep_dir / "grasps.json"
        raw_path.write_text(json.dumps(grasp_record))

        episodes.append({
            "episodeId": episode_id,
            "datasetId": DATASET_ID,
            "sourceFormat": "webdataset",
            "schemaVersion": "1.0",
            "policyVersion": "sim-grasp-sampler",
            "task": {
                "name": f"Grasp object: {object_name}",
                "languageInstruction": "Grasp and lift the target object with a parallel-jaw gripper",
                "benchmarkPack": "manipulation-tabletop",
            },
            "embodiment": {
                "robotType": "Fixed gripper (sim)",
                "model": "Franka Panda parallel-jaw gripper",
                "dof": 1,
                "sensors": ["grasp_pose_sampler"],
            },
            "outcome": {
                "success": success,
                "methodOfDetermination": (
                    f"automatic: majority vote across {n_total} real simulated grasp "
                    f"candidates ({n_success}/{n_total} succeeded)"
                ),
            },
            "failure": None,
            "metrics": {"durationS": None, "interventions": None, "collisions": None},
            "recordedAt": "2025-03-13T20:17:12.000Z",  # real HF repo creation date (verified via API); no per-object timestamp exists in the source
            "coverage": 0.6,  # no duration/video for this format -- see module docstring
            "rawSourceUrl": f"/raw/{DATASET_ID}/{episode_id}/grasps.json",
        })
        print(f"{episode_id}: object={object_name} success_rate={success_rate:.2f} ({n_success}/{n_total}) -> {success}")

    n_success = sum(1 for e in episodes if e["outcome"]["success"])
    print(f"\nIngested {len(episodes)} episodes ({n_success} success, {len(episodes) - n_success} failure)")

    dataset = {
        "datasetId": DATASET_ID,
        "name": "GraspGen Franka Panda grasp evaluations (NVIDIA, real WebDataset shards)",
        "sourceFormat": "webdataset",
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


if __name__ == "__main__":
    main()

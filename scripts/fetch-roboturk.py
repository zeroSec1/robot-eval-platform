# Fetches the real RoboTurk "Laundry Layout" mini dataset (Stanford, MIT
# licensed: https://github.com/RoboTurk-Platform/roboturk_real_dataset),
# converts its HDF5 telemetry into real per-episode CSV files sitting next
# to the real demonstration video, and merges the result into the canonical
# episode schema as sourceFormat "csv_video", the first non-LeRobot adapter,
# proving the schema actually normalizes more than one input format rather
# than just declaring support for it in a type.
#
# Task background (RoboTurk paper): a Sawyer arm is teleoperated to flatten
# a cloth/fabric item via push, pull, and pick-and-place motions. RoboTurk's
# raw demonstrations have no recorded success/failure label, unlike the
# LeRobot sources, so outcome.success stays null here, which is itself a real
# illustration of why the `coverage` field exists.
#
# Requires: pip install h5py numpy
# Usage: python3 scripts/fetch-roboturk.py

import h5py
import json
import numpy as np
import shutil
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "roboturk"
DATA_DIR = ROOT / "src" / "data"
VIDEO_OUT = ROOT / "public" / "videos" / "roboturk-sawyer-laundry-layout"

ZIP_URL = "http://downloads.cs.stanford.edu/downloads/roboturk_real_dataset/SawyerLaundryLayout_mini_dataset.zip"
DATASET_ID = "roboturk-sawyer-laundry-layout"
ID_PREFIX = "roboturk_laundry"
TASK_NAME = "Sawyer laundry layout"
TASK_INSTRUCTION = "Flatten and lay out a cloth/fabric item using push, pull, and pick-and-place motions"


def download_and_extract():
    CACHE.mkdir(parents=True, exist_ok=True)
    zip_path = CACHE / "mini_dataset.zip"
    if not zip_path.exists():
        print(f"Downloading {ZIP_URL} …")
        urllib.request.urlretrieve(ZIP_URL, zip_path)
    extract_dir = CACHE / "extracted"
    if not extract_dir.exists():
        print("Extracting …")
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(extract_dir)
    return extract_dir


def iso(unix_ts):
    return datetime.fromtimestamp(unix_ts, tz=timezone.utc).isoformat().replace("+00:00", "Z")


def main():
    extract_dir = download_and_extract()
    hdf5_path = next(extract_dir.glob("*.hdf5"))
    videos_root = extract_dir / "dataset_videos" / "SawyerLaundryLayout_mini"

    VIDEO_OUT.mkdir(parents=True, exist_ok=True)

    f = h5py.File(hdf5_path, "r")
    demos = []
    for task_id in f["data"].keys():
        for demo_id in f["data"][task_id].keys():
            demos.append((task_id, demo_id))
    demos.sort(key=lambda td: f["data"][td[0]][td[1]].attrs["clock_time"])

    episodes = []
    skipped_no_video = 0

    for i, (task_id, demo_id) in enumerate(demos):
        demo = f["data"][task_id][demo_id]
        attrs = demo.attrs
        rel_video = attrs.get("front_rgb_video_file", "")
        # attrs path is "SawyerLaundryLayout/<day>/<user>/...", but on disk
        # that leading segment is replaced by the "_mini" folder itself.
        rel_video_fixed = "/".join(rel_video.split("/")[1:]) if rel_video else ""
        video_src = videos_root / rel_video_fixed if rel_video_fixed else None
        if not video_src or not video_src.exists():
            skipped_no_video += 1
            continue

        episode_id = f"{ID_PREFIX}_ep_{i:05d}"
        ep_dir = VIDEO_OUT / episode_id
        ep_dir.mkdir(parents=True, exist_ok=True)

        # Real per-timestep telemetry: end-effector pose + gripper state,
        # straight out of the source HDF5, written as an actual CSV file.
        eef_times = demo["robot_observation/eef_times"][:]
        eef_poses = demo["robot_observation/eef_poses"][:]
        gripper = demo["robot_observation/joint_states_gripper"][:]
        t0 = eef_times[0]

        csv_path = ep_dir / "telemetry.csv"
        with open(csv_path, "w") as csv_file:
            csv_file.write("t_s,eef_x,eef_y,eef_z,eef_qx,eef_qy,eef_qz,eef_qw,gripper_0,gripper_1,gripper_2\n")
            for row_i in range(len(eef_times)):
                t_s = eef_times[row_i] - t0
                pose = eef_poses[row_i]
                grip = gripper[row_i]
                csv_file.write(
                    f"{t_s:.4f}," + ",".join(f"{v:.6f}" for v in pose) + "," + ",".join(f"{v:.6f}" for v in grip) + "\n"
                )

        video_dst = ep_dir / "observation.mp4"
        shutil.copyfile(video_src, video_dst)

        duration_s = round(float(attrs["demo_time"]), 1)
        recorded_at = iso(float(attrs["clock_time"]))

        episodes.append({
            "episodeId": episode_id,
            "datasetId": DATASET_ID,
            "sourceFormat": "csv_video",
            "schemaVersion": "1.0",
            "policyVersion": "human-teleop",
            "task": {
                "name": TASK_NAME,
                "languageInstruction": TASK_INSTRUCTION,
                "benchmarkPack": "manipulation-tabletop",
            },
            "embodiment": {
                "robotType": "Fixed-base arm",
                "model": "Rethink Robotics Sawyer",
                "dof": 7,
                "sensors": ["usb_front"],
            },
            "outcome": {
                "success": None,
                "methodOfDetermination": "not recorded in source dataset (raw human teleop, no scoring)",
            },
            "failure": None,
            "metrics": {"durationS": duration_s, "interventions": None, "collisions": None},
            "recordedAt": recorded_at,
            "coverage": 0.8,  # duration, video, sensors, dof present; outcome not recorded
            "video": {
                "url": f"/videos/{DATASET_ID}/{episode_id}/observation.mp4",
                "camera": "usb_front",
                "fromS": 0,
                "toS": duration_s,
                "sourceUrl": ZIP_URL,
            },
            "rawSourceUrl": f"/videos/{DATASET_ID}/{episode_id}/telemetry.csv",
        })

    print(f"Ingested {len(episodes)} episodes ({skipped_no_video} skipped: no video in mini package)")

    dataset = {
        "datasetId": DATASET_ID,
        "name": "Sawyer laundry layout (RoboTurk, real teleop)",
        "sourceFormat": "csv_video",
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

    print(f"Wrote {len(existing_episodes)} total episodes across {len(existing_datasets)} datasets → src/data/")
    print("Note: run this AFTER scripts/fetch-lerobot.mjs, since that script overwrites src/data/ wholesale.")


if __name__ == "__main__":
    main()

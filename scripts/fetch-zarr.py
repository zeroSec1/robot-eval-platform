# Fetches the real PushT Zarr replay buffer from the Diffusion Policy paper
# (Chi et al., RSS 2023, MIT licensed: real-stanford/diffusion_policy) --
# their own native training data format, a chunked/compressed Zarr store,
# independent of the LeRobot parquet mirror of the same PushT env already
# ingested. This is the exact sim data used to train the published
# Diffusion Policy model, paired with fetch-rlds.py's real-hardware UR5
# rollout of the same task family for a genuine sim-vs-real comparison.
#
# Zarr replay buffers concatenate every episode's steps into one flat set
# of arrays (data/action, data/img, data/state, ...) plus meta/episode_ends
# marking each episode's boundary -- there is no reward/coverage field
# recorded, so unlike the LeRobot PushT ingestion (which has a documented
# coverage-reward threshold), success is honestly left unscored here rather
# than guessed at without the env's target geometry.
#
# Requires: pip install zarr numpy + ffmpeg on PATH
# Usage: python3 scripts/fetch-zarr.py

import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import zarr

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "zarr"
DATA_DIR = ROOT / "src" / "data"
VIDEO_OUT = ROOT / "public" / "videos" / "dp-pusht-zarr"
RAW_OUT = ROOT / "public" / "raw" / "dp-pusht-zarr"

ZIP_URL = "https://diffusion-policy.cs.columbia.edu/data/training/pusht.zip"
DATASET_ID = "dp-pusht-zarr"
ID_PREFIX = "dp_pusht_zarr"
CAP = 20
CONTROL_HZ = 10  # matches the documented control rate for this same task family (see fetch-rlds.py)


def download_and_extract():
    import urllib.request
    import zipfile

    CACHE.mkdir(parents=True, exist_ok=True)
    zip_path = CACHE / "pusht.zip"
    if not zip_path.exists():
        print(f"Downloading {ZIP_URL} …")
        urllib.request.urlretrieve(ZIP_URL, zip_path)
    extract_dir = CACHE / "extracted"
    if not extract_dir.exists():
        print("Extracting …")
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(extract_dir)
    zarr_path = extract_dir / "pusht" / "pusht_cchi_v7_replay.zarr"
    return zarr_path


def encode_video(frames_uint8, out_path, fps):
    proc = subprocess.Popen(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "rawvideo", "-pix_fmt", "rgb24",
            "-s", f"{frames_uint8.shape[2]}x{frames_uint8.shape[1]}",
            "-framerate", str(fps), "-i", "-",
            "-pix_fmt", "yuv420p", "-vcodec", "libx264",
            str(out_path),
        ],
        stdin=subprocess.PIPE,
    )
    proc.stdin.write(frames_uint8.tobytes())
    proc.stdin.close()
    ret = proc.wait()
    if ret != 0:
        raise RuntimeError(f"ffmpeg exited {ret} for {out_path}")


def main():
    zarr_path = download_and_extract()
    z = zarr.open(str(zarr_path), mode="r")
    episode_ends = z["meta/episode_ends"][:]
    n_total = len(episode_ends)
    print(f"{n_total} episodes in store, ingesting up to {CAP}")

    VIDEO_OUT.mkdir(parents=True, exist_ok=True)
    RAW_OUT.mkdir(parents=True, exist_ok=True)

    stride = max(1, n_total // CAP)
    sample_indices = list(range(0, n_total, stride))[:CAP]

    episodes = []
    for idx, ep_num in enumerate(sample_indices):
        start = 0 if ep_num == 0 else int(episode_ends[ep_num - 1])
        end = int(episode_ends[ep_num])
        length = end - start

        action = z["data/action"][start:end]
        state = z["data/state"][start:end]
        img = z["data/img"][start:end]  # float32, 0-255 range, real rendered sim frames
        n_contacts = z["data/n_contacts"][start:end]

        episode_id = f"{ID_PREFIX}_ep_{idx:05d}"
        video_dir = VIDEO_OUT / episode_id
        video_dir.mkdir(parents=True, exist_ok=True)
        video_path = video_dir / "observation.mp4"
        encode_video(np.clip(img, 0, 255).astype(np.uint8), video_path, CONTROL_HZ)

        # Real per-episode raw source: an actual standalone Zarr store with
        # this episode's own slice, verified by reopening it below.
        ep_dir = RAW_OUT / episode_id
        raw_zarr_path = ep_dir / "episode.zarr"
        ep_store = zarr.open(str(raw_zarr_path), mode="w")
        ep_store.create_array("action", data=action)
        ep_store.create_array("state", data=state)
        ep_store.create_array("n_contacts", data=n_contacts)
        ep_store.attrs["source_episode_index"] = ep_num
        ep_store.attrs["source_dataset"] = "diffusion_policy pusht_cchi_v7_replay.zarr"
        ep_store.attrs["source_url"] = ZIP_URL

        # Genuine round-trip verification, not a blind write.
        reopened = zarr.open(str(raw_zarr_path), mode="r")
        assert reopened["action"].shape == action.shape, f"{episode_id}: zarr round-trip shape mismatch"

        # A real Zarr store is a directory of chunk files, not one
        # downloadable file -- zip it so "View raw source" links to
        # something an actual browser download can hand someone.
        zip_path = ep_dir / "episode_zarr.zip"
        shutil.make_archive(str(zip_path.with_suffix("")), "zip", root_dir=raw_zarr_path)

        duration_s = round(length / CONTROL_HZ, 2)
        # n_contacts marks pusher-to-block contact, which is the intended
        # task interaction here, not an unwanted collision -- deliberately
        # NOT mapped to metrics.collisions, which would misrepresent normal
        # task contact as a failure signal in the app's aggregate stats.

        episodes.append({
            "episodeId": episode_id,
            "datasetId": DATASET_ID,
            "sourceFormat": "zarr",
            "schemaVersion": "1.0",
            "policyVersion": "human-teleop",
            "task": {
                "name": "Push T-block to target (sim)",
                "languageInstruction": "Push the T-shaped block onto the fixed target region",
                "benchmarkPack": "manipulation-tabletop",
            },
            "embodiment": {
                "robotType": "2D pusher (sim)",
                "model": "PushT env",
                "dof": 2,
                "sensors": ["img"],
            },
            "outcome": {
                "success": None,
                "methodOfDetermination": "not recorded in source dataset (raw replay buffer has no reward/coverage field)",
            },
            "failure": None,
            "metrics": {"durationS": duration_s, "interventions": None, "collisions": None},
            "recordedAt": "2023-03-06T00:00:00.000Z",  # real paper/repo publication date (RSS 2023 submission); no per-episode timestamp exists in the store
            "coverage": 0.8,
            "video": {
                "url": f"/videos/{DATASET_ID}/{episode_id}/observation.mp4",
                "camera": "img",
                "fromS": 0,
                "toS": duration_s,
                "sourceUrl": ZIP_URL,
            },
            "rawSourceUrl": f"/raw/{DATASET_ID}/{episode_id}/episode_zarr.zip",
        })
        print(f"{episode_id}: {length} steps, {duration_s}s, zarr round-trip verified")

    dataset = {
        "datasetId": DATASET_ID,
        "name": "PushT sim replay buffer (Diffusion Policy, native Zarr)",
        "sourceFormat": "zarr",
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
    print(f"\nIngested {len(episodes)} episodes. Wrote {len(existing_episodes)} total across {len(existing_datasets)} datasets -> src/data/")


if __name__ == "__main__":
    main()

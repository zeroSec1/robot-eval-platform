# Fetches real episodes from the "columbia_cairlab_pusht_real" dataset in
# Open X-Embodiment (Apache-2.0 / CC-BY), the RLDS/TFRecord standard used by
# Google DeepMind's RT-X and the wider OXE collection. Source: real UR5
# hardware executing the Diffusion Policy paper's PushT task (Chi et al.,
# RSS 2023) -- a genuine real-robot counterpart to the simulated PushT
# dataset already ingested via LeRobot.
#
# RLDS nests each episode's per-timestep "steps" as flattened repeated
# feature lists inside one tf.train.Example, a real, non-obvious encoding
# that needs an explicit feature spec to parse correctly (verified against
# the dataset's own features.json before writing this).
#
# Requires: pip install tensorflow (needs Python <=3.13; no 3.14 wheels yet)
#           + ffmpeg on PATH
# Usage: python3 scripts/fetch-rlds.py

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import tensorflow as tf

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "rlds"
DATA_DIR = ROOT / "src" / "data"
OUT = ROOT / "public" / "videos" / "oxe-columbia-pusht-real"

BUCKET = "https://storage.googleapis.com/gdm-robotics-open-x-embodiment/columbia_cairlab_pusht_real/0.1.0"
SHARDS = [
    "columbia_cairlab_pusht_real-test.tfrecord-00000-of-00004",
    "columbia_cairlab_pusht_real-test.tfrecord-00001-of-00004",
    "columbia_cairlab_pusht_real-test.tfrecord-00002-of-00004",
]
DATASET_ID = "oxe-columbia-pusht-real"
ID_PREFIX = "oxe_pusht_real"
CONTROL_HZ = 10  # stated in the dataset's own per-step instruction text

FEATURES = {
    "steps/reward": tf.io.VarLenFeature(tf.float32),
    "steps/observation/robot_state": tf.io.VarLenFeature(tf.float32),
    "steps/observation/image": tf.io.VarLenFeature(tf.string),
    "steps/observation/natural_language_instruction": tf.io.VarLenFeature(tf.string),
}


def download():
    CACHE.mkdir(parents=True, exist_ok=True)
    paths = []
    for shard in SHARDS:
        p = CACHE / shard
        if not p.exists() or p.stat().st_size == 0:
            print(f"Downloading {shard} ...")
            urllib_request_retrieve(f"{BUCKET}/{shard}", p)
        paths.append(p)
    return paths


def urllib_request_retrieve(url, out_path):
    import urllib.request
    urllib.request.urlretrieve(url, out_path)


def shard_recorded_at(shard_name):
    # RLDS/OXE episodes carry no wall-clock timestamp field, so (same
    # honest-fallback pattern as fetch-robomimic.py) use the real shard
    # file's own upload date on the public bucket rather than "now".
    import urllib.request
    api_url = (
        "https://storage.googleapis.com/storage/v1/b/gdm-robotics-open-x-embodiment/o/"
        f"columbia_cairlab_pusht_real%2F0.1.0%2F{shard_name}"
    )
    try:
        with urllib.request.urlopen(api_url, timeout=20) as r:
            meta = json.loads(r.read())
        return meta.get("timeCreated", datetime.now(tz=timezone.utc).isoformat())
    except Exception:
        return datetime.now(tz=timezone.utc).isoformat()


def encode_video(jpeg_frames, out_path, fps):
    """Real per-timestep camera JPEGs -> one real MP4, via ffmpeg image2pipe."""
    proc = subprocess.Popen(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "image2pipe", "-framerate", str(fps), "-i", "-",
            "-pix_fmt", "yuv420p", "-vcodec", "libx264",
            str(out_path),
        ],
        stdin=subprocess.PIPE,
    )
    for frame in jpeg_frames:
        proc.stdin.write(frame)
    proc.stdin.close()
    ret = proc.wait()
    if ret != 0:
        raise RuntimeError(f"ffmpeg exited {ret} for {out_path}")


def write_episode_tfrecord(raw_example_bytes, out_path):
    with tf.io.TFRecordWriter(str(out_path)) as w:
        w.write(raw_example_bytes)


def main():
    shard_paths = download()
    OUT.mkdir(parents=True, exist_ok=True)

    episodes = []
    idx = 0
    for shard_path in shard_paths:
        shard_recorded = shard_recorded_at(shard_path.name)
        raw_ds = tf.data.TFRecordDataset(str(shard_path))
        for raw in raw_ds:
            parsed = tf.io.parse_single_example(raw, FEATURES)
            reward = tf.sparse.to_dense(parsed["steps/reward"]).numpy()
            robot_state = tf.sparse.to_dense(parsed["steps/observation/robot_state"]).numpy()
            images = tf.sparse.to_dense(parsed["steps/observation/image"], default_value=b"").numpy()
            instr = tf.sparse.to_dense(
                parsed["steps/observation/natural_language_instruction"], default_value=b""
            ).numpy()

            n_steps = len(reward)
            assert robot_state.shape[0] == n_steps * 2, "robot_state didn't reshape as expected -- schema mismatch"
            success = bool(reward.max() >= 1.0)  # verified pattern: a single 1.0 pulse marks success, not a sustained final value
            duration_s = round(n_steps / CONTROL_HZ, 2)
            instruction = instr[0].decode("utf-8")

            episode_id = f"{ID_PREFIX}_ep_{idx:05d}"
            ep_dir = OUT / episode_id
            ep_dir.mkdir(parents=True, exist_ok=True)

            video_path = ep_dir / "observation.mp4"
            encode_video(list(images), video_path, CONTROL_HZ)

            raw_path = ep_dir / "episode.tfrecord"
            write_episode_tfrecord(raw.numpy(), raw_path)

            episodes.append({
                "episodeId": episode_id,
                "datasetId": DATASET_ID,
                "sourceFormat": "rlds",
                "schemaVersion": "1.0",
                "policyVersion": "human-teleop",
                "task": {
                    "name": "Push T-block to target (real UR5)",
                    "languageInstruction": instruction,
                    "benchmarkPack": "manipulation-tabletop",
                },
                "embodiment": {
                    "robotType": "Fixed-base arm",
                    "model": "Universal Robots UR5",
                    "dof": 6,
                    "sensors": ["image", "wrist_image"],
                },
                "outcome": {
                    "success": success,
                    "methodOfDetermination": "automatic: episode reward reaches 1.0 (RLDS success pulse)",
                },
                "failure": None,
                "metrics": {"durationS": duration_s, "interventions": None, "collisions": None},
                "recordedAt": shard_recorded,
                "coverage": 1.0,
                "video": {
                    "url": f"/videos/{DATASET_ID}/{episode_id}/observation.mp4",
                    "camera": "image",
                    "fromS": 0,
                    "toS": duration_s,
                    "sourceUrl": f"{BUCKET}/{shard_path.name}",
                },
                "rawSourceUrl": f"/videos/{DATASET_ID}/{episode_id}/episode.tfrecord",
            })
            print(f"{episode_id}: {n_steps} steps, {duration_s}s, success={success}, instruction[:60]={instruction[:60]!r}")
            idx += 1

    n_success = sum(1 for e in episodes if e["outcome"]["success"])
    print(f"\nIngested {len(episodes)} episodes ({n_success} success, {len(episodes) - n_success} failure)")

    dataset = {
        "datasetId": DATASET_ID,
        "name": "PushT real robot (UR5, Open X-Embodiment / Diffusion Policy)",
        "sourceFormat": "rlds",
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

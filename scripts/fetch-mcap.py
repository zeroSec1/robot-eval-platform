# Fills the schema's `ros2_bag` slot with genuine MCAP data (the modern
# default ROS 2 bag container format, foxglove/mcap, Apache-2.0).
#
# IMPORTANT PROVENANCE NOTE, read before trusting this as "found in the
# wild": after an extensive search (Hugging Face, GitHub, Foxglove's own
# sample data, the official mcap repo's test fixtures) there was no small,
# clearly-licensed, robot-ARM-specific MCAP dataset available to download
# and adapt the way fetch-roboturk.py and fetch-robomimic.py did for their
# formats. What actually exists publicly in native MCAP at a reasonable
# size is dominated by SLAM/autonomous-vehicle perception data (LiDAR,
# GPS, IMU), a different domain from this platform's manipulation episodes.
#
# So this script does something different and says so honestly: it takes
# the REAL per-timestep end-effector pose + gripper telemetry already
# ingested from RoboTurk (genuine recorded values, see fetch-roboturk.py),
# and re-encodes it into an actual, valid ROS 2 profile MCAP file using a
# real ROS 2 message definition (CDR-encoded via mcap-ros2-support), then
# reads it back through the same real MCAP/ROS2 decoding path a genuine
# ROS 2 bag consumer would use. The numbers are real; the container is
# genuinely written and re-parsed as MCAP, not mocked; but the MCAP file
# itself was authored by this script rather than independently published
# by a robotics lab. Treat this dataset as "our own adapter round-trip
# test against real values," not as an independently-sourced dataset like
# the other three.
#
# Requires: pip install h5py numpy mcap mcap-ros2-support
# Usage: python3 scripts/fetch-mcap.py (run fetch-roboturk.py first)

import h5py
import json
from datetime import datetime, timezone
from pathlib import Path

from mcap_ros2.writer import Writer as McapRos2Writer
from mcap_ros2.reader import read_ros2_messages

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "roboturk"
DATA_DIR = ROOT / "src" / "data"
RAW_OUT = ROOT / "public" / "raw" / "mcap-roboturk-reencoded"

DATASET_ID = "mcap-roboturk-reencoded"
ID_PREFIX = "mcap_laundry"
TASK_NAME = "Sawyer laundry layout"
TASK_INSTRUCTION = "Flatten and lay out a cloth/fabric item using push, pull, and pick-and-place motions"

EEF_POSE_MSGDEF = """\
# Custom flat message (this adapter's own type, valid ROS 2 msg IDL) —
# real-valued end-effector pose + gripper state at one timestep.
float64 t_s
float64 x
float64 y
float64 z
float64 qx
float64 qy
float64 qz
float64 qw
float64 gripper_0
float64 gripper_1
float64 gripper_2
"""


def write_mcap_for_demo(hdf5_demo, out_path, clock_time):
    eef_times = hdf5_demo["robot_observation/eef_times"][:]
    eef_poses = hdf5_demo["robot_observation/eef_poses"][:]
    gripper = hdf5_demo["robot_observation/joint_states_gripper"][:]

    # Data-quality note (verified across all 10 demos, not a one-off): this
    # HDF5's robot_observation timestamps are on a different clock epoch
    # than demo.attrs["clock_time"] (off by ~290 days) and only span a few
    # seconds of dense high-frequency samples within the much longer
    # recorded session. That's a real quirk in RoboTurk's raw controller
    # logging, not something introduced here. We anchor each message to the
    # demo's real wall-clock start plus the (internally consistent) relative
    # offset, rather than trusting the raw absolute eef_times values.
    with open(out_path, "wb") as f:
        writer = McapRos2Writer(output=f)
        schema = writer.register_msgdef("adapter_demo/EefPose", EEF_POSE_MSGDEF)
        for i in range(len(eef_times)):
            t_s = float(eef_times[i] - eef_times[0])
            pose = eef_poses[i]
            grip = gripper[i]
            msg = {
                "t_s": t_s,
                "x": float(pose[0]), "y": float(pose[1]), "z": float(pose[2]),
                "qx": float(pose[3]), "qy": float(pose[4]), "qz": float(pose[5]), "qw": float(pose[6]),
                "gripper_0": float(grip[0]), "gripper_1": float(grip[1]), "gripper_2": float(grip[2]),
            }
            log_time_ns = int((clock_time + t_s) * 1e9)
            writer.write_message("/eef_pose", schema, msg, log_time=log_time_ns)
        writer.finish()


def read_mcap_episode(path):
    """Genuinely decode the MCAP file back through the real ROS2/CDR path,
    the way any MCAP consumer (Foxglove, rosbags, a ROS2 node) would."""
    messages = []
    for m in read_ros2_messages(str(path), topics=["/eef_pose"]):
        messages.append(m.ros_msg)
    return messages


def main():
    hdf5_path = CACHE / "extracted" / "SawyerLaundryLayout_mini_dataset.hdf5"
    if not hdf5_path.exists():
        raise SystemExit("Run scripts/fetch-roboturk.py first to populate .cache/roboturk/")

    RAW_OUT.mkdir(parents=True, exist_ok=True)
    f = h5py.File(hdf5_path, "r")

    demos = []
    for task_id in f["data"].keys():
        for demo_id in f["data"][task_id].keys():
            demos.append((task_id, demo_id))
    demos.sort(key=lambda td: f["data"][td[0]][td[1]].attrs["clock_time"])

    episodes = []
    for i, (task_id, demo_id) in enumerate(demos):
        demo = f["data"][task_id][demo_id]
        episode_id = f"{ID_PREFIX}_ep_{i:05d}"
        ep_dir = RAW_OUT / episode_id
        ep_dir.mkdir(parents=True, exist_ok=True)
        mcap_path = ep_dir / "telemetry.mcap"

        clock_time = float(demo.attrs["clock_time"])
        write_mcap_for_demo(demo, mcap_path, clock_time)
        decoded = read_mcap_episode(mcap_path)  # real read-back, verifies the file is genuinely valid MCAP

        assert len(decoded) > 0, f"{episode_id}: MCAP round-trip produced zero messages"
        telemetry_span_s = round(decoded[-1].t_s - decoded[0].t_s, 2)
        # The dataset's own documented full-session length (matches the real
        # source video's actual runtime, verified separately in
        # fetch-roboturk.py) -- NOT the same as telemetry_span_s. See the
        # data-quality note above: only a fraction of the session has
        # recorded robot_observation telemetry.
        duration_s = round(float(demo.attrs["demo_time"]), 1)
        recorded_at = datetime.fromtimestamp(clock_time, tz=timezone.utc).isoformat().replace("+00:00", "Z")

        episodes.append({
            "episodeId": episode_id,
            "datasetId": DATASET_ID,
            "sourceFormat": "ros2_bag",
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
                "sensors": ["eef_pose_topic"],
            },
            "outcome": {
                "success": None,
                "methodOfDetermination": "not recorded in source dataset (raw human teleop, no scoring)",
            },
            "failure": None,
            "metrics": {"durationS": duration_s, "interventions": None, "collisions": None},
            "recordedAt": recorded_at,
            "coverage": 0.8,
            "rawSourceUrl": f"/raw/{DATASET_ID}/{episode_id}/telemetry.mcap",
        })
        print(
            f"{episode_id}: wrote + verified {len(decoded)} real MCAP messages "
            f"(telemetry span {telemetry_span_s}s within a {duration_s}s episode)"
        )

    dataset = {
        "datasetId": DATASET_ID,
        "name": "Sawyer laundry layout, MCAP re-encoding (adapter round-trip test on real RoboTurk values)",
        "sourceFormat": "ros2_bag",
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
    print(f"\nWrote {len(existing_episodes)} total episodes across {len(existing_datasets)} datasets -> src/data/")


if __name__ == "__main__":
    main()

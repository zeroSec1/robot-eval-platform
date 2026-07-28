<p align="center">
  <img src="docs/header.png" alt="Robot Eval: episode detail view showing real PushT rollout footage, an anomaly-highlighted action/state timeline, and outcome/provenance panels" width="100%">
</p>

<h1 align="center">Robot Eval</h1>
<p align="center"><strong>A local-first dashboard for browsing, filtering, and diffing real robot-policy eval rollouts, across seven different data formats.</strong></p>

<p align="center">
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white">
  <img alt="Tailwind v4" src="https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=white">
  <img alt="Data" src="https://img.shields.io/badge/data-373%20real%20episodes%2C%207%20formats-1baf7a">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-eda100">
</p>

---

Every robot-eval team ends up with the same problem: rollouts land in
whatever format the recording stack happened to produce (LeRobot parquet, a
ROS 2 bag, a raw HDF5 dump, RLDS/TFRecord, a Zarr replay buffer, a folder of
CSVs and MP4s), and nobody can answer "did the new policy actually regress?"
without writing a one-off notebook per format.

**Robot Eval** normalizes all of that into one canonical episode schema, then
gives you three views on top of it: an overview of everything that's
happening across datasets, a filterable episode explorer with the real
observation video and per-timestep telemetry, and a policy-vs-policy compare
view that surfaces regressions by task and failure category automatically.

It ships pre-loaded with **373 real episodes across 12 public datasets, in
seven different source formats**: no mock data, no seed script required.
Clone it and it works.

## Features

- **Overview**: total episodes, success rate, avg. duration, collision rate,
  a 14-day rollout trend chart, and a failure-category breakdown, all
  computed live from whatever's in `src/data/`.
- **Episode explorer**: search by task/instruction/id, filter by outcome,
  dataset, source format, policy version, benchmark pack, or failure
  category, all URL-encoded so a filtered view is a shareable link.
- **Episode detail**: plays the actual observation video for that rollout
  when the format has one (real footage, not a placeholder), renders an
  action/state timeline with automatic anomaly highlighting, and shows
  outcome, metrics, embodiment, and full provenance. When the adapter kept
  one, "View raw source" links straight to that episode's real underlying
  data file, whatever shape that file takes for that format.
- **Compare**: pick a baseline and candidate policy version and get an
  instant regression report: success-rate delta, failure-category diff, and
  a per-task table sorted by the largest drop. "Which task got worse and why"
  is a page load, not an investigation.
- **Permissive ingestion**: the canonical `Episode` schema treats almost
  every field as optional and tracks a `coverage` score per episode, because
  real datasets never populate every field. Nothing breaks when data is
  missing; the gaps are just visible, and vary honestly by source (see below)
  -- some formats have video but no outcome, some have outcome but no video,
  one has neither.

## Screenshots

| | |
|---|---|
| ![Overview dashboard](docs/shot-overview.png) | ![Episode explorer with video thumbnails](docs/shot-episodes.png) |
| Overview: cross-dataset stats and trends | Episode explorer: filterable, with real video thumbnails |
| ![Episode detail with video and telemetry](docs/shot-episode-detail.png) | ![Compare two policy versions](docs/shot-compare.png) |
| Episode detail: real footage plus anomaly-highlighted telemetry | Compare: regression detection across policy versions |

## Quickstart

```bash
git clone git@github.com:zeroSec1/robot-eval-platform.git
cd robot-eval-platform
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). All 373 bundled
episodes' metadata is already in `src/data/`, so the app is fully usable
immediately. Video playback falls back to each dataset's original remote URL
until you run the download script below; the RoboTurk, RLDS, and Zarr
episodes already ship with local video from their own adapters.

To play LeRobot video fully offline (and get the poster frames the demo
screenshots show):

```bash
node scripts/download-videos.mjs
```

This mirrors every LeRobot-sourced clip into `public/videos/` and rewrites
each episode's `video.url` to the local copy. Safe to re-run, already
downloaded files are skipped.

## The bundled datasets

| Dataset | Format | Episodes | Task |
|---|---|---:|---|
| PushT, T-block pushing (sim) | LeRobot | 52 | Push a T-block onto a target |
| ALOHA static coffee | LeRobot | 50 | Bimanual teleop coffee task |
| SO-101 pick & place (SmolVLA) | LeRobot | 50 | Tabletop pick & place |
| Mobile ALOHA, cook shrimp | LeRobot | 18 | Mobile manipulation |
| Mobile ALOHA, wash pan | LeRobot | 50 | Mobile manipulation |
| RJ45 cable insertion (ACT policy eval) | LeRobot | 50 | Precision insertion, ACT checkpoint |
| Sawyer laundry layout (RoboTurk, real teleop) | CSV + video | 10 | Flatten and lay out a cloth item |
| Lift cube, proficient human (robomimic) | HDF5 | 40 | Lift a cube (real Franka Panda arm, sim) |
| Sawyer laundry layout, MCAP re-encoding | ROS 2 bag | 10 | Same task as the CSV+video row, different container |
| PushT real robot (UR5, Open X-Embodiment) | RLDS | 8 | Push a T-block onto a target, real hardware |
| PushT sim replay buffer (Diffusion Policy) | Zarr | 20 | Push a T-block onto a target, native training data |
| GraspGen Franka Panda grasp evaluations | WebDataset | 15 | Grasp and lift an object (2000 pose candidates each) |

Seven independent adapters feed the same schema. Run them in this order --
`fetch-lerobot.mjs` overwrites `src/data/` wholesale, everything else merges
into whatever's already there:

1. **LeRobot** (`scripts/fetch-lerobot.mjs`, Node): reads parquet episode
   metadata straight from public [LeRobot](https://huggingface.co/lerobot)
   datasets on Hugging Face via [`hyparquet`](https://github.com/hyparam/hyparquet).
2. **CSV + video** (`scripts/fetch-roboturk.py`): downloads Stanford's real,
   MIT-licensed [RoboTurk teleoperation dataset](https://github.com/RoboTurk-Platform/roboturk_real_dataset),
   converts its HDF5 telemetry into a genuine per-episode CSV next to the
   real demonstration video.
3. **HDF5** (`scripts/fetch-robomimic.py`): ingests the real, MIT-licensed
   [robomimic](https://robomimic.github.io) Lift/PH dataset (simulated Franka
   Panda) directly, reading actions/rewards/states from the source file
   rather than converting format first. No video in this observation
   variant -- a real, honest gap, not one this adapter introduces.
4. **ROS 2 bag / MCAP** (`scripts/fetch-mcap.py`): no small, licensed,
   robot-arm-specific MCAP dataset was findable publicly (that space is
   dominated by SLAM/autonomous-vehicle data). This adapter is transparent
   about it: it re-encodes real RoboTurk telemetry into a genuine ROS 2
   profile MCAP file and reads it back through the real decode path, rather
   than claiming an independently-sourced dataset it couldn't find.
5. **RLDS** (`scripts/fetch-rlds.py`): reads real UR5 hardware rollouts from
   Open X-Embodiment's `columbia_cairlab_pusht_real` (Apache-2.0/CC-BY),
   the Diffusion Policy paper's real-robot PushT data -- a genuine
   sim-vs-real counterpart to the LeRobot PushT row above.
6. **Zarr** (`scripts/fetch-zarr.py`): reads the real PushT sim replay
   buffer that actually trained the published Diffusion Policy model (MIT
   licensed, `real-stanford/diffusion_policy`), independent of the LeRobot
   mirror of the same env.
7. **WebDataset** (`scripts/fetch-webdataset.py`): reads real grasp-pose
   evaluations from NVIDIA's [GraspGen](https://huggingface.co/datasets/nvidia/PhysicalAI-Robotics-GraspGen)
   (CC-BY 4.0), genuinely shipped as WebDataset tar shards. This data is
   static grasp candidates, not temporal rollouts, so those episodes
   honestly have no video and no duration -- that's the real shape of the
   format's typical use in robotics, not a gap introduced here.

The `coverage` field earns its keep across these: LeRobot sources mostly
carry recorded outcomes, RoboTurk and the MCAP re-encoding have real video
but no outcome label, robomimic has a real outcome but no video, GraspGen
has neither video nor duration, and RLDS is the only format with everything
populated. That spread is the real, honest state of these formats, not
something smoothed over.

## Data model

Every source format gets adapted into one canonical shape, so the UI never
has to know whether an episode came from a LeRobot parquet file, a Zarr
replay buffer, or a raw CSV log:

```ts
interface Episode {
  episodeId: string;
  datasetId: string;
  sourceFormat: "lerobot" | "ros2_bag" | "csv_video" | "hdf5" | "rlds" | "zarr" | "webdataset";
  policyVersion: string;
  task: Task;
  embodiment: Embodiment;
  outcome: Outcome;                 // success, and how it was determined
  failure: Failure | null;          // category + subcategory, if any
  metrics: Metrics;                 // duration, interventions, collisions
  video?: VideoRef;                 // real observation footage, when available
  rawSourceUrl?: string;            // link to the episode's real underlying data file
  coverage: number;                 // 0-1: how much of the schema is actually populated
}
```

Optional fields aren't a modeling compromise, they're the point. Real eval
data is never fully populated, so `coverage` makes the gaps a first-class,
sortable/filterable signal instead of something the UI has to paper over.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS v4
- No backend, no database: episode/dataset JSON in `src/data/` is the entire
  persistence layer, read at build/request time
- Data pipeline: seven adapters (Node + Python, see above) normalizing
  LeRobot, RoboTurk, robomimic, MCAP, RLDS, Zarr, and WebDataset sources
  into one schema, plus `scripts/download-videos.mjs` to mirror LeRobot
  video for offline playback

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` | ESLint |
| `node scripts/fetch-lerobot.mjs` | Refresh `src/data/` from public LeRobot datasets (run this first) |
| `python3 scripts/fetch-roboturk.py` | Ingest the RoboTurk CSV + video dataset (`pip install h5py numpy`) |
| `python3 scripts/fetch-robomimic.py` | Ingest the robomimic HDF5 dataset (`pip install h5py numpy`) |
| `python3 scripts/fetch-mcap.py` | Ingest the MCAP re-encoding (`pip install h5py numpy mcap mcap-ros2-support`; run after `fetch-roboturk.py`) |
| `python3 scripts/fetch-rlds.py` | Ingest the RLDS/TFRecord dataset (`pip install tensorflow`, needs Python <=3.13; plus `ffmpeg` on PATH) |
| `python3 scripts/fetch-zarr.py` | Ingest the Zarr replay buffer (`pip install zarr numpy`; plus `ffmpeg` on PATH) |
| `python3 scripts/fetch-webdataset.py` | Ingest the WebDataset grasp evaluations (stdlib only) |
| `node scripts/download-videos.mjs` | Mirror LeRobot episode videos into `public/videos/` for offline playback |
| `python3 scripts/capture-guide-shots.py` | Regenerate documentation screenshots (Playwright, needs the app running on `:3000`) |
| `python3 scripts/build-guide-pdf.py` | Rebuild `Robot Eval User Guide.pdf` |

## License

MIT, see [LICENSE](LICENSE).

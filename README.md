<p align="center">
  <img src="docs/header.png" alt="Robot Eval — episode detail view showing real PushT rollout footage, an anomaly-highlighted action/state timeline, and outcome/provenance panels" width="100%">
</p>

<h1 align="center">Robot Eval</h1>
<p align="center"><strong>A local-first dashboard for browsing, filtering, and diffing real robot-policy eval rollouts.</strong></p>

<p align="center">
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white">
  <img alt="Tailwind v4" src="https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=white">
  <img alt="Data" src="https://img.shields.io/badge/data-real%20LeRobot%20datasets-1baf7a">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-eda100">
</p>

---

Every robot-eval team ends up with the same problem: rollouts land in whatever
format the recording stack happened to produce — LeRobot parquet, a ROS 2
bag, a folder of CSVs and MP4s — and nobody can answer "did the new policy
actually regress?" without writing a one-off notebook.

**Robot Eval** normalizes all of that into one canonical episode schema, then
gives you three views on top of it: an overview of everything that's
happening across datasets, a filterable episode explorer with the real
observation video and per-timestep telemetry, and a policy-vs-policy compare
view that surfaces regressions by task and failure category automatically.

It ships pre-loaded with **270 real episodes across 6 public LeRobot
datasets** — no mock data, no seed script required. Clone it and it works.

## Features

- **Overview** — total episodes, success rate, avg. duration, collision
  rate, a 14-day rollout trend chart, and a failure-category breakdown, all
  computed live from whatever's in `src/data/`.
- **Episode explorer** — search by task/instruction/id, filter by outcome,
  dataset, source format, policy version, benchmark pack, or failure
  category, all URL-encoded so a filtered view is a shareable link.
- **Episode detail** — plays the actual observation video for that rollout
  (real footage, not a placeholder), renders an action/state timeline with
  automatic anomaly highlighting, and shows outcome, metrics, embodiment,
  and full provenance, plus the raw canonical JSON for that episode.
- **Compare** — pick a baseline and candidate policy version and get an
  instant regression report: success-rate delta, failure-category diff, and
  a per-task table sorted by the largest drop — so "which task got worse and
  why" is a page load, not an investigation.
- **Permissive ingestion** — the canonical `Episode` schema treats almost
  every field as optional and tracks a `coverage` score per episode, because
  real datasets never populate every field. Nothing breaks when data is
  missing; the gaps are just visible.

## Screenshots

| | |
|---|---|
| ![Overview dashboard](docs/shot-overview.png) | ![Episode explorer with video thumbnails](docs/shot-episodes.png) |
| Overview — cross-dataset stats and trends | Episode explorer — filterable, with real video thumbnails |
| ![Episode detail with video and telemetry](docs/shot-episode-detail.png) | ![Compare two policy versions](docs/shot-compare.png) |
| Episode detail — real footage + anomaly-highlighted telemetry | Compare — regression detection across policy versions |

## Quickstart

```bash
git clone git@github.com:zeroSec1/robot-eval-platform.git
cd robot-eval-platform
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The 270 bundled
episodes' metadata is already in `src/data/`, so the app is fully usable
immediately. Video playback falls back to each dataset's original Hugging
Face URL until you run the download script below.

To play video fully offline (and get the poster frames the demo screenshots
show):

```bash
node scripts/download-videos.mjs
```

This mirrors every referenced clip into `public/videos/` and rewrites each
episode's `video.url` to the local copy — safe to re-run, already-downloaded
files are skipped.

## The bundled datasets

| Dataset | Format | Episodes | Task |
|---|---|---:|---|
| PushT — T-block pushing | LeRobot | 52 | Push a T-block onto a target |
| ALOHA static coffee | LeRobot | 50 | Bimanual teleop coffee task |
| SO-101 pick & place (SmolVLA) | LeRobot | 50 | Tabletop pick & place |
| Mobile ALOHA — cook shrimp | LeRobot | 18 | Mobile manipulation |
| Mobile ALOHA — wash pan | LeRobot | 50 | Mobile manipulation |
| RJ45 cable insertion (ACT policy eval) | LeRobot | 50 | Precision insertion, ACT checkpoint |

Pulled straight from public [LeRobot](https://huggingface.co/lerobot)
datasets on Hugging Face via `scripts/fetch-lerobot.mjs`, which reads the
parquet episode metadata with [`hyparquet`](https://github.com/hyparam/hyparquet)
and normalizes it into the schema below. Re-run it to refresh or add
datasets — it writes straight into `src/data/`.

## Data model

Every source format gets adapted into one canonical shape, so the UI never
has to know whether an episode came from a LeRobot parquet file or a ROS 2
bag:

```ts
interface Episode {
  episodeId: string;
  datasetId: string;
  sourceFormat: "lerobot" | "ros2_bag" | "csv_video";
  policyVersion: string;
  task: Task;
  embodiment: Embodiment;
  outcome: Outcome;                 // success, and how it was determined
  failure: Failure | null;          // category + subcategory, if any
  metrics: Metrics;                 // duration, interventions, collisions
  video?: VideoRef;                 // real observation footage, when available
  coverage: number;                 // 0–1: how much of the schema is actually populated
}
```

Optional fields aren't a modeling compromise — they're the point. Real
eval data is never fully populated, so `coverage` makes the gaps a first-class,
sortable/filterable signal instead of something the UI has to paper over.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS v4
- No backend, no database — episode/dataset JSON in `src/data/` is the
  entire persistence layer, read at build/request time
- Data pipeline: `scripts/fetch-lerobot.mjs` (Hugging Face → canonical JSON)
  and `scripts/download-videos.mjs` (mirror video for offline playback)

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` | ESLint |
| `node scripts/fetch-lerobot.mjs` | Refresh `src/data/` from public LeRobot datasets |
| `node scripts/download-videos.mjs` | Mirror episode videos into `public/videos/` for offline playback |
| `python3 scripts/capture-guide-shots.py` | Regenerate documentation screenshots (Playwright, needs the app running on `:3000`) |
| `python3 scripts/build-guide-pdf.py` | Rebuild `Robot Eval — User Guide.pdf` |

## License

MIT — see [LICENSE](LICENSE).

<h1 align="center">Robot Eval</h1>
<p align="center"><strong>A local-first dashboard for browsing, filtering, and diffing robot-policy eval rollouts.</strong></p>

<p align="center">
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white">
  <img alt="Tailwind v4" src="https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=white">
  <img alt="Branch" src="https://img.shields.io/badge/branch-develop%20(clean%2C%20BYO%20data)-eda100">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-eda100">
</p>

---

**This is the `develop` branch: a clean starting point with no bundled
data.** `src/data/real-episodes.json` and `src/data/real-datasets.json` are
both empty arrays. For a fully pre-loaded demo with 373 real episodes across
7 formats, see the [`main`](../../tree/main) branch instead.

Every robot-eval team ends up with rollouts landing in whatever format the
recording stack happened to produce (LeRobot parquet, a ROS 2 bag, a raw
HDF5 dump, RLDS/TFRecord, a Zarr replay buffer, a folder of CSVs and MP4s).
**Robot Eval** normalizes all of that into one canonical episode schema, then
gives you three views on top of it: an overview across datasets, a
filterable episode explorer with video and per-timestep telemetry, and a
policy-vs-policy compare view that surfaces regressions automatically.

## Bring your own data

The app reads `src/data/real-episodes.json` and `src/data/real-datasets.json`
at build/request time; nothing else is wired to a backend. Both start as
empty arrays (`[]`) on this branch.

`scripts/fetch-*.{mjs,py}` are real, working reference adapters carried over
from `main` (LeRobot, RoboTurk-style CSV+video, robomimic-style HDF5,
MCAP/ROS 2 bag, RLDS/TFRecord, Zarr, and WebDataset), each pointed at its own
real public dataset. You can:

- **Run one as-is** to populate `src/data/` with that real reference dataset
  (e.g. `node scripts/fetch-lerobot.mjs`), or
- **Copy the one closest to your source format** and repoint it at your own
  data, normalizing into the canonical `Episode` shape below.

Every adapter merges into whatever's already in `src/data/` rather than
overwriting it, except `fetch-lerobot.mjs`, which resyncs its own LeRobot
sources wholesale, so run that one first if you're using it at all.

## Quickstart

```bash
git clone -b develop git@github.com:zeroSec1/robot-eval-platform.git
cd robot-eval-platform
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With no data ingested
yet, every view renders its real empty state (`0` episodes, `—` for
unavailable metrics) rather than breaking, so you can confirm the app itself
works before writing an adapter.

## Data model

Every source format adapts into one canonical shape, so the UI never has to
know whether an episode came from a LeRobot parquet file, a Zarr replay
buffer, or a raw CSV log:

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

Almost every field is optional on purpose, not as a modeling compromise:
real eval data is never fully populated (some sources have video but no
outcome label, some have an outcome but no video), so `coverage` makes that
a first-class, sortable/filterable signal instead of something the UI has to
paper over or fake. Add a new `sourceFormat` value to `src/lib/types.ts`'s
`SourceFormat` union and `SOURCE_FORMAT_LABEL` map if your source doesn't
match one of the seven already listed; the episode explorer's filters and
badges pick it up automatically, nothing else needs to change.

Full field definitions: `src/lib/types.ts`.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS v4
- No backend, no database: episode/dataset JSON in `src/data/` is the entire
  persistence layer, read at build/request time

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` | ESLint |

## License

MIT, see [LICENSE](LICENSE).

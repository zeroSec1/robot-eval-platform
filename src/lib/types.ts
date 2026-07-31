// Canonical episode schema — mirrors the adapter-normalized shape described
// in the project handoff. Every optional field reflects a real dataset
// where that data simply isn't recorded ("ingest permissively").

export type SourceFormat =
  | "lerobot"
  | "ros2_bag"
  | "csv_video"
  | "hdf5"
  | "rlds"
  | "zarr"
  | "webdataset"
  | "custom";

export const SOURCE_FORMAT_LABEL: Record<SourceFormat, string> = {
  lerobot: "LeRobot",
  ros2_bag: "ROS 2 bag",
  csv_video: "CSV + video",
  hdf5: "HDF5",
  rlds: "RLDS",
  zarr: "Zarr",
  webdataset: "WebDataset",
  custom: "Your upload",
};

export type FailureCategory =
  | "grasp_slipped"
  | "missed_grasp"
  | "dropped_object"
  | "wrong_object"
  | "collision"
  | "stalled"
  | "plan_failure";

export const FAILURE_CATEGORY_LABEL: Record<FailureCategory, string> = {
  grasp_slipped: "Grasp slipped",
  missed_grasp: "Missed grasp",
  dropped_object: "Dropped object",
  wrong_object: "Wrong object",
  collision: "Collision",
  stalled: "Stalled / timeout",
  plan_failure: "Planning failure",
};

export const FAILURE_CATEGORIES = Object.keys(
  FAILURE_CATEGORY_LABEL,
) as FailureCategory[];

export interface Embodiment {
  robotType: string;
  model: string;
  dof: number;
  sensors: string[];
}

export interface Task {
  name: string;
  languageInstruction: string;
  benchmarkPack: string;
}

export interface Outcome {
  success: boolean | null;
  methodOfDetermination: string;
}

export interface Failure {
  category: FailureCategory;
  subcategory: string;
  notes: string;
}

export interface Metrics {
  durationS: number | null;
  interventions: number | null;
  collisions: number | null;
}

export interface VideoRef {
  /** URL the app plays — a local /videos/… path once downloaded, else remote. */
  url: string;
  /** Per-episode H.264 clip (starts at 0s) for browsers that can't decode the
   * source codec — WebKit/Safari has no AV1 support. Tried first when present. */
  clipUrl?: string;
  camera: string;
  /** Segment of the file belonging to this episode, in seconds. */
  fromS: number;
  toS: number;
  /** Original remote URL on the dataset host (kept for provenance). */
  sourceUrl?: string;
}

export interface Episode {
  episodeId: string;
  datasetId: string;
  sourceFormat: SourceFormat;
  schemaVersion: string;
  policyVersion: string;
  task: Task;
  embodiment: Embodiment;
  outcome: Outcome;
  failure: Failure | null;
  metrics: Metrics;
  recordedAt: string;
  /** Fraction (0-1) of optional canonical fields actually populated for this episode. */
  coverage: number;
  /** Real observation video, when the source dataset provides one. */
  video?: VideoRef;
  /** Link to this episode's raw underlying data file (e.g. a telemetry CSV), when the adapter kept one. */
  rawSourceUrl?: string;
}

export interface Dataset {
  datasetId: string;
  name: string;
  sourceFormat: SourceFormat;
  ingestedAt: string;
}

export interface TelemetryTrack {
  name: string;
  /** Downsampled, 0..1-normalized bar heights over the episode's duration. */
  bars: number[];
}

/** Real per-episode signal series extracted from the source dataset, plus a
 * genuinely detected anomaly moment for failed episodes (null otherwise). */
export interface EpisodeTelemetry {
  hz: number;
  tracks: TelemetryTrack[];
  anomalyS: number | null;
  anomalyMethod: string | null;
}

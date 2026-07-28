// Mirrors ../../src/lib/types.ts. Kept as a standalone copy (not a
// cross-package import) so this MCP server builds and runs independently
// of the Next.js app's tsconfig/bundler. Keep in sync if the app's schema
// changes — it's a small, stable file.

export type SourceFormat = "lerobot" | "ros2_bag" | "csv_video" | "hdf5" | "rlds" | "zarr" | "webdataset";

export const SOURCE_FORMAT_LABEL: Record<SourceFormat, string> = {
  lerobot: "LeRobot",
  ros2_bag: "ROS 2 bag",
  csv_video: "CSV + video",
  hdf5: "HDF5",
  rlds: "RLDS",
  zarr: "Zarr",
  webdataset: "WebDataset",
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

export const FAILURE_CATEGORIES = Object.keys(FAILURE_CATEGORY_LABEL) as FailureCategory[];

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
  url: string;
  camera: string;
  fromS: number;
  toS: number;
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
  coverage: number;
  video?: VideoRef;
  rawSourceUrl?: string;
}

export interface Dataset {
  datasetId: string;
  name: string;
  sourceFormat: SourceFormat;
  ingestedAt: string;
}

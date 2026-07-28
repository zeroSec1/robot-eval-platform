import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  Dataset,
  Episode,
  FAILURE_CATEGORIES,
  FailureCategory,
} from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// This server lives at mcp-server/src/ — the app's data is two levels up.
const APP_ROOT = path.resolve(__dirname, "..", "..");
const EPISODES_PATH = path.join(APP_ROOT, "src", "data", "real-episodes.json");
const DATASETS_PATH = path.join(APP_ROOT, "src", "data", "real-datasets.json");

let cachedEpisodes: Episode[] | null = null;
let cachedDatasets: Dataset[] | null = null;

/** Re-reads from disk each call (no caching across calls) so the server
 * always reflects the current contents of src/data/, in case an adapter
 * script re-ingests data while this server is running. */
export function loadEpisodes(): Episode[] {
  cachedEpisodes = JSON.parse(readFileSync(EPISODES_PATH, "utf-8")) as Episode[];
  return cachedEpisodes;
}

export function loadDatasets(): Dataset[] {
  cachedDatasets = JSON.parse(readFileSync(DATASETS_PATH, "utf-8")) as Dataset[];
  return cachedDatasets;
}

export interface EpisodeFilter {
  datasetId?: string;
  sourceFormat?: string;
  policyVersion?: string;
  outcome?: "success" | "failure" | "unscored";
  failureCategory?: FailureCategory;
  taskQuery?: string;
}

export function filterEpisodes(episodes: Episode[], filter: EpisodeFilter): Episode[] {
  return episodes.filter((e) => {
    if (filter.datasetId && e.datasetId !== filter.datasetId) return false;
    if (filter.sourceFormat && e.sourceFormat !== filter.sourceFormat) return false;
    if (filter.policyVersion && e.policyVersion !== filter.policyVersion) return false;
    if (filter.failureCategory && e.failure?.category !== filter.failureCategory) return false;
    if (filter.outcome === "success" && e.outcome.success !== true) return false;
    if (filter.outcome === "failure" && e.outcome.success !== false) return false;
    if (filter.outcome === "unscored" && e.outcome.success !== null) return false;
    if (filter.taskQuery) {
      const q = filter.taskQuery.toLowerCase();
      const hay = `${e.task.name} ${e.task.languageInstruction} ${e.episodeId}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

// --- Ported from ../../src/lib/mock-data.ts (computeStats/compareVersions).
// Duplicated rather than imported for the same self-containment reason as
// types.ts — small and stable, keep in sync if the app's logic changes.

export interface Stats {
  total: number;
  scoredCount: number;
  unscoredCount: number;
  successCount: number;
  successRate: number;
  avgDurationS: number | null;
  avgInterventions: number | null;
  collisionRate: number;
  byFailureCategory: Record<FailureCategory, number>;
}

function avg(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function computeStats(episodes: Episode[]): Stats {
  const total = episodes.length;
  const scored = episodes.filter((e) => e.outcome.success !== null);
  const successCount = scored.filter((e) => e.outcome.success).length;
  const durations = episodes.map((e) => e.metrics.durationS).filter((d): d is number => d !== null);
  const interventions = episodes
    .map((e) => e.metrics.interventions)
    .filter((v): v is number => v !== null);
  const withCollisionData = episodes.filter((e) => e.metrics.collisions !== null);
  const collisionEpisodes = withCollisionData.filter((e) => (e.metrics.collisions ?? 0) > 0);

  const byFailureCategory = Object.fromEntries(FAILURE_CATEGORIES.map((c) => [c, 0])) as Record<
    FailureCategory,
    number
  >;
  for (const e of episodes) {
    if (e.failure) byFailureCategory[e.failure.category] += 1;
  }

  return {
    total,
    scoredCount: scored.length,
    unscoredCount: total - scored.length,
    successCount,
    successRate: scored.length ? successCount / scored.length : 0,
    avgDurationS: durations.length ? avg(durations) : null,
    avgInterventions: interventions.length ? avg(interventions) : null,
    collisionRate: withCollisionData.length ? collisionEpisodes.length / withCollisionData.length : 0,
    byFailureCategory,
  };
}

export interface Regression {
  taskName: string;
  benchmarkPack: string;
  baseline: { policyVersion: string; successRate: number; n: number };
  candidate: { policyVersion: string; successRate: number; n: number };
  delta: number;
  topFailureCategoryCandidate: FailureCategory | null;
}

export function compareVersions(episodes: Episode[], baselineVersion: string, candidateVersion: string) {
  const baselineEpisodes = episodes.filter((e) => e.policyVersion === baselineVersion);
  const candidateEpisodes = episodes.filter((e) => e.policyVersion === candidateVersion);

  const taskNames = Array.from(new Set([...baselineEpisodes, ...candidateEpisodes].map((e) => e.task.name)));

  const regressions: Regression[] = taskNames
    .map((taskName) => {
      const base = baselineEpisodes.filter((e) => e.task.name === taskName && e.outcome.success !== null);
      const cand = candidateEpisodes.filter((e) => e.task.name === taskName && e.outcome.success !== null);
      if (!base.length || !cand.length) return null;
      const baseRate = base.filter((e) => e.outcome.success).length / base.length;
      const candRate = cand.filter((e) => e.outcome.success).length / cand.length;
      const failuresInCandidate = cand.filter((e) => e.failure);
      const counts: Partial<Record<FailureCategory, number>> = {};
      for (const e of failuresInCandidate) {
        if (!e.failure) continue;
        counts[e.failure.category] = (counts[e.failure.category] ?? 0) + 1;
      }
      const top = (Object.entries(counts) as [FailureCategory, number][]).sort((a, b) => b[1] - a[1])[0];
      return {
        taskName,
        benchmarkPack: (base[0] ?? cand[0]).task.benchmarkPack,
        baseline: { policyVersion: baselineVersion, successRate: baseRate, n: base.length },
        candidate: { policyVersion: candidateVersion, successRate: candRate, n: cand.length },
        delta: candRate - baseRate,
        topFailureCategoryCandidate: top ? top[0] : null,
      };
    })
    .filter((r): r is Regression => r !== null)
    .sort((a, b) => a.delta - b.delta);

  return {
    baselineStats: computeStats(baselineEpisodes),
    candidateStats: computeStats(candidateEpisodes),
    regressions,
  };
}

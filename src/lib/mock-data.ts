import { Dataset, Episode, FAILURE_CATEGORIES, FailureCategory } from "./types";
import realEpisodesJson from "@/data/real-episodes.json";
import realDatasetsJson from "@/data/real-datasets.json";

// All data is real, ingested from public LeRobot datasets on Hugging Face via
// `node scripts/fetch-lerobot.mjs` (videos localized by download-videos.mjs).
export const EPISODES: Episode[] = realEpisodesJson as unknown as Episode[];
export const DATASETS: Dataset[] = realDatasetsJson as unknown as Dataset[];

/** Every policy version present in the data. */
export const POLICY_VERSIONS: string[] = Array.from(
  new Set(EPISODES.map((e) => e.policyVersion)),
);

/** Default versions the compare view and dashboard regression callout diff. */
export const DEFAULT_BASELINE = "human-teleop";
export const DEFAULT_CANDIDATE = "act-rj45-ckpt40k";

export function getEpisodeById(id: string): Episode | undefined {
  return EPISODES.find((e) => e.episodeId === id);
}

export function getDatasetById(id: string): Dataset | undefined {
  return DATASETS.find((d) => d.datasetId === id);
}

export interface Stats {
  total: number;
  /** Episodes whose outcome was actually determined (success !== null). */
  scoredCount: number;
  unscoredCount: number;
  successCount: number;
  /** Success rate over SCORED episodes only — unscored episodes are not failures. */
  successRate: number;
  avgDurationS: number | null;
  avgInterventions: number | null;
  collisionRate: number;
  byFailureCategory: Record<FailureCategory, number>;
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

  const byFailureCategory = Object.fromEntries(
    FAILURE_CATEGORIES.map((c) => [c, 0]),
  ) as Record<FailureCategory, number>;
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
    collisionRate: withCollisionData.length
      ? collisionEpisodes.length / withCollisionData.length
      : 0,
    byFailureCategory,
  };
}

function avg(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export interface Regression {
  taskName: string;
  benchmarkPack: string;
  baseline: { policyVersion: string; successRate: number; n: number };
  candidate: { policyVersion: string; successRate: number; n: number };
  delta: number;
  topFailureCategoryCandidate: FailureCategory | null;
}

export function compareVersions(
  episodes: Episode[],
  baselineVersion: string,
  candidateVersion: string,
) {
  const baselineEpisodes = episodes.filter((e) => e.policyVersion === baselineVersion);
  const candidateEpisodes = episodes.filter((e) => e.policyVersion === candidateVersion);

  const taskNames = Array.from(
    new Set([...baselineEpisodes, ...candidateEpisodes].map((e) => e.task.name)),
  );

  const regressions: Regression[] = taskNames
    .map((taskName) => {
      // Score strictly: rates over episodes whose outcome was determined.
      const base = baselineEpisodes.filter(
        (e) => e.task.name === taskName && e.outcome.success !== null,
      );
      const cand = candidateEpisodes.filter(
        (e) => e.task.name === taskName && e.outcome.success !== null,
      );
      if (!base.length || !cand.length) return null;
      const baseRate = base.filter((e) => e.outcome.success).length / base.length;
      const candRate = cand.filter((e) => e.outcome.success).length / cand.length;
      const failuresInCandidate = cand.filter((e) => e.failure);
      const counts: Partial<Record<FailureCategory, number>> = {};
      for (const e of failuresInCandidate) {
        if (!e.failure) continue;
        counts[e.failure.category] = (counts[e.failure.category] ?? 0) + 1;
      }
      const top = (Object.entries(counts) as [FailureCategory, number][]).sort(
        (a, b) => b[1] - a[1],
      )[0];
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

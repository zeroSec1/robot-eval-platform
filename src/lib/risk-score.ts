// Conformal anomaly scoring for episode duration, built on split conformal
// prediction (Angelopoulos & Bates, "A Gentle Introduction to Conformal
// Prediction and Distribution-Free Uncertainty Quantification",
// arxiv.org/abs/2107.07511, MIT-licensed reference implementation verified
// directly against the repo's LICENSE file before relying on this method;
// the actual code below is a from-scratch reimplementation of the standard
// split-conformal algorithm, not a copy of anyone's repo).
//
// What this honestly is: a statistically-grounded "how unusual is this
// episode's duration compared to known-successful runs of the same task"
// score, with a real distribution-free coverage guarantee. What this is
// NOT: a failure predictor. We do not claim to predict whether a robot
// will fail before it does; our labeled data (60 of 308 episodes, all
// from one task family, zero intervention/collision telemetry) doesn't
// support that claim, and a demo overclaiming it already caused real
// confusion once (the "predicts failure before it happens" pitch language
// was walked back for exactly this reason).
//
// The conformal p-value below answers a narrower, honest question: "if
// this episode came from the same distribution as our successful
// calibration runs, how surprising would a duration this extreme be?" A
// low p-value means the duration looks statistically unlike the successful
// runs we've seen: worth a human's attention, not proof of anything.

import { Episode } from "./types";

export interface RiskScoreResult {
  /** Conformal p-value in (0, 1]. Small values (e.g. < 0.1) mean the episode's
   * duration is more extreme than most successful calibration runs. */
  pValue: number;
  /** Raw nonconformity score (median-absolute-deviation-normalized distance
   * from the calibration median). Useful for sorting/ranking, not for
   * direct probability interpretation on its own. */
  nonconformityScore: number;
  /** How many successful episodes backed this score. Below ~20, treat the
   * p-value as directional only; conformal guarantees hold asymptotically
   * and are looser with a small calibration set. */
  calibrationSize: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function medianAbsoluteDeviation(values: number[], center: number): number {
  const deviations = values.map((v) => Math.abs(v - center));
  return median(deviations);
}

/** Median-absolute-deviation-normalized distance of `value` from the
 * calibration set's median: a robust nonconformity score that isn't
 * skewed by a handful of outliers the way a z-score (mean/stddev) would be. */
export function nonconformityScore(value: number, reference: number[]): number {
  if (reference.length === 0) return 0;
  const center = median(reference);
  const mad = medianAbsoluteDeviation(reference, center);
  // A zero MAD (every reference value identical) would make any deviation
  // "infinitely" nonconforming; fall back to a small epsilon so a single
  // exact match among degenerate reference data doesn't divide by zero.
  return Math.abs(value - center) / (mad || 1e-6);
}

/** Leave-one-out nonconformity scores for the calibration set itself: the
 * null distribution the test episode's score gets compared against. */
export function calibrationScores(reference: number[]): number[] {
  return reference.map((value, i) => {
    const rest = reference.slice(0, i).concat(reference.slice(i + 1));
    return nonconformityScore(value, rest);
  });
}

/** Standard split-conformal p-value: the fraction of calibration scores at
 * least as extreme as the test score, with the "+1" smoothing that keeps
 * the p-value from ever hitting exactly 0 (Vovk et al.'s standard
 * construction: it guarantees P(p-value <= alpha) <= alpha under
 * exchangeability, for any calibration set size). */
export function conformalPValue(testScore: number, calibration: number[]): number {
  if (calibration.length === 0) return 1;
  const atLeastAsExtreme = calibration.filter((s) => s >= testScore).length;
  return (atLeastAsExtreme + 1) / (calibration.length + 1);
}

/** Score a single duration against a reference set of successful durations
 * from the same task. Returns null if there isn't enough calibration data
 * to say anything honest (fewer than 5 successful reference episodes). */
export function scoreDuration(durationS: number, successfulDurations: number[]): RiskScoreResult | null {
  if (successfulDurations.length < 5) return null;
  const calib = calibrationScores(successfulDurations);
  const testScore = nonconformityScore(durationS, successfulDurations);
  return {
    pValue: conformalPValue(testScore, calib),
    nonconformityScore: testScore,
    calibrationSize: successfulDurations.length,
  };
}

/** Per-task-name map of successful episodes' durations: the calibration
 * reference set each episode of that task gets scored against. Scoped by
 * task name (not dataset) because the same task ("Push T-block to target")
 * legitimately spans multiple datasets (sim + a real UR5 recording of the
 * same task), and both belong in one calibration pool. */
export type TaskCalibration = Map<string, number[]>;

export function buildTaskCalibration(episodes: Episode[]): TaskCalibration {
  const byTask: TaskCalibration = new Map();
  for (const episode of episodes) {
    if (episode.outcome.success !== true) continue;
    if (episode.metrics.durationS === null) continue;
    const key = episode.task.name;
    const existing = byTask.get(key);
    if (existing) existing.push(episode.metrics.durationS);
    else byTask.set(key, [episode.metrics.durationS]);
  }
  return byTask;
}

/** Score one episode's risk using a calibration built from its own task's
 * successful runs. Returns null if the episode has no duration, or its
 * task doesn't have enough successful reference episodes to calibrate
 * against (see scoreDuration's threshold): callers should render an
 * honest "not enough data yet" state, not a fabricated number. */
export function scoreEpisodeRisk(episode: Episode, calibration: TaskCalibration): RiskScoreResult | null {
  if (episode.metrics.durationS === null) return null;
  const reference = calibration.get(episode.task.name);
  if (!reference) return null;
  return scoreDuration(episode.metrics.durationS, reference);
}

/** Rollup of a single (task, policy version) pair's episode-level anomaly
 * scores. This is what actually answers "which policy should I be
 * concerned about," not any single recording: a fleet operator insures a
 * policy version running across many robots, not one past episode. Still
 * retrospective (built from logged runs, not a pre-deployment prediction),
 * but scoped at the level that's actually decision-relevant. */
export interface PolicyRiskSummary {
  policyVersion: string;
  taskName: string;
  totalEpisodes: number;
  /** Episodes with a duration we could actually score (excludes episodes
   * with no duration recorded at all). */
  scoredEpisodes: number;
  /** Count with pValue < 0.2 ("Somewhat unusual" or worse, matching the
   * bands used on the episode detail page). */
  unusualCount: number;
  /** Count with pValue < 0.05 ("Highly unusual"). */
  highlyUnusualCount: number;
}

export function buildPolicyRiskSummaries(episodes: Episode[]): PolicyRiskSummary[] {
  const calibration = buildTaskCalibration(episodes);

  interface Group {
    taskName: string;
    policyVersion: string;
    episodes: Episode[];
  }
  // Null-character separator so a task name or policy version that happens
  // to contain "::" (or any other printable separator) can't collide two
  // distinct groups into one key.
  const groups = new Map<string, Group>();
  for (const episode of episodes) {
    const key = `${episode.task.name}\u0000${episode.policyVersion}`;
    let group = groups.get(key);
    if (!group) {
      group = { taskName: episode.task.name, policyVersion: episode.policyVersion, episodes: [] };
      groups.set(key, group);
    }
    group.episodes.push(episode);
  }

  const summaries: PolicyRiskSummary[] = [];
  for (const group of groups.values()) {
    let scoredEpisodes = 0;
    let unusualCount = 0;
    let highlyUnusualCount = 0;
    for (const episode of group.episodes) {
      const result = scoreEpisodeRisk(episode, calibration);
      if (result === null) continue;
      scoredEpisodes++;
      if (result.pValue < 0.2) unusualCount++;
      if (result.pValue < 0.05) highlyUnusualCount++;
    }
    summaries.push({
      policyVersion: group.policyVersion,
      taskName: group.taskName,
      totalEpisodes: group.episodes.length,
      scoredEpisodes,
      unusualCount,
      highlyUnusualCount,
    });
  }

  // Worst-first: most highly-unusual episodes, tie-broken by unusual count,
  // then by scored-episode volume (a policy with more evidence behind its
  // rate is more actionable than one with a single suspicious run).
  return summaries.sort(
    (a, b) => b.highlyUnusualCount - a.highlyUnusualCount || b.unusualCount - a.unusualCount || b.scoredEpisodes - a.scoredEpisodes,
  );
}

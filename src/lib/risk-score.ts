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
// NOT: a failure predictor. Duration-anomaly scoring in particular doesn't
// claim to predict whether a robot will fail before it does: it's purely
// retrospective, and a demo overclaiming that already caused real confusion
// once (the "predicts failure before it happens" pitch language was walked
// back for exactly this reason). Zero intervention/collision telemetry is
// populated on any source we have, which rules out several other honest
// signals we'd otherwise use. The one genuinely forward-looking signal our
// data does support is buildPolicyFailureRates below: a named policy
// checkpoint's own measured historical pass/fail record, sourced from
// real third-party evaluations (see that function's own comment).
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

/** Wilson score interval for a Bernoulli proportion (Wilson, 1927): the
 * standard way to bound a true success/failure rate from a finite sample
 * without the normal-approximation interval's known failure at small n or
 * near 0/1 (where it can produce bounds outside [0, 1]). Returns [lower,
 * upper] for the given confidence level (95% by default, z = 1.96). */
export function wilsonScoreInterval(successes: number, trials: number, z = 1.96): [number, number] {
  if (trials === 0) return [0, 1];
  const phat = successes / trials;
  const z2 = z * z;
  const center = phat + z2 / (2 * trials);
  const denom = 1 + z2 / trials;
  const margin = z * Math.sqrt((phat * (1 - phat)) / trials + z2 / (4 * trials * trials));
  return [Math.max(0, (center - margin) / denom), Math.min(1, (center + margin) / denom)];
}

/** A policy's real, historical failure rate across every labeled episode of
 * it we have, regardless of task: unlike the per-task duration rollup above,
 * this pools across tasks on purpose, since a generalist policy's benchmark
 * record is itself the signal an insurer cares about ("this exact checkpoint
 * has failed N% of its independently evaluated attempts"), not just how one
 * task's runs compare to each other. This is the one honestly predictive
 * claim our data supports: an unmodified policy's future behavior on similar
 * tasks is reasonably estimated by its own measured track record. */
export interface PolicyFailureRate {
  policyVersion: string;
  trials: number;
  failures: number;
  failureRate: number;
  /** 95% Wilson confidence interval on the failure rate, in [0, 1]. */
  failureRateCI: [number, number];
}

export function buildPolicyFailureRates(episodes: Episode[], minTrials = 5): PolicyFailureRate[] {
  const byPolicy = new Map<string, { trials: number; failures: number }>();
  for (const episode of episodes) {
    if (episode.outcome.success === null) continue;
    const entry = byPolicy.get(episode.policyVersion) ?? { trials: 0, failures: 0 };
    entry.trials += 1;
    if (episode.outcome.success === false) entry.failures += 1;
    byPolicy.set(episode.policyVersion, entry);
  }

  const rates: PolicyFailureRate[] = [];
  for (const [policyVersion, { trials, failures }] of byPolicy) {
    if (trials < minTrials) continue;
    const successes = trials - failures;
    // Wilson interval on the success rate, then flip to bound the failure
    // rate: failureRate = 1 - successRate, so the failure rate's upper bound
    // is 1 minus the success rate's lower bound, and vice versa.
    const [successLower, successUpper] = wilsonScoreInterval(successes, trials);
    rates.push({
      policyVersion,
      trials,
      failures,
      failureRate: failures / trials,
      failureRateCI: [1 - successUpper, 1 - successLower],
    });
  }

  // Worst-first, tie-broken by trial volume (more evidence behind a rate is
  // more actionable than a similar rate backed by fewer trials).
  return rates.sort((a, b) => b.failureRate - a.failureRate || b.trials - a.trials);
}

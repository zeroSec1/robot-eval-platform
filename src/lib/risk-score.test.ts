import { describe, expect, it } from "vitest";
import {
  buildPolicyRiskSummaries,
  buildTaskCalibration,
  conformalPValue,
  nonconformityScore,
  scoreDuration,
  scoreEpisodeRisk,
} from "./risk-score";
import { EPISODES } from "./mock-data";
import { Episode } from "./types";

function makeEpisode(overrides: Partial<Episode>): Episode {
  return {
    episodeId: "test",
    datasetId: "test-dataset",
    sourceFormat: "lerobot",
    schemaVersion: "1.0",
    policyVersion: "v1",
    task: { name: "Test task", languageInstruction: "do the thing", benchmarkPack: "test" },
    embodiment: { robotType: "arm", model: "test-arm", dof: 6, sensors: [] },
    outcome: { success: true, methodOfDetermination: "test" },
    failure: null,
    metrics: { durationS: 10, interventions: null, collisions: null },
    recordedAt: new Date().toISOString(),
    coverage: 1,
    ...overrides,
  };
}

describe("nonconformityScore", () => {
  it("is zero at the exact median of the reference set", () => {
    expect(nonconformityScore(5, [1, 3, 5, 7, 9])).toBe(0);
  });

  it("grows with distance from the median", () => {
    const reference = [10, 11, 9, 10, 12, 8, 10];
    const near = nonconformityScore(11, reference);
    const far = nonconformityScore(30, reference);
    expect(far).toBeGreaterThan(near);
  });

  it("does not divide by zero when every reference value is identical", () => {
    const score = nonconformityScore(5, [10, 10, 10, 10]);
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeGreaterThan(0);
  });

  it("returns 0 for an empty reference set rather than throwing", () => {
    expect(nonconformityScore(5, [])).toBe(0);
  });
});

describe("conformalPValue", () => {
  it("returns 1 (least surprising) when the test score is the smallest possible", () => {
    const calib = [1, 2, 3, 4, 5];
    expect(conformalPValue(0, calib)).toBe(1);
  });

  it("returns 1/(n+1) (most surprising representable value) when the test score exceeds every calibration score", () => {
    const calib = [1, 2, 3, 4, 5];
    expect(conformalPValue(100, calib)).toBeCloseTo(1 / 6, 10);
  });

  it("never returns exactly 0, by construction", () => {
    const calib = Array.from({ length: 50 }, (_, i) => i);
    expect(conformalPValue(1000, calib)).toBeGreaterThan(0);
  });

  it("defaults to 1 (no evidence of anomaly) with an empty calibration set", () => {
    expect(conformalPValue(5, [])).toBe(1);
  });
});

describe("scoreDuration", () => {
  it("refuses to score with fewer than 5 successful reference episodes", () => {
    expect(scoreDuration(10, [10, 11, 9])).toBeNull();
  });

  it("gives a typical duration a high p-value and an extreme one a low p-value", () => {
    // 20 successful runs clustered around 15s.
    const successDurations = [14, 15, 15, 16, 14, 15, 16, 15, 14, 15, 15, 16, 14, 15, 16, 15, 14, 15, 16, 15];
    const typical = scoreDuration(15, successDurations);
    const extreme = scoreDuration(90, successDurations);
    expect(typical).not.toBeNull();
    expect(extreme).not.toBeNull();
    expect(typical!.pValue).toBeGreaterThan(extreme!.pValue);
  });
});

describe("buildTaskCalibration + scoreEpisodeRisk", () => {
  it("only calibrates from successful episodes with a known duration", () => {
    const episodes = [
      makeEpisode({ episodeId: "a", outcome: { success: true, methodOfDetermination: "x" }, metrics: { durationS: 10, interventions: null, collisions: null } }),
      makeEpisode({ episodeId: "b", outcome: { success: false, methodOfDetermination: "x" }, metrics: { durationS: 999, interventions: null, collisions: null } }),
      makeEpisode({ episodeId: "c", outcome: { success: true, methodOfDetermination: "x" }, metrics: { durationS: null, interventions: null, collisions: null } }),
    ];
    const calibration = buildTaskCalibration(episodes);
    expect(calibration.get("Test task")).toEqual([10]);
  });

  it("returns null for a task with no calibration data at all", () => {
    const calibration = buildTaskCalibration([]);
    const episode = makeEpisode({});
    expect(scoreEpisodeRisk(episode, calibration)).toBeNull();
  });

  it("returns null for an episode with no duration even if its task has calibration data", () => {
    const successRuns = Array.from({ length: 10 }, (_, i) =>
      makeEpisode({ episodeId: `s${i}`, metrics: { durationS: 10 + i, interventions: null, collisions: null } }),
    );
    const calibration = buildTaskCalibration(successRuns);
    const noDuration = makeEpisode({ episodeId: "x", metrics: { durationS: null, interventions: null, collisions: null } });
    expect(scoreEpisodeRisk(noDuration, calibration)).toBeNull();
  });
});

describe("buildPolicyRiskSummaries", () => {
  it("groups by (task, policy version) and counts unusual/highly-unusual episodes correctly", () => {
    // 20 successful calibration runs of "policy-a" clustered tightly around
    // 10s, so anything far from 10s reads as genuinely anomalous. Each run
    // gets a distinct duration (not just two alternating values): with only
    // two exact values, leaving one out collapses the remaining set's MAD to
    // exactly 0 for most of them, which blows up the leave-one-out
    // nonconformity scores and defeats the calibration entirely.
    const calibrationRuns = Array.from({ length: 20 }, (_, i) =>
      makeEpisode({
        episodeId: `calib-${i}`,
        policyVersion: "policy-a",
        metrics: { durationS: 10 + (i - 10) * 0.01, interventions: null, collisions: null },
      }),
    );
    // "policy-b" only has extreme-duration episodes on the same task,
    // marked as failures so they don't get folded into the calibration
    // pool themselves (buildTaskCalibration only draws from successful
    // episodes) — they should still get scored against policy-a's
    // calibration and come out as the risky one.
    const policyBRuns = [
      makeEpisode({
        episodeId: "b-1",
        policyVersion: "policy-b",
        outcome: { success: false, methodOfDetermination: "test" },
        metrics: { durationS: 90, interventions: null, collisions: null },
      }),
      makeEpisode({
        episodeId: "b-2",
        policyVersion: "policy-b",
        outcome: { success: false, methodOfDetermination: "test" },
        metrics: { durationS: 95, interventions: null, collisions: null },
      }),
    ];

    const summaries = buildPolicyRiskSummaries([...calibrationRuns, ...policyBRuns]);

    const policyA = summaries.find((s) => s.policyVersion === "policy-a");
    const policyB = summaries.find((s) => s.policyVersion === "policy-b");
    expect(policyA).toBeDefined();
    expect(policyB).toBeDefined();
    expect(policyB!.scoredEpisodes).toBe(2);
    expect(policyB!.highlyUnusualCount).toBeGreaterThan(0);
    // policy-a defined the calibration distribution itself, so its own
    // in-distribution runs shouldn't be flagged highly unusual.
    expect(policyA!.highlyUnusualCount).toBe(0);
  });

  it("sorts the riskiest policy first", () => {
    const calibrationRuns = Array.from({ length: 10 }, (_, i) =>
      makeEpisode({ episodeId: `calib-${i}`, policyVersion: "safe-policy", metrics: { durationS: 10, interventions: null, collisions: null } }),
    );
    const riskyRuns = [
      makeEpisode({ episodeId: "r-1", policyVersion: "risky-policy", metrics: { durationS: 500, interventions: null, collisions: null } }),
    ];
    const summaries = buildPolicyRiskSummaries([...calibrationRuns, ...riskyRuns]);
    expect(summaries[0].policyVersion).toBe("risky-policy");
  });

  it("does not let a task name or policy version containing a separator-like substring merge two distinct groups", () => {
    const a = makeEpisode({
      episodeId: "a",
      task: { name: "task", languageInstruction: "x", benchmarkPack: "test" },
      policyVersion: "v1::fake",
    });
    const b = makeEpisode({
      episodeId: "b",
      task: { name: "task::v1", languageInstruction: "x", benchmarkPack: "test" },
      policyVersion: "fake",
    });
    const summaries = buildPolicyRiskSummaries([a, b]);
    expect(summaries).toHaveLength(2);
  });
});

// Integration test against the real dataset. On the `develop` branch,
// src/data/real-episodes.json is intentionally an empty array (see
// README's "bring your own data" design), so this whole block skips
// cleanly rather than failing: this is the honest behavior, not a bug.
// On `main` (or any deploy with the real 308-episode dataset loaded), the
// same file exercises the actual empirical coverage guarantee against
// real, labeled robot episodes.
const scoredEpisodes = EPISODES.filter((e) => e.outcome.success !== null);
describe.skipIf(scoredEpisodes.length < 20)("real-data integration", () => {
  it("keeps the empirical false-positive rate near the nominal alpha on held-out successful episodes", () => {
    const successes = scoredEpisodes.filter((e) => e.outcome.success === true && e.metrics.durationS !== null);
    // Deterministic split so the test is reproducible: hold out every 4th
    // successful episode as "unseen", calibrate on the rest.
    const heldOut = successes.filter((_, i) => i % 4 === 0);
    const calibrationSet = successes.filter((_, i) => i % 4 !== 0).map((e) => e.metrics.durationS!);

    expect(calibrationSet.length).toBeGreaterThanOrEqual(5);

    const alpha = 0.2; // deliberately loose given how small this dataset is
    const falsePositives = heldOut.filter((e) => {
      const result = scoreDuration(e.metrics.durationS!, calibrationSet);
      return result !== null && result.pValue < alpha;
    }).length;

    // Conformal guarantee is P(false positive) <= alpha in expectation, not
    // a hard per-run bound on a handful of held-out points — allow some
    // slack (2x alpha) rather than asserting an exact rate on a small n.
    expect(falsePositives / heldOut.length).toBeLessThanOrEqual(alpha * 2);
  });

  it("flags real labeled failures as more anomalous, on average, than held-out real successes", () => {
    const successes = scoredEpisodes.filter((e) => e.outcome.success === true && e.metrics.durationS !== null);
    const failures = scoredEpisodes.filter((e) => e.outcome.success === false && e.metrics.durationS !== null);
    expect(failures.length).toBeGreaterThan(0);

    const heldOutSuccesses = successes.filter((_, i) => i % 4 === 0);
    const calibrationSet = successes.filter((_, i) => i % 4 !== 0).map((e) => e.metrics.durationS!);

    const meanPValue = (episodes: Episode[]) => {
      const values = episodes
        .map((e) => scoreDuration(e.metrics.durationS!, calibrationSet))
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .map((r) => r.pValue);
      return values.reduce((a, b) => a + b, 0) / values.length;
    };

    const failureMeanP = meanPValue(failures);
    const successMeanP = meanPValue(heldOutSuccesses);

    // This is a real, falsifiable claim: if duration carried zero signal
    // about failure, there'd be no reason for this inequality to hold.
    expect(failureMeanP).toBeLessThan(successMeanP);
  });
});

import { Episode } from "./types";

export interface DayBucket {
  label: string;
  dateKey: string;
  success: number;
  failure: number;
  total: number;
}

/** Buckets episodes by recorded-day for the last `days` calendar days present in the data. */
export function computeDailyTrend(episodes: Episode[], days = 14): DayBucket[] {
  if (episodes.length === 0) return [];
  const latest = Math.max(...episodes.map((e) => +new Date(e.recordedAt)));
  const buckets: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(latest - i * 24 * 60 * 60 * 1000);
    const dateKey = d.toISOString().slice(0, 10);
    buckets.push({
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      dateKey,
      success: 0,
      failure: 0,
      total: 0,
    });
  }
  const byKey = new Map(buckets.map((b) => [b.dateKey, b]));
  for (const e of episodes) {
    const key = new Date(e.recordedAt).toISOString().slice(0, 10);
    const bucket = byKey.get(key);
    if (!bucket) continue;
    bucket.total += 1;
    if (e.outcome.success) bucket.success += 1;
    else bucket.failure += 1;
  }
  return buckets;
}

export interface WaveformTrack {
  name: string;
  bars: number[]; // 0..1 heights
  anomalyIndex: number | null;
}

function mulberry32(seed: number) {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash;
}

const TRACK_NAMES_BY_ROBOT_TYPE: Record<string, string[]> = {
  "Tabletop arm": ["gripper_force", "wrist_torque", "end_effector_vel", "grasp_confidence"],
  "Mobile manipulator": ["base_velocity", "gripper_force", "nav_clearance", "grasp_confidence"],
  "Mobile bimanual": ["base_velocity", "left_gripper_force", "right_gripper_force", "arm_sync_error"],
  "Bimanual arm": ["left_gripper_force", "right_gripper_force", "wrist_torque", "arm_sync_error"],
  "Industrial arm": ["gripper_force", "insertion_force", "end_effector_vel", "alignment_error"],
};

/** Deterministic pseudo-waveform per episode — stable across reloads, no
 * real sensor data is wired up yet. Injects a visible anomaly spike around
 * the failure moment when the episode failed. */
export function generateWaveformTracks(episode: Episode, barsPerTrack = 140): WaveformTrack[] {
  const rand = mulberry32(seedFromString(episode.episodeId));
  const names = TRACK_NAMES_BY_ROBOT_TYPE[episode.embodiment.robotType] ?? TRACK_NAMES_BY_ROBOT_TYPE["Tabletop arm"];
  // Anomaly window only for episodes that actually FAILED — unscored
  // (success === null) episodes have no known failure moment.
  const failureIndex =
    episode.outcome.success === false
      ? Math.floor(barsPerTrack * (0.45 + rand() * 0.35))
      : null;

  return names.map((name) => {
    let level = 0.3 + rand() * 0.2;
    const bars: number[] = [];
    for (let i = 0; i < barsPerTrack; i++) {
      level += (rand() - 0.5) * 0.11;
      level = Math.max(0.08, Math.min(0.95, level));
      let h = level;
      if (failureIndex !== null && Math.abs(i - failureIndex) <= 3) {
        h = Math.min(1, h + 0.4 + rand() * 0.3);
      }
      bars.push(h);
    }
    return { name, bars, anomalyIndex: failureIndex };
  });
}

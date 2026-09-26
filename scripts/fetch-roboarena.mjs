// Fetches real autonomous-policy evaluation episodes from RoboArena's public
// dataset dump (huggingface.co/datasets/RoboArena/DataDump_02-03-2026,
// MIT-licensed, verified directly against the dataset card before use;
// arXiv:2506.18123) and normalizes them into the canonical episode schema.
//
// Why this dataset: it is the one real, licensed source we found with a
// genuine (named policy, task, binary success outcome) triple from actual
// autonomous rollouts on a real robot (DROID/Franka), not human teleop. That
// is what a policy-conditioned risk score needs and our own bundled data
// doesn't have: every one of our other sources is either human-teleop or (in
// the one policy-rollout dataset we do have, act-rj45-ckpt40k) has no
// recorded outcome at all.
//
// Each evaluation session compares two policies (A vs B) head-to-head on the
// same instruction; we ingest both arms as separate episodes; sessions have
// no per-episode id, so episodeId is derived from the session id + arm.
//
// The session metadata also carries a human evaluator's name/email and a
// free-text critique. We deliberately do NOT ingest either: they're not
// needed for anything this app does, and there's no reason to republish a
// real person's identity from someone else's dataset on our own site.
//
// Usage: node scripts/fetch-roboarena.mjs [--cap 200] [--sessions 400]

import * as yaml from "js-yaml";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

const HF = "https://huggingface.co";
const REPO = "RoboArena/DataDump_02-03-2026";
const DATASET_ID = "roboarena-datadump-2026-02-03";

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : Number(args[i + 1]);
};
const SESSION_SAMPLE = flag("sessions", 400); // sessions to inspect
const EPISODE_CAP = flag("cap", 200); // policy-episodes to keep (2 per session max)

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

// HF's tree API paginates via an RFC 5988 Link header carrying the next
// page's full URL (with an opaque cursor token), not a cursor we can derive
// ourselves from the last item.
async function fetchJsonPage(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  const body = await r.json();
  const link = r.headers.get("link") ?? "";
  const match = link.match(/<([^>]+)>;\s*rel="next"/);
  return { body, nextUrl: match ? match[1] : null };
}
async function fetchText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

console.log(`── ${REPO}`);
const globalMeta = yaml.load(
  await fetchText(`${HF}/datasets/${REPO}/resolve/main/global_metadata.yaml`),
);
console.log(
  `  ${globalMeta.total_sessions} sessions, ${globalMeta.total_policy_episodes} policy episodes in the full dump`,
);
const policyIndex = globalMeta.policy_index ?? {};

// List session directories via the HF tree API, following its real Link-header
// pagination until we have enough or run out of pages.
async function listSessionIds(limit) {
  const ids = [];
  let url = `${HF}/api/datasets/${REPO}/tree/main/evaluation_sessions?recursive=false&limit=1000`;
  while (url && ids.length < limit) {
    const { body, nextUrl } = await fetchJsonPage(url);
    const entries = Array.isArray(body) ? body : (body.tree ?? []);
    if (entries.length === 0) break;
    for (const e of entries) {
      if (e.type === "directory") ids.push(e.path.split("/").pop());
    }
    url = nextUrl;
  }
  return ids.slice(0, limit);
}

// Deterministic pseudo-shuffle (no external RNG dependency) so a fixed
// SESSION_SAMPLE draws a spread across the id space rather than whatever
// order the API happens to list first.
function stableShuffle(arr) {
  return arr
    .map((v) => ({ v, k: hash(v) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.v);
}
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const allSessionIds = await listSessionIds(Math.max(SESSION_SAMPLE * 3, 1500));
console.log(`  listed ${allSessionIds.length} session directories`);
const sampleIds = stableShuffle(allSessionIds).slice(0, SESSION_SAMPLE);

async function withConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try {
        results[idx] = await fn(items[idx], idx);
      } catch (err) {
        results[idx] = { error: String(err) };
      }
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

function pad(n, width) {
  return String(n).padStart(width, "0");
}

// Best-effort mapping from a raw instruction to a stable task name: collapse
// whitespace/case so "Open the fridge door" and "open the fridge door" pool
// into the same calibration group, since that's the only thing distinguishing
// otherwise-identical tasks in this dataset.
function taskNameFor(instruction) {
  const clean = instruction.trim().replace(/\s+/g, " ");
  return clean.length ? clean[0].toUpperCase() + clean.slice(1) : "Unlabeled task";
}

let sessionsFetched = 0;
let sessionsWithUsableData = 0;
const rawEpisodes = [];

const sessionResults = await withConcurrency(sampleIds, 12, async (sessionId) => {
  const metaText = await fetchText(
    `${HF}/datasets/${REPO}/resolve/main/evaluation_sessions/${sessionId}/metadata.yaml`,
  );
  sessionsFetched += 1;
  const meta = yaml.load(metaText);
  if (!meta?.policies || !meta.language_instruction) return null;

  // Need the actual video filenames (they embed a timestamp we can't
  // predict), so list this session's files once.
  const tree = await fetchJson(
    `${HF}/api/datasets/${REPO}/tree/main/evaluation_sessions/${sessionId}?recursive=true`,
  );
  const files = (Array.isArray(tree) ? tree : (tree.tree ?? [])).filter((e) => e.type === "file");

  const arms = [];
  for (const [arm, p] of Object.entries(meta.policies)) {
    if (typeof p.binary_success !== "number" || typeof p.duration !== "number") continue;
    const folderPrefix = `evaluation_sessions/${sessionId}/${arm}_${p.policy_name}/`;
    const armFiles = files.filter((f) => f.path.startsWith(folderPrefix));
    const video =
      armFiles.find((f) => f.path.includes("_video_right.mp4")) ??
      armFiles.find((f) => f.path.includes("_video_wrist.mp4")) ??
      armFiles.find((f) => f.path.endsWith(".mp4"));
    arms.push({ arm, policy: p, video });
  }
  if (arms.length === 0) return null;
  sessionsWithUsableData += 1;
  return { sessionId, meta, arms };
});

for (const s of sessionResults) {
  if (!s || s.error) continue;
  for (const { arm, policy, video } of s.arms) {
    rawEpisodes.push({
      sessionId: s.sessionId,
      arm,
      policy,
      video,
      instruction: s.meta.language_instruction,
      recordedAt: s.meta.session_completion_timestamp ?? new Date().toISOString(),
    });
  }
}

console.log(
  `  fetched ${sessionsFetched} sessions (${sessionsWithUsableData} with usable policy outcomes), ${rawEpisodes.length} candidate policy-episodes`,
);

// Sample evenly across the candidate pool (by stride, like fetch-lerobot.mjs)
// so the cap doesn't just take whichever sessions happened to be requested
// first, and shuffle first so consecutive picks aren't both arms of the same
// session pair.
const shuffled = stableShuffle(rawEpisodes.map((_, i) => i)).map((i) => rawEpisodes[i]);
const stride = Math.max(1, Math.ceil(shuffled.length / EPISODE_CAP));
const selected = shuffled.filter((_, i) => i % stride === 0).slice(0, EPISODE_CAP);

const episodes = selected.map((e, i) => {
  const durationS = Math.round(e.policy.duration * 10) / 10;
  const isOpenSource = policyIndex[e.policy.policy_name]?.open_source === true;
  const video = e.video
    ? {
        url: `${HF}/datasets/${REPO}/resolve/main/${e.video.path}`,
        camera: e.video.path.includes("_video_right") ? "video_right" : "video_wrist",
        fromS: 0,
        toS: durationS,
      }
    : undefined;
  const optional = [true, true, video !== undefined, true, true];
  return {
    episodeId: `roboarena_ep_${pad(i, 5)}`,
    datasetId: DATASET_ID,
    sourceFormat: "eval_yaml",
    schemaVersion: "1.0",
    policyVersion: e.policy.policy_name + (isOpenSource ? "" : " (closed-weight)"),
    task: {
      name: taskNameFor(e.instruction),
      languageInstruction: e.instruction,
      benchmarkPack: "roboarena-droid-eval",
    },
    embodiment: {
      robotType: "Franka arm (DROID platform)",
      model: "DROID",
      dof: 7,
      sensors: ["video_right", "video_wrist"],
    },
    outcome: {
      success: e.policy.binary_success === 1,
      methodOfDetermination: "human evaluator judgment, RoboArena eval protocol (binary_success)",
    },
    failure: null,
    metrics: { durationS, interventions: null, collisions: null },
    recordedAt: e.recordedAt,
    coverage: Math.round((optional.filter(Boolean).length / optional.length) * 100) / 100,
    video,
  };
});

const scored = episodes.filter((e) => e.outcome.success !== null);
console.log(
  `  selected ${episodes.length} episodes (cap ${EPISODE_CAP}); ${scored.length} with outcomes, ${scored.filter((e) => e.outcome.success).length} success`,
);
console.log(
  `  distinct policies: ${new Set(episodes.map((e) => e.policyVersion)).size}, distinct tasks: ${new Set(episodes.map((e) => e.task.name)).size}`,
);

// Merge into existing real-episodes.json / real-datasets.json rather than
// overwriting: re-runnable and idempotent by dropping any prior RoboArena
// rows first (matching download-videos.mjs's "safe to re-run" convention).
const dataDir = path.join(process.cwd(), "src", "data");
const episodesPath = path.join(dataDir, "real-episodes.json");
const datasetsPath = path.join(dataDir, "real-datasets.json");

const existingEpisodes = existsSync(episodesPath) ? JSON.parse(readFileSync(episodesPath, "utf8")) : [];
const existingDatasets = existsSync(datasetsPath) ? JSON.parse(readFileSync(datasetsPath, "utf8")) : [];

const mergedEpisodes = [...existingEpisodes.filter((e) => e.datasetId !== DATASET_ID), ...episodes];
const mergedDatasets = [
  ...existingDatasets.filter((d) => d.datasetId !== DATASET_ID),
  {
    datasetId: DATASET_ID,
    name: "RoboArena eval dump (autonomous policy rollouts, DROID)",
    sourceFormat: "eval_yaml",
    ingestedAt: new Date().toISOString(),
  },
];

writeFileSync(episodesPath, JSON.stringify(mergedEpisodes, null, 2));
writeFileSync(datasetsPath, JSON.stringify(mergedDatasets, null, 2));
console.log(`\n✔ merged ${episodes.length} RoboArena episodes into src/data/ (${mergedEpisodes.length} total now)`);

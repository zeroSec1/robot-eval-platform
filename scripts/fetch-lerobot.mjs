// Fetches real episode metadata from public LeRobot datasets on Hugging Face
// and normalizes it into the canonical episode schema. Writes JSON into
// src/data/ which the app imports at build time.
//
// Usage: node scripts/fetch-lerobot.mjs

import { asyncBufferFromUrl, parquetReadObjects } from "hyparquet";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const HF = "https://huggingface.co";

const SOURCES = [
  {
    repo: "lerobot/pusht",
    idPrefix: "pusht",
    datasetName: "PushT - T-block pushing (LeRobot community)",
    taskName: "Push T-block to target",
    robotType: "2D pusher (sim)",
    model: "PushT env",
    benchmarkPack: "manipulation-tabletop",
    cap: 60,
    // The env's own success bool never fires in these demos (needs >95%
    // coverage), so score strictly from the recorded coverage reward - a
    // standard PushT eval rule, recorded in method_of_determination.
    rewardSuccessThreshold: 0.9,
  },
  {
    repo: "lerobot/aloha_static_coffee",
    idPrefix: "aloha_coffee",
    datasetName: "ALOHA static coffee (bimanual teleop)",
    taskName: "Make coffee (capsule + cup + buttons)",
    robotType: "Bimanual arm",
    model: "ALOHA",
    benchmarkPack: "manipulation-tabletop",
    cap: 50,
  },
  {
    repo: "lerobot/svla_so101_pickplace",
    idPrefix: "so101_pick",
    datasetName: "SO-101 pick & place (SmolVLA)",
    taskName: "Pick and place object",
    robotType: "Tabletop arm",
    model: "SO-101",
    benchmarkPack: "manipulation-tabletop",
    cap: 50,
  },
  {
    repo: "lerobot/aloha_mobile_shrimp",
    idPrefix: "shrimp",
    datasetName: "Mobile ALOHA - cook shrimp (Stanford)",
    taskName: "Sauté and serve shrimp",
    robotType: "Mobile bimanual",
    model: "Mobile ALOHA",
    benchmarkPack: "mobile-manipulation",
    cap: 18,
  },
  {
    repo: "lerobot/aloha_mobile_wash_pan",
    idPrefix: "wash_pan",
    datasetName: "Mobile ALOHA - wash pan (Stanford)",
    taskName: "Wash pan at sink",
    robotType: "Mobile bimanual",
    model: "Mobile ALOHA",
    benchmarkPack: "mobile-manipulation",
    cap: 50,
  },
  {
    repo: "BensoAI/eval_ACT_RJ45_piper_20260113_ckpt40k_ensemble_50runs",
    idPrefix: "rj45",
    datasetName: "RJ45 cable insertion - ACT policy eval (Piper)",
    taskName: "Insert RJ45 cable into port",
    robotType: "Industrial arm",
    model: "AgileX Piper",
    benchmarkPack: "manipulation-tabletop",
    cap: 50,
    // Real POLICY rollouts (not teleop): an ACT checkpoint evaluated 50x.
    policyVersion: "act-rj45-ckpt40k",
  },
];

function pad(n, width) {
  return String(n).padStart(width, "0");
}

function firstNum(v) {
  if (v == null) return null;
  const x = Array.isArray(v) ? v[0] : v;
  if (typeof x === "bigint") return Number(x);
  if (typeof x === "boolean") return x ? 1 : 0;
  return typeof x === "number" ? x : null;
}

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

const allEpisodes = [];
const allDatasets = [];

for (const src of SOURCES) {
  console.log(`\n── ${src.repo}`);
  const info = await fetchJson(`${HF}/datasets/${src.repo}/resolve/main/meta/info.json`);
  const hfMeta = await fetchJson(`${HF}/api/datasets/${src.repo}`);
  const recordedAt = hfMeta.lastModified ?? new Date().toISOString();

  const fps = info.fps;
  const videoKeys = Object.entries(info.features)
    .filter(([, f]) => f.dtype === "video")
    .map(([k]) => k);
  const dof = info.features.action?.shape?.[0] ?? null;

  const isV2 = String(info.codebase_version ?? "").startsWith("v2");
  let rows;
  if (isV2) {
    // v2.x: episode metadata is plain JSONL; videos are one file per episode.
    const r = await fetch(`${HF}/datasets/${src.repo}/resolve/main/meta/episodes.jsonl`);
    if (!r.ok) throw new Error(`${r.status} episodes.jsonl for ${src.repo}`);
    rows = (await r.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
  } else {
    const parquetUrl = `${HF}/datasets/${src.repo}/resolve/main/meta/episodes/chunk-000/file-000.parquet`;
    const file = await asyncBufferFromUrl({ url: parquetUrl });
    rows = await parquetReadObjects({ file });
  }
  console.log(`  ${rows.length} episodes in metadata (${info.codebase_version}, ingesting up to ${src.cap})`);

  const datasetId = src.repo.replace("/", "-");
  let ingested = 0;

  // Sample evenly across the dataset rather than taking the head, so the
  // ingested subset is representative when capped.
  const stride = Math.max(1, Math.ceil(rows.length / src.cap));
  const sampled = rows.filter((_, i) => i % stride === 0).slice(0, src.cap);

  for (const row of sampled) {
    const epIndex = firstNum(row.episode_index);
    const length = firstNum(row.length);
    const durationS = length !== null && fps ? Math.round((length / fps) * 10) / 10 : null;
    const instruction = Array.isArray(row.tasks) ? row.tasks[0] : String(row.tasks ?? "");

    // Real outcome where available: either the env's success flag, or a
    // documented threshold rule on the recorded coverage reward.
    let success = null;
    let methodOfDetermination = "not recorded in source dataset";
    const rewardMax = firstNum(row["stats/next.reward/max"]);
    const successMax = firstNum(row["stats/next.success/max"]);
    if (src.rewardSuccessThreshold !== undefined && rewardMax !== null) {
      success = rewardMax >= src.rewardSuccessThreshold;
      methodOfDetermination = `automatic: max coverage reward ≥ ${src.rewardSuccessThreshold}`;
    } else if (successMax !== null) {
      success = successMax > 0;
      methodOfDetermination = "automatic: env success flag (next.success)";
    }
    const hasOutcome = success !== null;

    // First camera's video → playable directly (v2: one file per episode;
    // v3: segment of a concatenated file, scoped via media-fragment times).
    let video;
    const cam = videoKeys[0];
    if (cam !== undefined && isV2) {
      const chunksSize = info.chunks_size ?? 1000;
      const epChunk = Math.floor(epIndex / chunksSize);
      video = {
        url: `${HF}/datasets/${src.repo}/resolve/main/videos/chunk-${pad(epChunk, 3)}/${cam}/episode_${pad(epIndex, 6)}.mp4`,
        camera: cam,
        fromS: 0,
        toS: durationS ?? 0,
      };
    } else if (cam !== undefined) {
      const chunk = firstNum(row[`videos/${cam}/chunk_index`]);
      const fileIdx = firstNum(row[`videos/${cam}/file_index`]);
      const fromS = firstNum(row[`videos/${cam}/from_timestamp`]);
      const toS = firstNum(row[`videos/${cam}/to_timestamp`]);
      if (chunk !== null && fileIdx !== null && fromS !== null && toS !== null) {
        video = {
          url: `${HF}/datasets/${src.repo}/resolve/main/videos/${cam}/chunk-${pad(chunk, 3)}/file-${pad(fileIdx, 3)}.mp4`,
          camera: cam,
          fromS: Math.round(fromS * 100) / 100,
          toS: Math.round(toS * 100) / 100,
        };
      }
    }

    // Coverage: populated optional canonical fields / considered fields.
    const optional = [durationS !== null, hasOutcome, video !== undefined, videoKeys.length > 0, dof !== null];
    const coverage = Math.round((optional.filter(Boolean).length / optional.length) * 100) / 100;

    allEpisodes.push({
      episodeId: `${src.idPrefix}_ep_${pad(epIndex, 5)}`,
      datasetId,
      sourceFormat: "lerobot",
      schemaVersion: "1.0",
      policyVersion: src.policyVersion ?? "human-teleop",
      task: {
        name: src.taskName,
        languageInstruction: instruction,
        benchmarkPack: src.benchmarkPack,
      },
      embodiment: {
        robotType: src.robotType,
        model: src.model,
        dof: dof ?? 0,
        sensors: videoKeys,
      },
      outcome: { success, methodOfDetermination },
      failure: null,
      metrics: { durationS, interventions: null, collisions: null },
      recordedAt,
      coverage,
      video,
    });
    ingested += 1;
  }

  allDatasets.push({
    datasetId,
    name: src.datasetName,
    sourceFormat: "lerobot",
    ingestedAt: recordedAt,
  });
  console.log(`  ingested ${ingested} episodes · fps=${fps} · cams=[${videoKeys.join(", ")}] · dof=${dof}`);
}

const outDir = path.join(process.cwd(), "src", "data");
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "real-episodes.json"), JSON.stringify(allEpisodes, null, 2));
writeFileSync(path.join(outDir, "real-datasets.json"), JSON.stringify(allDatasets, null, 2));

const scored = allEpisodes.filter((e) => e.outcome.success !== null);
console.log(`\n✔ wrote ${allEpisodes.length} episodes (${scored.length} with real outcomes, ${scored.filter((e) => e.outcome.success).length} success) across ${allDatasets.length} datasets → src/data/`);

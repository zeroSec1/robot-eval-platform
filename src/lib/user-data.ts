"use client";

// Client-side "bring your own data" pipeline: parse an uploaded .json or
// .csv file, normalize it into the canonical Episode shape (same schema the
// fetch-*.{mjs,py} adapters produce), and persist it in the visitor's own
// browser via localStorage. Nothing is ever sent to a server: on a public,
// unauthenticated demo, per-browser local storage is what keeps one
// visitor's uploaded data from ever being visible to another.

import { useSyncExternalStore } from "react";
import { Dataset, Episode, FailureCategory, FAILURE_CATEGORIES, Outcome } from "./types";

const STORAGE_KEY = "robot-eval:user-episodes";
const INGESTED_AT_KEY = "robot-eval:user-episodes-ingested-at";
const CHANGE_EVENT = "robot-eval:user-data-changed";
export const USER_DATASET_ID = "user-upload";

function buildUserDataset(ingestedAt: string | null): Dataset {
  return {
    datasetId: USER_DATASET_ID,
    name: "Your uploaded data",
    sourceFormat: "custom",
    ingestedAt: ingestedAt ?? new Date().toISOString(),
  };
}

const EMPTY_USER_DATASET = buildUserDataset(null);

export class UploadParseError extends Error {}

// ---------- storage ----------

// useSyncExternalStore requires getSnapshot/getServerSnapshot to return a
// *stable* reference when nothing changed — returning a fresh `[]` (or a
// freshly JSON.parse'd array) on every call reads as "changed every render"
// and sends React into an infinite re-render loop. Cache against the raw
// localStorage string and only produce a new array when it actually differs.
const EMPTY_EPISODES: Episode[] = [];
let cachedRaw: string | null | undefined;
let cachedParsed: Episode[] = EMPTY_EPISODES;

function readStorage(): Episode[] {
  if (typeof window === "undefined") return EMPTY_EPISODES;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedParsed;
  cachedRaw = raw;
  if (!raw) {
    cachedParsed = EMPTY_EPISODES;
    return cachedParsed;
  }
  try {
    const parsed = JSON.parse(raw);
    cachedParsed = Array.isArray(parsed) ? (parsed as Episode[]) : EMPTY_EPISODES;
  } catch {
    cachedParsed = EMPTY_EPISODES;
  }
  return cachedParsed;
}

function getServerSnapshot(): Episode[] {
  return EMPTY_EPISODES;
}

function writeStorage(episodes: Episode[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(episodes));
  window.localStorage.setItem(INGESTED_AT_KEY, new Date().toISOString());
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function addUploadedEpisodes(newOnes: Episode[]) {
  const existing = readStorage();
  const byId = new Map(existing.map((e) => [e.episodeId, e]));
  for (const e of newOnes) byId.set(e.episodeId, e);
  writeStorage(Array.from(byId.values()));
}

export function clearUploadedEpisodes() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(INGESTED_AT_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// Same stable-reference caching as readStorage above, so useSyncExternalStore
// doesn't loop here either.
let cachedDataset: Dataset = EMPTY_USER_DATASET;
let cachedIngestedAtRaw: string | null | undefined;

function readUserDataset(): Dataset {
  if (typeof window === "undefined") return EMPTY_USER_DATASET;
  const raw = window.localStorage.getItem(INGESTED_AT_KEY);
  if (raw === cachedIngestedAtRaw) return cachedDataset;
  cachedIngestedAtRaw = raw;
  cachedDataset = buildUserDataset(raw);
  return cachedDataset;
}

function getServerUserDataset(): Dataset {
  return EMPTY_USER_DATASET;
}

/** The synthetic Dataset row representing everything the visitor has
 * uploaded, with a real ingested-at timestamp from the most recent upload. */
export function useUserDataset(): Dataset {
  return useSyncExternalStore(subscribe, readUserDataset, getServerUserDataset);
}

// ---------- React binding (useSyncExternalStore keeps every subscribed
// component in sync the instant another tab/component uploads or clears) ----------

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange); // cross-tab
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useUserEpisodes(): Episode[] {
  return useSyncExternalStore(subscribe, readStorage, getServerSnapshot);
}

// ---------- canonicalization ----------

const FAILURE_CATEGORY_SET = new Set<string>(FAILURE_CATEGORIES);

function str(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function bool(v: unknown): boolean | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim().toLowerCase();
  if (["true", "success", "1", "yes", "pass"].includes(s)) return true;
  if (["false", "failure", "fail", "0", "no"].includes(s)) return false;
  return null;
}

/** Accepts the loose keys a hand-written CSV/JSON row is likely to use for
 * each canonical field — case/underscore/camelCase-insensitive lookup. */
function pick(row: Record<string, unknown>, ...keys: string[]): unknown {
  const normalized = new Map(
    Object.entries(row).map(([k, v]) => [k.toLowerCase().replace(/[_\s-]/g, ""), v]),
  );
  for (const k of keys) {
    const v = normalized.get(k.toLowerCase().replace(/[_\s-]/g, ""));
    if (v !== undefined && v !== "") return v;
  }
  return undefined;
}

let uploadCounter = 0;

export function canonicalizeRow(row: Record<string, unknown>, index: number): Episode {
  const episodeId =
    str(pick(row, "episodeId", "episode_id", "id")) ?? `user-ep-${Date.now()}-${uploadCounter++}-${index}`;

  const durationS = num(pick(row, "durationS", "duration_s", "duration"));
  const interventions = num(pick(row, "interventions"));
  const collisions = num(pick(row, "collisions"));

  const success = bool(pick(row, "success", "outcome"));
  const outcome: Outcome = {
    success,
    methodOfDetermination:
      str(pick(row, "methodOfDetermination", "method_of_determination")) ??
      (success === null ? "" : "user-reported"),
  };

  const rawFailureCategory = str(pick(row, "failureCategory", "failure_category"))?.toLowerCase();
  const failureCategory =
    rawFailureCategory && FAILURE_CATEGORY_SET.has(rawFailureCategory)
      ? (rawFailureCategory as FailureCategory)
      : null;

  const videoUrl = str(pick(row, "videoUrl", "video_url", "video"));

  const episode: Episode = {
    episodeId,
    datasetId: str(pick(row, "datasetId", "dataset_id")) ?? USER_DATASET_ID,
    sourceFormat: "custom",
    schemaVersion: "1.0",
    policyVersion: str(pick(row, "policyVersion", "policy_version")) ?? "user-upload",
    task: {
      name: str(pick(row, "task", "taskName", "task_name")) ?? "Unspecified task",
      languageInstruction: str(pick(row, "languageInstruction", "language_instruction")) ?? "",
      benchmarkPack: str(pick(row, "benchmarkPack", "benchmark_pack")) ?? "user-upload",
    },
    embodiment: {
      robotType: str(pick(row, "robotType", "robot_type")) ?? "Unspecified",
      model: str(pick(row, "model")) ?? "Unspecified",
      dof: num(pick(row, "dof")) ?? 0,
      sensors: (() => {
        const s = str(pick(row, "sensors"));
        return s ? s.split(/[|;]/).map((x) => x.trim()).filter(Boolean) : [];
      })(),
    },
    outcome,
    failure: failureCategory
      ? {
          category: failureCategory,
          subcategory: str(pick(row, "failureSubcategory", "failure_subcategory")) ?? "",
          notes: str(pick(row, "failureNotes", "failure_notes", "notes")) ?? "",
        }
      : null,
    metrics: { durationS, interventions, collisions },
    recordedAt: str(pick(row, "recordedAt", "recorded_at", "timestamp")) ?? new Date().toISOString(),
    coverage: 0,
    ...(videoUrl
      ? {
          video: {
            url: videoUrl,
            camera: str(pick(row, "camera")) ?? "unspecified",
            fromS: num(pick(row, "fromS", "from_s")) ?? 0,
            toS: num(pick(row, "toS", "to_s")) ?? durationS ?? 0,
          },
        }
      : {}),
    ...(str(pick(row, "rawSourceUrl", "raw_source_url"))
      ? { rawSourceUrl: str(pick(row, "rawSourceUrl", "raw_source_url")) }
      : {}),
  };

  episode.coverage = computeCoverage(episode);
  return episode;
}

/** Same spirit as the fetch-* adapters: coverage is the fraction of the
 * schema's genuinely-optional signal fields that got populated. */
function computeCoverage(e: Episode): number {
  const checks = [
    e.outcome.success !== null,
    e.metrics.durationS !== null,
    e.metrics.interventions !== null,
    e.metrics.collisions !== null,
    e.failure !== null || e.outcome.success === true,
    !!e.video,
    e.task.languageInstruction.length > 0,
    e.embodiment.dof > 0,
  ];
  return checks.filter(Boolean).length / checks.length;
}

// ---------- file parsing ----------

function parseCsv(text: string): Record<string, string>[] {
  // Minimal RFC-4180-ish parser: handles quoted fields, embedded commas,
  // escaped quotes ("") and both \n and \r\n line endings.
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.length)) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some((f) => f.length)) rows.push(row);
  }
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

/** Parses a File (.json or .csv), canonicalizes every row, and returns the
 * resulting Episode[]. Throws UploadParseError with a user-facing message
 * on anything that isn't a usable file. */
export async function parseUploadedFile(file: File): Promise<Episode[]> {
  const text = await file.text();
  const isJson = file.name.toLowerCase().endsWith(".json") || file.type === "application/json";
  const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";

  if (!isJson && !isCsv) {
    throw new UploadParseError("Only .json or .csv files are supported.");
  }

  let rows: Record<string, unknown>[];
  if (isJson) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new UploadParseError("That file isn't valid JSON.");
    }
    rows = Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [parsed as Record<string, unknown>];
  } else {
    rows = parseCsv(text);
  }

  if (!rows.length) {
    throw new UploadParseError("No rows found in that file.");
  }

  return rows.map((row, i) => canonicalizeRow(row, i));
}

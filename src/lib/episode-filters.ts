import { Episode, FailureCategory } from "./types";

export type Outcome = "all" | "success" | "failure";

export interface EpisodeFilters {
  q: string;
  failure: Set<FailureCategory>;
  dataset: Set<string>;
  sourceFormat: Set<string>;
  policyVersion: Set<string>;
  pack: Set<string>;
  outcome: Outcome;
}

export function emptyFilters(): EpisodeFilters {
  return {
    q: "",
    failure: new Set(),
    dataset: new Set(),
    sourceFormat: new Set(),
    policyVersion: new Set(),
    pack: new Set(),
    outcome: "all",
  };
}

function csv(value: string | null): Set<string> {
  if (!value) return new Set();
  return new Set(value.split(",").filter(Boolean));
}

export function parseFilters(params: URLSearchParams): EpisodeFilters {
  const outcome = params.get("outcome");
  return {
    q: params.get("q") ?? "",
    failure: csv(params.get("failure")) as Set<FailureCategory>,
    dataset: csv(params.get("dataset")),
    sourceFormat: csv(params.get("format")),
    policyVersion: csv(params.get("policy")),
    pack: csv(params.get("pack")),
    outcome: outcome === "success" || outcome === "failure" ? outcome : "all",
  };
}

export function filtersToParams(filters: EpisodeFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.failure.size) params.set("failure", [...filters.failure].join(","));
  if (filters.dataset.size) params.set("dataset", [...filters.dataset].join(","));
  if (filters.sourceFormat.size) params.set("format", [...filters.sourceFormat].join(","));
  if (filters.policyVersion.size) params.set("policy", [...filters.policyVersion].join(","));
  if (filters.pack.size) params.set("pack", [...filters.pack].join(","));
  if (filters.outcome !== "all") params.set("outcome", filters.outcome);
  return params;
}

export function isEmpty(filters: EpisodeFilters): boolean {
  return (
    !filters.q &&
    filters.failure.size === 0 &&
    filters.dataset.size === 0 &&
    filters.sourceFormat.size === 0 &&
    filters.policyVersion.size === 0 &&
    filters.pack.size === 0 &&
    filters.outcome === "all"
  );
}

export function applyFilters(episodes: Episode[], filters: EpisodeFilters): Episode[] {
  const q = filters.q.trim().toLowerCase();
  return episodes.filter((e) => {
    if (filters.failure.size && (!e.failure || !filters.failure.has(e.failure.category))) return false;
    if (filters.dataset.size && !filters.dataset.has(e.datasetId)) return false;
    if (filters.sourceFormat.size && !filters.sourceFormat.has(e.sourceFormat)) return false;
    if (filters.policyVersion.size && !filters.policyVersion.has(e.policyVersion)) return false;
    if (filters.pack.size && !filters.pack.has(e.task.benchmarkPack)) return false;
    if (filters.outcome === "success" && !e.outcome.success) return false;
    if (filters.outcome === "failure" && e.outcome.success !== false) return false;
    if (q) {
      const haystack = `${e.episodeId} ${e.task.name} ${e.task.languageInstruction}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

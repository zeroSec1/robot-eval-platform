"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterGroup } from "@/components/filter-group";
import { OutcomeBadge, FailureBadge } from "@/components/failure-badge";
import { ObservationPreview } from "@/components/observation-preview";
import { CoverageBar } from "@/components/coverage-bar";
import { Badge } from "@/components/ui/badge";
import { DATASETS, EPISODES } from "@/lib/mock-data";
import {
  FAILURE_CATEGORIES,
  FAILURE_CATEGORY_LABEL,
  FailureCategory,
  SOURCE_FORMAT_LABEL,
} from "@/lib/types";
import { applyFilters, filtersToParams, isEmpty, parseFilters } from "@/lib/episode-filters";
import { cn, formatDuration } from "@/lib/utils";
import { useUserDataset, useUserEpisodes } from "@/lib/user-data";
import { UploadDataset } from "@/components/upload-dataset";

const CHIP_ACTIVE_CLASS: Record<FailureCategory, string> = {
  grasp_slipped: "bg-red/15 text-red ring-red/40",
  missed_grasp: "bg-pink/15 text-pink ring-pink/40",
  dropped_object: "bg-amber/15 text-amber ring-amber/40",
  wrong_object: "bg-violet/15 text-violet ring-violet/40",
  collision: "bg-orange/15 text-orange ring-orange/40",
  stalled: "bg-blue/15 text-blue ring-blue/40",
  plan_failure: "bg-hover text-text ring-border-strong",
};

export function EpisodesExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const userEpisodes = useUserEpisodes();
  const userDataset = useUserDataset();
  const allEpisodes = useMemo(() => [...EPISODES, ...userEpisodes], [userEpisodes]);
  const allDatasets = useMemo(
    () => (userEpisodes.length ? [...DATASETS, userDataset] : DATASETS),
    [userEpisodes.length, userDataset],
  );
  const allPolicyVersions = useMemo(
    () => Array.from(new Set(allEpisodes.map((e) => e.policyVersion))),
    [allEpisodes],
  );
  const benchmarkPacks = useMemo(
    () => Array.from(new Set(allEpisodes.map((e) => e.task.benchmarkPack))),
    [allEpisodes],
  );

  const pushFilters = useCallback(
    (next: typeof filters) => {
      const params = filtersToParams(next);
      const qs = params.toString();
      router.push(qs ? `/episodes?${qs}` : "/episodes", { scroll: false });
    },
    [router],
  );

  const toggleInSet = useCallback(
    (key: "failure" | "dataset" | "sourceFormat" | "policyVersion" | "pack", value: string) => {
      const next = {
        ...filters,
        failure: new Set(filters.failure),
        dataset: new Set(filters.dataset),
        sourceFormat: new Set(filters.sourceFormat),
        policyVersion: new Set(filters.policyVersion),
        pack: new Set(filters.pack),
      };
      const target = next[key] as Set<string>;
      if (target.has(value)) target.delete(value);
      else target.add(value);
      pushFilters(next);
    },
    [filters, pushFilters],
  );

  const setOutcome = (outcome: typeof filters.outcome) => pushFilters({ ...filters, outcome });
  const setQuery = (q: string) => pushFilters({ ...filters, q });
  const clearAll = () => router.push("/episodes", { scroll: false });

  const filtered = useMemo(() => applyFilters(allEpisodes, filters), [allEpisodes, filters]);

  const failureCounts = useMemo(() => {
    const counts = Object.fromEntries(FAILURE_CATEGORIES.map((c) => [c, 0])) as Record<
      FailureCategory,
      number
    >;
    for (const e of allEpisodes) if (e.failure) counts[e.failure.category] += 1;
    return counts;
  }, [allEpisodes]);

  const datasetOptions = allDatasets.map((d) => ({
    value: d.datasetId,
    label: d.name,
    count: allEpisodes.filter((e) => e.datasetId === d.datasetId).length,
  }));
  const formatOptions = Array.from(new Set(allEpisodes.map((e) => e.sourceFormat))).map((f) => ({
    value: f,
    label: SOURCE_FORMAT_LABEL[f],
    count: allEpisodes.filter((e) => e.sourceFormat === f).length,
  }));
  const policyOptions = allPolicyVersions.map((v) => ({
    value: v,
    label: v,
    count: allEpisodes.filter((e) => e.policyVersion === v).length,
  }));
  const packOptions = benchmarkPacks.map((p) => ({
    value: p,
    label: p,
    count: allEpisodes.filter((e) => e.task.benchmarkPack === p).length,
  }));

  return (
    <div className="flex flex-col gap-4">
      <UploadDataset />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-text">Episodes</h1>
          <p className="mt-0.5 text-[13px] text-faint">
            {filtered.length.toLocaleString()} of {allEpisodes.length.toLocaleString()} episodes
          </p>
        </div>
        <div className="flex w-full max-w-sm items-center gap-2 rounded-sm border border-border-strong bg-inset px-2.5 py-1.5">
          <span className="text-[14px] text-mute">⌕</span>
          <input
            value={filters.q}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Task, instruction, or episode id…"
            className="w-full bg-transparent text-[15px] text-text placeholder:text-mute focus:outline-none"
          />
        </div>
      </div>

      {/* Killer feature: one click to see every episode of a given failure kind. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[15px] text-faint">Show every episode where:</span>
        {FAILURE_CATEGORIES.map((cat) => {
          const active = filters.failure.has(cat);
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggleInSet("failure", cat)}
              aria-pressed={active}
              className={cn(
                "rounded-sm px-2 py-1 text-[15px] font-medium ring-1 ring-inset transition-colors",
                active ? CHIP_ACTIVE_CLASS[cat] : "bg-inset text-dim ring-border hover:text-text",
              )}
            >
              {FAILURE_CATEGORY_LABEL[cat]}
              <span className="ml-1.5 tabular-nums opacity-60">{failureCounts[cat]}</span>
            </button>
          );
        })}
        {!isEmpty(filters) ? (
          <button
            type="button"
            onClick={clearAll}
            className="ml-1 text-[15px] font-medium text-faint underline decoration-dotted hover:text-text"
          >
            Clear all filters
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[196px_1fr]">
        <aside className="flex flex-col gap-5">
          <div>
            <p className="mb-1.5 text-[11px] tracking-[0.1em] text-mute uppercase">outcome</p>
            <div className="flex gap-1">
              {(["all", "success", "failure"] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOutcome(o)}
                  className={cn(
                    "flex-1 rounded-sm px-2 py-1 text-[15px] font-medium capitalize transition-colors",
                    filters.outcome === o ? "bg-hover text-text" : "bg-inset text-faint hover:text-dim",
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          <FilterGroup
            title="Dataset"
            options={datasetOptions}
            selected={filters.dataset}
            onToggle={(v) => toggleInSet("dataset", v)}
          />
          <FilterGroup
            title="Source format"
            options={formatOptions}
            selected={filters.sourceFormat}
            onToggle={(v) => toggleInSet("sourceFormat", v)}
          />
          <FilterGroup
            title="Policy version"
            options={policyOptions}
            selected={filters.policyVersion}
            onToggle={(v) => toggleInSet("policyVersion", v)}
          />
          <FilterGroup
            title="Benchmark pack"
            options={packOptions}
            selected={filters.pack}
            onToggle={(v) => toggleInSet("pack", v)}
          />
        </aside>

        <div className="min-w-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-16 text-center">
              <p className="text-[15px] font-medium text-dim">No episodes match these filters</p>
              <button
                type="button"
                onClick={clearAll}
                className="mt-2 text-[15px] font-medium text-accent hover:opacity-80"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-[15px]">
                <thead className="bg-surface">
                  <tr className="text-left text-[11px] tracking-[0.08em] text-mute uppercase">
                    <th className="py-2 pl-3 font-medium">episode</th>
                    <th className="py-2 pl-3 font-medium">task</th>
                    <th className="py-2 pl-3 font-medium">embodiment</th>
                    <th className="py-2 pl-3 font-medium">policy</th>
                    <th className="py-2 pl-3 font-medium">outcome</th>
                    <th className="py-2 pl-3 font-medium">failure</th>
                    <th className="py-2 pl-3 font-medium">duration</th>
                    <th className="py-2 pl-3 pr-3 font-medium">coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.episodeId} className="border-t border-divider hover:bg-hover">
                      <td className="py-1.5 pl-3">
                        <Link href={`/episodes/${e.episodeId}`} className="flex items-center gap-2">
                          <ObservationPreview episode={e} compact />
                          <span className="font-mono text-[15px] text-accent">{e.episodeId}</span>
                        </Link>
                      </td>
                      <td className="py-1.5 pl-3">
                        <Link href={`/episodes/${e.episodeId}`} className="text-text hover:text-accent">
                          {e.task.name}
                        </Link>
                        <p className="text-[12px] text-faint">{e.task.benchmarkPack}</p>
                      </td>
                      <td className="py-1.5 pl-3 text-dim">{e.embodiment.model}</td>
                      <td className="py-1.5 pl-3">
                        <Badge tone="neutral">{e.policyVersion}</Badge>
                      </td>
                      <td className="py-1.5 pl-3">
                        <OutcomeBadge success={e.outcome.success} />
                      </td>
                      <td className="py-1.5 pl-3">
                        {e.failure ? (
                          <FailureBadge category={e.failure.category} />
                        ) : (
                          <span className="text-mute">—</span>
                        )}
                      </td>
                      <td className="py-1.5 pl-3 tabular-nums text-dim">
                        {formatDuration(e.metrics.durationS)}
                      </td>
                      <td className="py-1.5 pl-3 pr-3">
                        <CoverageBar coverage={e.coverage} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

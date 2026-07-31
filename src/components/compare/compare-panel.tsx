"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { StatTile, StatTileRow } from "@/components/ui/stat-tile";
import { Badge } from "@/components/ui/badge";
import { FailureBadge } from "@/components/failure-badge";
import {
  DEFAULT_BASELINE,
  DEFAULT_CANDIDATE,
  EPISODES,
  compareVersions,
} from "@/lib/mock-data";
import { FAILURE_CATEGORIES, FAILURE_CATEGORY_LABEL } from "@/lib/types";
import { FAILURE_CATEGORY_BAR_CLASS } from "@/lib/failure-colors";
import { cn, formatDuration, formatPercent } from "@/lib/utils";
import { useUserEpisodes } from "@/lib/user-data";
import { UploadDataset } from "@/components/upload-dataset";

export function ComparePanel() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const userEpisodes = useUserEpisodes();
  const allEpisodes = useMemo(() => [...EPISODES, ...userEpisodes], [userEpisodes]);
  const allPolicyVersions = useMemo(
    () => Array.from(new Set(allEpisodes.map((e) => e.policyVersion))),
    [allEpisodes],
  );

  const baseline = searchParams.get("baseline") ?? DEFAULT_BASELINE;
  const candidate = searchParams.get("candidate") ?? DEFAULT_CANDIDATE;

  const setVersion = (key: "baseline" | "candidate", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("baseline", key === "baseline" ? value : baseline);
    params.set("candidate", key === "candidate" ? value : candidate);
    router.push(`/compare?${params.toString()}`, { scroll: false });
  };

  const { baselineStats, candidateStats, regressions } = useMemo(
    () => compareVersions(allEpisodes, baseline, candidate),
    [allEpisodes, baseline, candidate],
  );

  const maxFailure = Math.max(
    1,
    ...FAILURE_CATEGORIES.map((c) =>
      Math.max(baselineStats.byFailureCategory[c], candidateStats.byFailureCategory[c]),
    ),
  );

  const same = baseline === candidate;

  return (
    <div className="flex flex-col gap-4">
      <UploadDataset />

      <div>
        <h1 className="text-[20px] font-semibold text-text">Compare policies</h1>
        <p className="mt-0.5 text-[13px] text-faint">
          Detect regressions between two model versions across all shared tasks
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <VersionSelect
          label="Baseline"
          value={baseline}
          onChange={(v) => setVersion("baseline", v)}
          options={allPolicyVersions}
        />
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-mute">
          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <VersionSelect
          label="Candidate"
          value={candidate}
          onChange={(v) => setVersion("candidate", v)}
          options={allPolicyVersions}
        />
      </div>

      {same ? (
        <Card className="border-amber/30 bg-amber/[0.04] px-4 py-3 text-[15px] text-amber">
          Baseline and candidate are the same version. Pick two different versions to see a diff.
        </Card>
      ) : (
        <>
          <StatTileRow className="grid-cols-2 md:grid-cols-4">
            <StatTile
              label="Success rate"
              value={formatPercent(candidateStats.successRate)}
              hint={`baseline ${formatPercent(baselineStats.successRate)}`}
              delta={
                candidateStats.successRate !== null && baselineStats.successRate !== null
                  ? candidateStats.successRate - baselineStats.successRate
                  : undefined
              }
            />
            <StatTile
              label="Avg. duration"
              value={formatDuration(candidateStats.avgDurationS)}
              hint={`baseline ${formatDuration(baselineStats.avgDurationS)}`}
            />
            <StatTile
              label="Avg. interventions"
              value={candidateStats.avgInterventions?.toFixed(2) ?? "-"}
              hint={`baseline ${baselineStats.avgInterventions?.toFixed(2) ?? "-"}`}
            />
            <StatTile
              label="Collision rate"
              value={formatPercent(candidateStats.collisionRate)}
              hint={`baseline ${formatPercent(baselineStats.collisionRate)}`}
              delta={candidateStats.collisionRate - baselineStats.collisionRate}
              invert
            />
          </StatTileRow>

          <Card>
            <CardHeader title="Failures by category" subtitle={`${baseline} vs ${candidate}`} />
            <div className="flex flex-col gap-2.5 px-3.5 py-3">
              {FAILURE_CATEGORIES.map((cat) => (
                <div key={cat} className="flex items-center gap-3 text-[15px]">
                  <span className="w-28 shrink-0 truncate text-dim">{FAILURE_CATEGORY_LABEL[cat]}</span>
                  <div className="flex flex-1 items-center gap-1.5">
                    <Bar value={baselineStats.byFailureCategory[cat]} max={maxFailure} className="bg-faint" />
                    <Bar
                      value={candidateStats.byFailureCategory[cat]}
                      max={maxFailure}
                      className={FAILURE_CATEGORY_BAR_CLASS[cat]}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-[15px] tabular-nums text-faint">
                    {baselineStats.byFailureCategory[cat]} → {candidateStats.byFailureCategory[cat]}
                  </span>
                </div>
              ))}
              <div className="mt-1 flex items-center gap-4 text-[15px] text-faint">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-[1px] bg-faint" /> {baseline}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-[1px] bg-red" /> {candidate}{" "}
                  <span className="text-mute">(color = failure category)</span>
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Regressions by task"
              subtitle="Sorted by largest success-rate drop from baseline to candidate"
            />
            <div className="overflow-x-auto px-3.5 py-3">
              <table className="w-full text-[15px]">
                <thead>
                  <tr className="text-left text-[11px] tracking-[0.08em] text-mute uppercase">
                    <th className="pb-2 pr-2 font-medium">task</th>
                    <th className="pb-2 pr-2 font-medium">baseline</th>
                    <th className="pb-2 pr-2 font-medium">candidate</th>
                    <th className="pb-2 pr-2 font-medium">Δ</th>
                    <th className="pb-2 pr-2 font-medium">top failure (candidate)</th>
                    <th className="pb-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {regressions.length === 0 ? (
                    <tr className="border-t border-divider">
                      <td colSpan={6} className="py-6 text-center text-[13px] text-faint">
                        No tasks with scored episodes in both versions, so nothing to diff.
                      </td>
                    </tr>
                  ) : null}
                  {regressions.map((r) => (
                    <tr key={r.taskName} className="border-t border-divider">
                      <td className="py-2 pr-2 text-text">{r.taskName}</td>
                      <td className="py-2 pr-2 tabular-nums text-dim">
                        {formatPercent(r.baseline.successRate)} <span className="text-mute">(n={r.baseline.n})</span>
                      </td>
                      <td className="py-2 pr-2 tabular-nums text-dim">
                        {formatPercent(r.candidate.successRate)}{" "}
                        <span className="text-mute">(n={r.candidate.n})</span>
                      </td>
                      <td
                        className={cn(
                          "py-2 pr-2 font-medium tabular-nums",
                          r.delta < 0 ? "text-red" : r.delta > 0 ? "text-green" : "text-faint",
                        )}
                      >
                        {r.delta > 0 ? "+" : ""}
                        {formatPercent(r.delta, 1)}
                      </td>
                      <td className="py-2 pr-2">
                        {r.topFailureCategoryCandidate ? (
                          <FailureBadge category={r.topFailureCategoryCandidate} />
                        ) : (
                          <Badge tone="success">none</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-0 text-right">
                        <Link
                          href={`/episodes?q=${encodeURIComponent(r.taskName)}&policy=${encodeURIComponent(candidate)}`}
                          className="text-[15px] font-medium text-accent hover:opacity-80"
                        >
                          View episodes →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hover">
      <div className={cn("h-full rounded-full", className)} style={{ width: `${(value / max) * 100}%` }} />
    </div>
  );
}

function VersionSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="flex items-center gap-2 rounded-sm border border-border-strong bg-inset px-2.5 py-1.5 text-[15px]">
      <span className="text-[15px] font-medium text-faint">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-text focus:outline-none"
      >
        {options.map((v) => (
          <option key={v} value={v} className="bg-inset text-text">
            {v}
          </option>
        ))}
      </select>
    </label>
  );
}

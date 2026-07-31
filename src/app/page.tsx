"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { StatTile, StatTileRow } from "@/components/ui/stat-tile";
import { Badge } from "@/components/ui/badge";
import { OutcomeBadge, FailureBadge } from "@/components/failure-badge";
import { CoverageBar } from "@/components/coverage-bar";
import {
  DATASETS,
  DEFAULT_BASELINE,
  DEFAULT_CANDIDATE,
  EPISODES,
  compareVersions,
  computeStats,
} from "@/lib/mock-data";
import { FAILURE_CATEGORIES, FAILURE_CATEGORY_LABEL, SOURCE_FORMAT_LABEL } from "@/lib/types";
import { FAILURE_CATEGORY_BAR_CLASS } from "@/lib/failure-colors";
import { computeDailyTrend } from "@/lib/timeseries";
import { TrendChart, TrendLegend } from "@/components/charts/trend-chart";
import { formatDateTime, formatDuration, formatPercent } from "@/lib/utils";
import { useUserDataset, useUserEpisodes } from "@/lib/user-data";
import { UploadDataset } from "@/components/upload-dataset";

export default function DashboardPage() {
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

  const stats = computeStats(allEpisodes);

  // Default compare versions only make sense against the bundled data; once
  // a visitor's own upload introduces new policy versions, default to
  // comparing their two most recent instead of a baseline that may not exist
  // in their data at all.
  const baselineVersion = allPolicyVersions.includes(DEFAULT_BASELINE)
    ? DEFAULT_BASELINE
    : (allPolicyVersions[0] ?? DEFAULT_BASELINE);
  const candidateVersion = allPolicyVersions.includes(DEFAULT_CANDIDATE)
    ? DEFAULT_CANDIDATE
    : (allPolicyVersions[allPolicyVersions.length - 1] ?? DEFAULT_CANDIDATE);
  const { regressions } = compareVersions(allEpisodes, baselineVersion, candidateVersion);
  const worstRegression = regressions[0];

  const maxFailureCount = Math.max(1, ...FAILURE_CATEGORIES.map((c) => stats.byFailureCategory[c]));

  const recentEpisodes = [...allEpisodes]
    .sort((a, b) => +new Date(b.recordedAt) - +new Date(a.recordedAt))
    .slice(0, 6);

  const datasetCoverage = Object.fromEntries(
    allDatasets.map((d) => {
      const eps = allEpisodes.filter((e) => e.datasetId === d.datasetId);
      const avgCov = eps.length ? eps.reduce((s, e) => s + e.coverage, 0) / eps.length : 0;
      return [d.datasetId, { count: eps.length, avgCov }];
    }),
  );

  return (
    <div className="flex flex-col gap-4">
      <UploadDataset />

      <div>
        <h1 className="text-[20px] font-semibold text-text">Overview</h1>
        <p className="mt-0.5 text-[13px] text-faint">
          All datasets · {allDatasets.length} sources · {stats.total.toLocaleString()} episodes
        </p>
      </div>

      <StatTileRow className="grid-cols-2 md:grid-cols-4">
        <StatTile label="Total episodes" value={stats.total.toLocaleString()} />
        <StatTile
          label="Overall success rate"
          value={formatPercent(stats.successRate)}
          hint={`${stats.successCount.toLocaleString()} of ${stats.scoredCount.toLocaleString()} scored · ${stats.unscoredCount.toLocaleString()} unscored`}
        />
        <StatTile label="Avg. episode duration" value={formatDuration(stats.avgDurationS)} />
        <StatTile
          label="Collision rate"
          value={formatPercent(stats.collisionRate)}
          hint="of episodes with collision telemetry"
        />
      </StatTileRow>

      {worstRegression && worstRegression.delta < 0 ? (
        <Card className="border-red/30 bg-red/[0.04] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[15px] font-medium text-red">
                Regression detected · {candidateVersion} vs {baselineVersion}
              </p>
              <p className="mt-1 text-[15px] text-dim">
                <span className="font-medium text-text">{worstRegression.taskName}</span> success rate
                dropped {formatPercent(Math.abs(worstRegression.delta))}
                {worstRegression.topFailureCategoryCandidate ? (
                  <>
                    , driven mostly by{" "}
                    <FailureBadge category={worstRegression.topFailureCategoryCandidate} />
                  </>
                ) : null}
                .
              </p>
            </div>
            <Link
              href={`/compare?baseline=${encodeURIComponent(baselineVersion)}&candidate=${encodeURIComponent(candidateVersion)}`}
              className="shrink-0 rounded-sm bg-red/10 px-2.5 py-1.5 text-[13px] font-medium text-red ring-1 ring-inset ring-red/30 hover:bg-red/20"
            >
              Investigate in compare →
            </Link>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Rollouts by day"
          subtitle="Stacked outcomes across all datasets, last 14 days"
          action={<TrendLegend />}
        />
        <div className="px-3.5 py-3">
          <TrendChart buckets={computeDailyTrend(allEpisodes)} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Failures by category" subtitle="All episodes, all versions" />
          <div className="flex flex-col gap-2.5 px-3.5 py-3">
            {FAILURE_CATEGORIES.map((cat) => {
              const count = stats.byFailureCategory[cat];
              const pct = (count / maxFailureCount) * 100;
              return (
                <Link
                  key={cat}
                  href={`/episodes?failure=${cat}`}
                  className="group flex items-center gap-3 text-[15px]"
                >
                  <span className="w-28 shrink-0 truncate text-dim group-hover:text-text">
                    {FAILURE_CATEGORY_LABEL[cat]}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hover">
                    <div
                      className={`h-full rounded-full opacity-80 group-hover:opacity-100 ${FAILURE_CATEGORY_BAR_CLASS[cat]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right tabular-nums text-faint">{count}</span>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader
            title="Datasets"
            subtitle="Ingested via format adapters, canonical schema underneath"
            action={<Badge tone="info">{allPolicyVersions.length} policy versions tracked</Badge>}
          />
          <div className="overflow-x-auto px-3.5 py-3">
            <table className="w-full text-[15px]">
              <thead>
                <tr className="text-left text-[11px] tracking-[0.08em] text-mute uppercase">
                  <th className="pb-2 pr-2 font-medium">dataset</th>
                  <th className="pb-2 pr-2 font-medium">format</th>
                  <th className="pb-2 pr-2 font-medium">episodes</th>
                  <th className="pb-2 pr-2 font-medium">avg. coverage</th>
                  <th className="pb-2 font-medium">ingested</th>
                </tr>
              </thead>
              <tbody>
                {allDatasets.map((d) => (
                  <tr key={d.datasetId} className="border-t border-divider">
                    <td className="py-2 pr-2">
                      <Link
                        href={`/episodes?dataset=${d.datasetId}`}
                        className="font-medium text-text hover:text-accent"
                      >
                        {d.name}
                      </Link>
                      <p className="font-mono text-[12px] text-faint">{d.datasetId}</p>
                    </td>
                    <td className="py-2 pr-2">
                      <Badge tone="neutral">{SOURCE_FORMAT_LABEL[d.sourceFormat]}</Badge>
                    </td>
                    <td className="py-2 pr-2 tabular-nums text-dim">
                      {datasetCoverage[d.datasetId].count}
                    </td>
                    <td className="py-2 pr-2">
                      <CoverageBar coverage={datasetCoverage[d.datasetId].avgCov} />
                    </td>
                    <td className="py-2 text-faint">{formatDateTime(d.ingestedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Recent episodes"
          subtitle="Most recently recorded across all datasets"
          action={
            <Link href="/episodes" className="text-[13px] font-medium text-accent hover:opacity-80">
              Browse all episodes →
            </Link>
          }
        />
        <div className="overflow-x-auto px-3.5 py-3">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="text-left text-[11px] tracking-[0.08em] text-mute uppercase">
                <th className="pb-2 pr-2 font-medium">episode</th>
                <th className="pb-2 pr-2 font-medium">task</th>
                <th className="pb-2 pr-2 font-medium">policy</th>
                <th className="pb-2 pr-2 font-medium">outcome</th>
                <th className="pb-2 pr-2 font-medium">failure</th>
                <th className="pb-2 font-medium">recorded</th>
              </tr>
            </thead>
            <tbody>
              {recentEpisodes.map((e) => (
                <tr key={e.episodeId} className="border-t border-divider">
                  <td className="py-2 pr-2">
                    <Link
                      href={`/episodes/${e.episodeId}`}
                      className="font-mono text-[13px] text-accent hover:opacity-80"
                    >
                      {e.episodeId}
                    </Link>
                  </td>
                  <td className="py-2 pr-2 text-dim">{e.task.name}</td>
                  <td className="py-2 pr-2 text-faint">{e.policyVersion}</td>
                  <td className="py-2 pr-2">
                    <OutcomeBadge success={e.outcome.success} />
                  </td>
                  <td className="py-2 pr-2">
                    {e.failure ? (
                      <FailureBadge category={e.failure.category} />
                    ) : (
                      <span className="text-mute">-</span>
                    )}
                  </td>
                  <td className="py-2 text-faint">{formatDateTime(e.recordedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

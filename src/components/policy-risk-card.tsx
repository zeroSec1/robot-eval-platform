"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildPolicyRiskSummaries } from "@/lib/risk-score";
import { Episode } from "@/lib/types";

// Same interpretive bands as the per-episode card, applied at the policy
// level: "how often has this deployed policy's logged runs looked unusual
// so far," not a prediction of what it will do on its next run.
function band(summary: {
  scoredEpisodes: number;
  unusualCount: number;
  highlyUnusualCount: number;
}): { label: string; tone: "success" | "warning" | "danger" | "neutral" } {
  if (summary.scoredEpisodes === 0) return { label: "Not enough data", tone: "neutral" };
  if (summary.highlyUnusualCount > 0) return { label: "Highly unusual runs", tone: "danger" };
  if (summary.unusualCount > 0) return { label: "Some unusual runs", tone: "warning" };
  return { label: "Typical", tone: "success" };
}

export function PolicyRiskCard({ episodes }: { episodes: Episode[] }) {
  const summaries = useMemo(() => buildPolicyRiskSummaries(episodes), [episodes]);
  const withScoring = summaries.filter((s) => s.scoredEpisodes > 0);

  return (
    <Card>
      <CardHeader
        title="Policy duration risk"
        subtitle="Duration-anomaly rollup per deployed policy version, worst first"
      />
      <div className="flex flex-col gap-1 px-3.5 py-3">
        {withScoring.length === 0 ? (
          <p className="text-[15px] text-faint">
            Not enough labeled successful runs yet to calibrate any policy version (need at least 5 per task).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[15px]">
              <thead>
                <tr className="text-left text-[11px] tracking-[0.08em] text-mute uppercase">
                  <th className="pb-2 pr-2 font-medium">policy version</th>
                  <th className="pb-2 pr-2 font-medium">task</th>
                  <th className="pb-2 pr-2 font-medium">scored runs</th>
                  <th className="pb-2 pr-2 font-medium">unusual</th>
                  <th className="pb-2 pr-2 font-medium">highly unusual</th>
                  <th className="pb-2 font-medium">status</th>
                </tr>
              </thead>
              <tbody>
                {withScoring.slice(0, 10).map((s) => (
                  <tr key={`${s.taskName}\u0000${s.policyVersion}`} className="border-t border-divider">
                    <td className="py-2 pr-2">
                      <Link
                        href={`/episodes?policyVersion=${encodeURIComponent(s.policyVersion)}`}
                        className="font-mono text-[13px] font-medium text-text hover:text-accent"
                      >
                        {s.policyVersion}
                      </Link>
                    </td>
                    <td className="py-2 pr-2 text-dim">{s.taskName}</td>
                    <td className="py-2 pr-2 tabular-nums text-dim">{s.scoredEpisodes}</td>
                    <td className="py-2 pr-2 tabular-nums text-dim">{s.unusualCount}</td>
                    <td className="py-2 pr-2 tabular-nums text-dim">{s.highlyUnusualCount}</td>
                    <td className="py-2">
                      <Badge tone={band(s).tone}>{band(s).label}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[13px] text-faint">
          Rolls up the same per-episode duration-anomaly score by policy version: how often a policy&apos;s
          logged runs have looked statistically unlike its own task&apos;s successful runs so far. It does not
          predict what the policy will do on its next run.{" "}
          <Link href="/methodology" className="text-accent hover:opacity-80">
            How we verify this
          </Link>
          .
        </p>
      </div>
    </Card>
  );
}

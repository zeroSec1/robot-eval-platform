"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildPolicyFailureRates } from "@/lib/risk-score";
import { Episode } from "@/lib/types";

function band(failureRate: number): { tone: "success" | "warning" | "danger" } {
  if (failureRate >= 0.5) return { tone: "danger" };
  if (failureRate >= 0.2) return { tone: "warning" };
  return { tone: "success" };
}

function pct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}

/** The one number in this app that's a genuine forward-looking estimate: an
 * unmodified policy checkpoint's own measured failure rate, pooled across
 * every task it's been evaluated on. Deliberately separate from the
 * per-task duration rollup above, which only compares a run to other runs
 * of the *same* task: this pools across tasks on purpose, because the
 * underlying data (RoboArena's benchmark) is itself a cross-task evaluation
 * of generalist policies, and a policy's aggregate track record is exactly
 * what a fleet operator deciding whether to run that checkpoint would want. */
export function PolicyFailureRateCard({ episodes }: { episodes: Episode[] }) {
  const rates = useMemo(() => buildPolicyFailureRates(episodes), [episodes]);

  return (
    <Card>
      <CardHeader
        title="Policy failure rate"
        subtitle="Real historical outcomes per named policy checkpoint, from independent third-party evaluations"
      />
      <div className="flex flex-col gap-1 px-3.5 py-3">
        {rates.length === 0 ? (
          <p className="text-[15px] text-faint">
            Not enough independently-evaluated trials yet for any single policy checkpoint (need at least 5).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[15px]">
              <thead>
                <tr className="text-left text-[11px] tracking-[0.08em] text-mute uppercase">
                  <th className="pb-2 pr-2 font-medium">policy checkpoint</th>
                  <th className="pb-2 pr-2 font-medium">trials</th>
                  <th className="pb-2 pr-2 font-medium">failures</th>
                  <th className="pb-2 pr-2 font-medium">failure rate</th>
                  <th className="pb-2 font-medium">95% confidence interval</th>
                </tr>
              </thead>
              <tbody>
                {rates.slice(0, 12).map((r) => (
                  <tr key={r.policyVersion} className="border-t border-divider">
                    <td className="py-2 pr-2 font-mono text-[13px] font-medium text-text">{r.policyVersion}</td>
                    <td className="py-2 pr-2 tabular-nums text-dim">{r.trials}</td>
                    <td className="py-2 pr-2 tabular-nums text-dim">{r.failures}</td>
                    <td className="py-2 pr-2">
                      <Badge tone={band(r.failureRate).tone}>{pct(r.failureRate)}</Badge>
                    </td>
                    <td className="py-2 tabular-nums text-faint">
                      [{pct(r.failureRateCI[0])}, {pct(r.failureRateCI[1])}]
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[13px] text-faint">
          Each row is a real, named policy checkpoint's measured pass/fail record across independent evaluation
          trials, pooled across every task it was tested on, with a Wilson confidence interval on the true rate.
          This describes that exact checkpoint&apos;s own historical behavior, not a specific customer&apos;s robot
          or environment.{" "}
          <Link href="/methodology" className="text-accent hover:opacity-80">
            How we verify this
          </Link>
          .
        </p>
      </div>
    </Card>
  );
}

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildTaskCalibration, scoreEpisodeRisk } from "@/lib/risk-score";
import { Episode } from "@/lib/types";

// Plain-language bands for the conformal p-value. These are interpretive
// labels on top of a real statistic, not a separate model — "Highly
// unusual" means "duration this extreme is rare among this task's
// successful runs," nothing more. Deliberately does not use the word
// "risk" of failure or "predict" anywhere in the copy: that claim isn't
// supported by what this method actually computes.
function band(pValue: number): { label: string; tone: "success" | "warning" | "danger" } {
  if (pValue >= 0.2) return { label: "Typical", tone: "success" };
  if (pValue >= 0.05) return { label: "Somewhat unusual", tone: "warning" };
  return { label: "Highly unusual", tone: "danger" };
}

export function RiskScoreCard({ episode, allEpisodes }: { episode: Episode; allEpisodes: Episode[] }) {
  const result = useMemo(() => {
    const calibration = buildTaskCalibration(allEpisodes);
    return scoreEpisodeRisk(episode, calibration);
  }, [episode, allEpisodes]);

  return (
    <Card>
      <CardHeader title="Duration anomaly" subtitle="Conformal comparison to this task's successful runs" />
      <div className="flex flex-col gap-2.5 px-3.5 py-3 text-[15px]">
        {result === null ? (
          <p className="text-faint">
            Not enough labeled successful runs of this task yet to compare against (need at least 5).
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <span className="text-faint">how unusual</span>
              <Badge tone={band(result.pValue).tone}>{band(result.pValue).label}</Badge>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-faint">p-value</span>
              <span className="tabular-nums text-dim">{result.pValue.toFixed(3)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-faint">compared against</span>
              <span className="tabular-nums text-dim">{result.calibrationSize} successful runs</span>
            </div>
            <p className="mt-1 text-[13px] text-faint">
              A duration this extreme is expected in roughly {(result.pValue * 100).toFixed(0)}% of successful
              runs of this task. This compares duration only, it is not a failure prediction.{" "}
              <Link href="/methodology" className="text-accent hover:opacity-80">
                How we verify this
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </Card>
  );
}

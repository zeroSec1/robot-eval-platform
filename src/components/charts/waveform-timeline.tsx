"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Episode, EpisodeTelemetry } from "@/lib/types";
import { generateWaveformTracks } from "@/lib/timeseries";
import { cn } from "@/lib/utils";

function fmtTime(t: number) {
  if (t < 60) return `${t.toFixed(1)}s`;
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}m ${s.toFixed(1)}s`;
}

/** Per-signal bar tracks on the episode's clock (same as the video player;
 * hovering shows the time, clicking seeks the video).
 *
 * With real telemetry (PushT: coverage reward, agent speed, tracking error
 * extracted from the LeRobot parquet at 10 Hz) the bars are real data and
 * the anomaly marker is genuinely detected: the first sustained drop below
 * the coverage envelope of successful trials (execution-monitoring style;
 * see scripts/extract-pusht-telemetry.py). Without telemetry the bars are a
 * clearly-labeled synthetic preview and no anomaly is shown. */
export function WaveformTimeline({
  episode,
  telemetry,
}: {
  episode: Episode;
  telemetry?: EpisodeTelemetry | null;
}) {
  const duration = episode.metrics.durationS;
  const real = telemetry ?? null;
  const tracks = real ? real.tracks : generateWaveformTracks(episode);
  const barsPerTrack = tracks[0]?.bars.length ?? 140;

  const anomalyS = real?.anomalyS ?? null;
  const anomalyIndex =
    anomalyS !== null && duration !== null && duration > 0
      ? Math.min(barsPerTrack - 1, Math.round((anomalyS / duration) * barsPerTrack))
      : null;

  const [hoverFrac, setHoverFrac] = useState<number | null>(null);
  const hoverTime = hoverFrac !== null && duration !== null ? hoverFrac * duration : null;

  const subtitle =
    duration !== null
      ? `0.0s → ${duration.toFixed(1)}s · ${real ? "real telemetry (10 Hz)" : "synthetic signal preview"} · click to seek the video`
      : "Duration not recorded · synthetic signal preview";

  return (
    <Card>
      <CardHeader
        title="Action & state timeline"
        subtitle={subtitle}
        action={
          anomalyS !== null ? (
            <span className="text-[12px] text-red" title={real?.anomalyMethod ?? undefined}>
              Anomaly at ~{anomalyS.toFixed(1)}s ·{" "}
              {real?.anomalyMethod?.includes("envelope")
                ? "diverged from success envelope"
                : "coverage peak"}
            </span>
          ) : real ? (
            <span className="text-[12px] text-faint">No anomaly detected</span>
          ) : (
            <span className="text-[12px] text-faint">No telemetry to analyze</span>
          )
        }
      />
      <div className="flex flex-col gap-2.5 px-3.5 py-3">
        <div className="flex gap-3">
          <div className="flex w-32 shrink-0 flex-col gap-2.5">
            {tracks.map((track) => (
              <div
                key={track.name}
                className="flex h-8 items-center justify-end truncate font-mono text-[11px] text-dim md:text-[12px]"
              >
                {track.name}
              </div>
            ))}
          </div>
          <div
            className="relative flex flex-1 cursor-crosshair flex-col gap-2.5"
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setHoverFrac(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
            }}
            onMouseLeave={() => setHoverFrac(null)}
            onClick={(e) => {
              if (duration === null) return;
              const r = e.currentTarget.getBoundingClientRect();
              const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
              window.dispatchEvent(
                new CustomEvent("robot-eval:seek", { detail: frac * duration }),
              );
            }}
          >
            {tracks.map((track) => (
              <div key={track.name} className="relative h-8 overflow-hidden rounded-sm bg-inset">
                <div className="absolute inset-0 flex items-end gap-px px-px">
                  {track.bars.map((h, i) => {
                    const inAnomaly = anomalyIndex !== null && Math.abs(i - anomalyIndex) <= 3;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex-1 rounded-[0.5px]",
                          inAnomaly ? "bg-red" : "bg-accent/50",
                        )}
                        style={{ height: `${h * 100}%` }}
                      />
                    );
                  })}
                </div>
                {anomalyIndex !== null ? (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-red"
                    style={{ left: `${((anomalyIndex + 0.5) / barsPerTrack) * 100}%` }}
                  />
                ) : null}
              </div>
            ))}
            {hoverFrac !== null && hoverTime !== null ? (
              <>
                <div
                  className="pointer-events-none absolute top-0 bottom-0 w-px bg-text/60"
                  style={{ left: `${hoverFrac * 100}%` }}
                />
                <div
                  className="pointer-events-none absolute -top-1 z-10 -translate-y-full rounded-sm border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap text-text tabular-nums shadow-sm"
                  style={{
                    left: `${hoverFrac * 100}%`,
                    transform: `translateX(${hoverFrac > 0.92 ? "-100%" : hoverFrac < 0.08 ? "0" : "-50%"}) translateY(-100%)`,
                  }}
                >
                  {fmtTime(hoverTime)}
                </div>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex gap-3 text-[11px] text-mute">
          <div className="w-32 shrink-0" />
          <div className="flex flex-1 justify-between">
            <span>0.0s</span>
            {duration !== null ? <span>{duration.toFixed(1)}s</span> : <span>-</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}

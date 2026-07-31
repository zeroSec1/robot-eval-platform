"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Episode } from "@/lib/types";
import { generateWaveformTracks } from "@/lib/timeseries";
import { cn } from "@/lib/utils";

function fmtTime(t: number) {
  if (t < 60) return `${t.toFixed(1)}s`;
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}m ${s.toFixed(1)}s`;
}

/** Per-signal bar "waveform" tracks with the failure window highlighted,
 * the mockup's action & state timeline. Data is deterministic per episode.
 * The x axis is episode time, the same clock as the video player above it;
 * hovering shows a cursor line with the time at that position. */
export function WaveformTimeline({ episode }: { episode: Episode }) {
  const tracks = generateWaveformTracks(episode);
  const duration = episode.metrics.durationS;
  const anomalyIndex = tracks[0]?.anomalyIndex ?? null;
  const barsPerTrack = tracks[0]?.bars.length ?? 48;
  const anomalyTime =
    anomalyIndex !== null && duration !== null
      ? ((anomalyIndex / barsPerTrack) * duration).toFixed(1)
      : null;

  const [hoverFrac, setHoverFrac] = useState<number | null>(null);
  const hoverTime = hoverFrac !== null && duration !== null ? hoverFrac * duration : null;

  return (
    <Card>
      <CardHeader
        title="Action & state timeline"
        subtitle={
          duration !== null
            ? `0.0s → ${duration.toFixed(1)}s · synthetic signal preview · click to seek the video`
            : "Duration not recorded · synthetic signal preview"
        }
        action={
          anomalyTime !== null ? (
            <span className="text-[12px] text-red">Anomaly at ~{anomalyTime}s</span>
          ) : (
            <span className="text-[12px] text-faint">No anomaly detected</span>
          )
        }
      />
      <div className="flex flex-col gap-2.5 px-3.5 py-3">
        <div className="flex gap-3">
          <div className="flex w-32 shrink-0 flex-col gap-2.5">
            {tracks.map((track) => (
              <div
                key={track.name}
                className="flex h-8 items-center justify-end font-mono text-[12px] text-dim"
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
                    const inAnomaly =
                      track.anomalyIndex !== null && Math.abs(i - track.anomalyIndex) <= 3;
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
                {track.anomalyIndex !== null ? (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-red"
                    style={{ left: `${((track.anomalyIndex + 0.5) / track.bars.length) * 100}%` }}
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

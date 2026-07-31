import { Card, CardHeader } from "@/components/ui/card";
import { Episode } from "@/lib/types";
import { generateWaveformTracks } from "@/lib/timeseries";
import { cn } from "@/lib/utils";

/** Per-signal bar "waveform" tracks with the failure window highlighted —
 * the mockup's action & state timeline. Data is deterministic per episode. */
export function WaveformTimeline({ episode }: { episode: Episode }) {
  const tracks = generateWaveformTracks(episode);
  const duration = episode.metrics.durationS;
  const anomalyIndex = tracks[0]?.anomalyIndex ?? null;
  const barsPerTrack = tracks[0]?.bars.length ?? 48;
  const anomalyTime =
    anomalyIndex !== null && duration !== null
      ? ((anomalyIndex / barsPerTrack) * duration).toFixed(1)
      : null;

  return (
    <Card>
      <CardHeader
        title="Action & state timeline"
        subtitle={
          duration !== null
            ? `0.0s → ${duration.toFixed(1)}s · synthetic signal preview`
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
        {tracks.map((track) => (
          <div key={track.name} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-right font-mono text-[12px] text-dim">
              {track.name}
            </span>
            <div className="relative h-8 flex-1 overflow-hidden rounded-sm bg-inset">
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
          </div>
        ))}
        <div className="flex justify-between pl-35 text-[11px] text-mute">
          <span>0.0s</span>
          {duration !== null ? <span>{duration.toFixed(1)}s</span> : <span>-</span>}
        </div>
      </div>
    </Card>
  );
}

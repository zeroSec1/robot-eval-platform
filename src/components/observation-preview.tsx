import { cn } from "@/lib/utils";
import { Episode } from "@/lib/types";
import { EpisodeVideo } from "./episode-video";

// Deterministic pseudo-random gradient per episode so the "observation
// stream" placeholder looks distinct per row without pulling in real
// video/image assets (there is no backend wired up yet).
function gradientFor(episodeId: string) {
  let hash = 0;
  for (let i = 0; i < episodeId.length; i++) hash = (hash * 31 + episodeId.charCodeAt(i)) >>> 0;
  const hueA = hash % 360;
  const hueB = (hueA + 45 + (hash % 40)) % 360;
  return `linear-gradient(135deg, hsl(${hueA} 45% 18%), hsl(${hueB} 40% 10%))`;
}

function PlayIcon({ compact }: { compact: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("text-white/70", compact ? "h-4 w-4" : "h-9 w-9")}
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function NoVideoIcon({ compact }: { compact: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-white/45", compact ? "h-4 w-4" : "h-8 w-8")}
    >
      <path d="M16 16.6A2 2 0 0 1 14 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h.6M10.7 6H14a2 2 0 0 1 2 2v3.3l6-3.3v8l-2.2-1.2" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export function ObservationPreview({
  episode,
  className,
  compact = false,
}: {
  episode: Episode;
  className?: string;
  compact?: boolean;
}) {
  // Real observation video (local copy, falling back to the dataset host),
  // scoped to this episode's segment. Only in the full-size view — the
  // episode table shouldn't load hundreds of videos.
  if (!compact && episode.video) {
    return (
      <div className={cn("overflow-hidden rounded-sm border border-border-strong", className)}>
        {/* key remounts the player (fresh state) when the episode's video changes */}
        <EpisodeVideo key={episode.video.url} video={episode.video} />
        <div className="flex items-center justify-between bg-inset px-2 py-1 text-[11px] text-faint">
          <span className="font-mono">{episode.video.camera}</span>
          <span>
            real footage · {episode.video.fromS}s–{episode.video.toS}s of source file
          </span>
        </div>
      </div>
    );
  }

  const hasVideo = episode.video !== undefined;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-sm border border-border-strong",
        compact ? "h-12 w-16" : "aspect-video w-full",
        !compact && "flex-col gap-2",
        className,
      )}
      style={{ backgroundImage: gradientFor(episode.episodeId) }}
    >
      {hasVideo ? <PlayIcon compact={compact} /> : <NoVideoIcon compact={compact} />}
      {!compact && !hasVideo ? (
        <span className="px-4 text-center text-[13px] text-white/60">
          No video in source dataset
        </span>
      ) : null}
      {!compact ? (
        <span className="absolute bottom-1.5 left-2 rounded bg-black/50 px-1.5 py-0.5 text-[12px] font-medium text-white/80">
          {episode.embodiment.sensors.join(" · ")}
        </span>
      ) : null}
    </div>
  );
}

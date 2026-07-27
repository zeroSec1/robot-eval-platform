"use client";

import { useCallback, useRef, useState } from "react";
import { VideoRef } from "@/lib/types";

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Plays exactly this episode's segment of a source file that may contain
 * many episodes back-to-back. Native controls would show the WHOLE file's
 * timeline (confusing), so we render our own: the scrubber and clock are
 * episode-relative — 0:00 is the episode start, and the duration shown is
 * the episode's own length. Falls back to the remote sourceUrl if the local
 * copy is missing. Nothing downloads until play (preload="metadata"). */
export function EpisodeVideo({ video }: { video: VideoRef }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState(video.url);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0); // episode-relative seconds
  const segLen = Math.max(0.1, video.toS - video.fromS);

  const onTimeUpdate = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (el.currentTime >= video.toS) {
      el.pause();
      el.currentTime = video.fromS;
      setT(segLen);
      return;
    }
    if (el.currentTime < video.fromS - 0.5) el.currentTime = video.fromS;
    setT(Math.max(0, el.currentTime - video.fromS));
  }, [video.fromS, video.toS, segLen]);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      if (el.currentTime < video.fromS || el.currentTime >= video.toS) {
        el.currentTime = video.fromS;
      }
      el.play();
    } else {
      el.pause();
    }
  };

  const seek = (value: number) => {
    const el = ref.current;
    if (!el) return;
    el.currentTime = video.fromS + value;
    setT(value);
  };

  return (
    <div className="group relative">
      <video
        ref={ref}
        muted
        playsInline
        preload="metadata"
        className="aspect-video w-full cursor-pointer bg-black"
        src={`${src}#t=${video.fromS},${video.toS}`}
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={onTimeUpdate}
        onError={() => {
          if (video.sourceUrl && src !== video.sourceUrl) setSrc(video.sourceUrl);
        }}
        onLoadedMetadata={() => {
          const el = ref.current;
          if (el && el.currentTime < video.fromS) el.currentTime = video.fromS;
        }}
      />

      {/* Big center play button when paused */}
      {!playing ? (
        <button
          type="button"
          aria-label="Play episode video"
          onClick={toggle}
          className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-7 w-7">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      ) : null}

      {/* Episode-relative control bar */}
      <div className="absolute right-0 bottom-0 left-0 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-3 pt-6 pb-2">
        <button
          type="button"
          aria-label={playing ? "Pause" : "Play"}
          onClick={toggle}
          className="text-white/90 hover:text-white"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <input
          type="range"
          min={0}
          max={segLen}
          step={0.1}
          value={Math.min(t, segLen)}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Seek within episode"
          className="h-1 flex-1 cursor-pointer accent-[var(--accent)]"
        />
        <span className="font-mono text-[12px] text-white/90 tabular-nums">
          {fmt(t)} / {fmt(segLen)}
        </span>
      </div>
    </div>
  );
}

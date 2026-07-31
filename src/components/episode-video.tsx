"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
 * the episode's own length. Nothing downloads until play (preload="metadata").
 *
 * Sources are tried in order until one plays:
 *   1. clipUrl — per-episode H.264 clip (0-based), needed because WebKit
 *      (Safari, DuckDuckGo) can't decode the AV1 source files
 *   2. url — local mirror of the source file (episode at fromS..toS)
 *   3. sourceUrl — remote original on the dataset host
 * If every source fails, a visible message replaces the silent black box. */
export function EpisodeVideo({ video }: { video: VideoRef }) {
  const ref = useRef<HTMLVideoElement>(null);
  const segLen = Math.max(0.1, video.toS - video.fromS);

  // Each candidate carries its own episode window: clips start at 0,
  // shared source files start at fromS.
  const candidates = useMemo(() => {
    const list: { src: string; fromS: number; toS: number }[] = [];
    if (video.clipUrl) list.push({ src: video.clipUrl, fromS: 0, toS: segLen });
    list.push({ src: video.url, fromS: video.fromS, toS: video.toS });
    if (video.sourceUrl && video.sourceUrl !== video.url)
      list.push({ src: video.sourceUrl, fromS: video.fromS, toS: video.toS });
    return list;
  }, [video, segLen]);

  const [srcIndex, setSrcIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0); // episode-relative seconds
  const active = candidates[Math.min(srcIndex, candidates.length - 1)];
  const exhausted = srcIndex >= candidates.length;

  const onTimeUpdate = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (el.currentTime >= active.toS) {
      el.pause();
      el.currentTime = active.fromS;
      setT(segLen);
      return;
    }
    if (el.currentTime < active.fromS - 0.5) el.currentTime = active.fromS;
    setT(Math.max(0, el.currentTime - active.fromS));
  }, [active.fromS, active.toS, segLen]);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      if (el.currentTime < active.fromS || el.currentTime >= active.toS) {
        el.currentTime = active.fromS;
      }
      el.play();
    } else {
      el.pause();
    }
  };

  const seek = (value: number) => {
    const el = ref.current;
    if (!el) return;
    el.currentTime = active.fromS + value;
    setT(value);
  };

  if (exhausted) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-black px-6 text-center">
        <p className="text-[14px] text-white/85">
          This browser can’t decode this episode’s video.
        </p>
        {video.sourceUrl ? (
          <a
            href={video.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[13px] text-white/60 underline decoration-dotted hover:text-white"
          >
            Open the source file directly
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="group relative">
      <video
        ref={ref}
        muted
        playsInline
        preload="metadata"
        className="aspect-video w-full cursor-pointer bg-black"
        src={`${active.src}#t=${Math.round(active.fromS * 1000) / 1000},${Math.round(active.toS * 1000) / 1000}`}
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={onTimeUpdate}
        onError={() => {
          setPlaying(false);
          setT(0);
          setSrcIndex((i) => i + 1);
        }}
        onLoadedMetadata={() => {
          const el = ref.current;
          if (el && el.currentTime < active.fromS) el.currentTime = active.fromS;
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

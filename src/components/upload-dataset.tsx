"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  addUploadedEpisodes,
  clearUploadedEpisodes,
  parseUploadedFile,
  UploadParseError,
  useUserEpisodes,
} from "@/lib/user-data";

type Status = { kind: "idle" } | { kind: "error"; message: string } | { kind: "done"; count: number };

export function UploadDataset() {
  const uploaded = useUserEpisodes();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [busy, setBusy] = useState(false);

  const onPick = () => inputRef.current?.click();

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      const episodes = await parseUploadedFile(file);
      addUploadedEpisodes(episodes);
      setStatus({ kind: "done", count: episodes.length });
    } catch (err) {
      const message = err instanceof UploadParseError ? err.message : "Couldn't read that file.";
      setStatus({ kind: "error", message });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* sr-only, not `hidden` (display:none) — some browsers refuse to open
          a file picker via .click() on a fully display:none input. */}
      <input
        ref={inputRef}
        type="file"
        accept=".json,.csv,application/json,text/csv"
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={onPick}
        disabled={busy}
        className="rounded-sm bg-accent/10 px-3 py-1.5 text-[13px] font-medium text-accent ring-1 ring-inset ring-accent/30 hover:bg-accent/20 disabled:opacity-50"
      >
        {busy ? "Reading…" : "Upload your dataset"}
      </button>
      <span className="text-[12px] text-faint">.json or .csv — stays in your browser, never uploaded to a server</span>

      {uploaded.length > 0 ? (
        <>
          <Badge tone="success">{uploaded.length} of your episodes loaded</Badge>
          <button
            type="button"
            onClick={() => {
              clearUploadedEpisodes();
              setStatus({ kind: "idle" });
            }}
            className="text-[12px] font-medium text-mute hover:text-dim"
          >
            Clear
          </button>
        </>
      ) : null}

      {status.kind === "done" ? (
        <Badge tone="info">Added {status.count} episode{status.count === 1 ? "" : "s"}</Badge>
      ) : null}
      {status.kind === "error" ? <Badge tone="danger">{status.message}</Badge> : null}
    </div>
  );
}

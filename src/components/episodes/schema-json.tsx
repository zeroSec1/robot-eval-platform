"use client";

import { useState } from "react";
import { Episode } from "@/lib/types";

export function SchemaJson({ episode }: { episode: Episode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] tracking-[0.1em] text-mute uppercase hover:text-text"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`}
        >
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Canonical episode schema (JSON)
      </button>
      {open ? (
        <pre className="mt-3 max-h-96 overflow-auto rounded-sm border border-border bg-inset p-3 font-mono text-[13px] leading-relaxed text-dim">
          {JSON.stringify(episode, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

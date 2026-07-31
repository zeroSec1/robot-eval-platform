"use client";

import { useEffect, useState } from "react";
import { Episode } from "@/lib/types";

/** Opens as a fixed overlay instead of expanding in place, so the page
 * layout never grows when the schema is shown. */
export function SchemaJson({ episode }: { episode: Episode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Canonical episode schema (JSON)"
            className="flex max-h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-md border border-border-strong bg-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="text-[11px] tracking-[0.1em] text-mute uppercase">
                Canonical episode schema (JSON)
              </span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="rounded-sm px-1.5 text-[16px] leading-none text-mute hover:text-text"
              >
                ×
              </button>
            </div>
            <pre className="flex-1 overflow-auto bg-inset p-3 font-mono text-[13px] leading-relaxed text-dim">
              {JSON.stringify(episode, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

export function FilterGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: FilterOption[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] tracking-[0.1em] text-mute uppercase">{title}</p>
      <div className="flex flex-col gap-px">
        {options.map((opt) => {
          const active = selected.has(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
              aria-pressed={active}
              aria-label={`Filter by ${title}: ${opt.label} (${opt.count} episodes)`}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-left text-[14px] transition-colors",
                active ? "text-accent" : "text-dim hover:bg-hover hover:text-text",
              )}
            >
              <span
                className={cn(
                  "flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-[2px] border",
                  active ? "border-accent bg-accent" : "border-border-strong",
                )}
              >
                {active ? (
                  <svg viewBox="0 0 12 12" className="h-2 w-2 text-bg">
                    <path
                      d="M2.5 6.2 5 8.7l4.5-5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </span>
              <span className="flex-1 truncate">{opt.label}</span>
              <span className="shrink-0 tabular-nums text-mute">{opt.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

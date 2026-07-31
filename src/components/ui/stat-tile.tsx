import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  hint,
  delta,
  invert = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  /** Raw change in the displayed value (candidate - baseline). Arrow direction always matches this sign. */
  delta?: number;
  /** Set true when a lower value is the improvement (e.g. collision rate), so color still reads correctly. */
  invert?: boolean;
  className?: string;
}) {
  const isGood = delta === undefined || delta === 0 ? null : invert ? delta < 0 : delta > 0;
  return (
    <div className={cn("flex flex-col gap-1.5 bg-inset px-3.5 py-3", className)}>
      <p className="text-[11px] tracking-[0.1em] text-faint uppercase">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-medium tracking-tight text-text tabular-nums">{value}</span>
        {delta !== undefined && Number.isFinite(delta) ? (
          <span
            className={cn(
              "text-[12px] font-medium tabular-nums",
              isGood === null ? "text-faint" : isGood ? "text-green" : "text-red",
            )}
          >
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "-"} {Math.abs(delta * 100).toFixed(1)}pp
          </span>
        ) : null}
      </div>
      {hint ? <p className="text-[13px] text-faint">{hint}</p> : null}
    </div>
  );
}

/** Wraps StatTile children in the mockup's hairline-divider grid trick: a
 * 1px bg-border gap between cells reads as thin rules without extra borders. */
export function StatTileRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-md border border-border bg-border",
        className,
      )}
    >
      {children}
    </div>
  );
}

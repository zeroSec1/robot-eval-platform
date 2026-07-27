import { cn } from "@/lib/utils";

export function CoverageBar({ coverage, className }: { coverage: number; className?: string }) {
  const pct = Math.round(coverage * 100);
  const tone = coverage >= 0.8 ? "bg-green" : coverage >= 0.5 ? "bg-amber" : "bg-red";
  return (
    <div className={cn("flex items-center gap-2", className)} title={`${pct}% of canonical fields populated`}>
      <div className="h-1 w-16 overflow-hidden rounded-full bg-hover">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] tabular-nums text-faint">{pct}%</span>
    </div>
  );
}

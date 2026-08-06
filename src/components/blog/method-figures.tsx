"use client";

import DATA from "@/data/method-figures.json";

// Values come from src/data/method-figures.json, produced by
// scripts/build-method-figures.py, which reads eval-report.json. Nothing
// here hardcodes a number. The violet/orange pair passes CVD separation
// in both themes, and each bar is directly labelled with its own count
// and percentage, so meaning never rests on colour.

const W = 640;
const OURS = "var(--violet)";
const BENCH = "var(--orange)";

export function BarComparison() {
  const { bars, maxRewardObserved, episodesWhereDatasetFlagTrue, episodesInSourceDataset } =
    DATA.barComparison;
  const barH = 34;
  const gap = 40;
  const top = 20;
  const left = 8;
  const plotW = W - left - 230;
  const h = bars.length * (barH + gap) + top;

  return (
    <figure className="my-1 rounded-md border border-border bg-card p-3.5">
      <svg viewBox={`0 0 ${W} ${h}`} className="h-auto w-full" role="img"
        aria-label="The same 52 trials scored against two different pass marks">
        {bars.map((b, i) => {
          const y = top + i * (barH + gap);
          // scale against the total, so an empty bar reads as empty
          const w = (b.passed / b.total) * plotW;
          return (
            <g key={b.label}>
              <text x={left} y={y - 6} className="fill-dim" fontSize={12.5}>
                {b.label}
              </text>
              <rect x={left} y={y} width={plotW} height={barH} rx={4}
                fill="var(--hover)" />
              {w > 0 && (
                <rect x={left} y={y} width={w} height={barH} rx={4}
                  fill={b.kind === "ours" ? OURS : BENCH} />
              )}
              <text x={left + plotW + 12} y={y + barH / 2 + 5} className="fill-text"
                fontSize={14} fontWeight={600}
                style={{ fontVariantNumeric: "tabular-nums" }}>
                {b.passed} of {b.total} passed
                <tspan className="fill-faint" fontWeight={400}>{"  "}({b.pct}%)</tspan>
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-[12.5px] leading-relaxed text-faint">
        Figure 1. The same 52 trials, scored twice. Our chosen pass mark produced a headline of{" "}
        {bars[0].pct}%. The benchmark&apos;s own pass mark produces zero, because no trial in the source dataset
        ever exceeds a peak reward of {maxRewardObserved}, and the dataset&apos;s own success flag is true for{" "}
        {episodesWhereDatasetFlagTrue} of {episodesInSourceDataset} episodes. Nothing about the robots changed.
        Only the bar did.
      </figcaption>
    </figure>
  );
}

export function RecordChecklist() {
  return (
    <figure className="my-1 rounded-md border border-border bg-card p-3.5">
      <div className="flex flex-col">
        {DATA.record.map((r, i) => (
          <div key={r.item}
            className={`py-2 ${i < DATA.record.length - 1 ? "border-b border-divider" : ""}`}>
            <div className="flex items-baseline gap-2.5">
              <span className="flex h-5 w-5 shrink-0 translate-y-0.5 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent">
                {i + 1}
              </span>
              <span className="text-[14px] font-medium text-text">{r.item}</span>
            </div>
            <p className="mt-1 pl-[30px] text-[13px] leading-relaxed text-faint">{r.why}</p>
          </div>
        ))}
      </div>
      <figcaption className="mt-2 text-[12.5px] leading-relaxed text-faint">
        Figure 2. The minimum a trial log needs for any of this to work. None of it requires our software, or any
        software beyond a spreadsheet and a clock.
      </figcaption>
    </figure>
  );
}

"use client";

import DATA from "@/data/detectability.json";

// Values come from src/data/detectability.json, produced by
// scripts/build-detectability.py. Nothing here hardcodes a number.
// One series, so no legend is needed: the title names what is plotted.
// The coin-flip reference line is a rule, not a data series, and is
// drawn in a neutral border colour with a direct label.

const W = 640;
const LINE = "var(--violet)";

export function DetectabilityCurve() {
  const c = DATA.aucCurve;
  const h = 300;
  const m = { top: 18, right: 18, bottom: 42, left: 46 };
  const sx = (f: number) => m.left + f * (W - m.left - m.right);
  const sy = (a: number) => m.top + (1 - (a - 0.4) / 0.6) * (h - m.top - m.bottom);

  const path = c
    .map((d, i) => `${i ? "L" : "M"}${sx(d.watchedFraction).toFixed(1)},${sy(d.auc).toFixed(1)}`)
    .join("");

  return (
    <figure className="my-1 rounded-md border border-border bg-card p-3.5">
      <svg viewBox={`0 0 ${W} ${h}`} className="h-auto w-full" role="img"
        aria-label="How well the outcome can be ranked after watching part of a trial, measured as AUC">
        {[0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((a) => (
          <g key={a}>
            <line x1={m.left} x2={W - m.right} y1={sy(a)} y2={sy(a)}
              stroke="var(--border)" strokeWidth={1} />
            <text x={m.left - 6} y={sy(a) + 4} textAnchor="end" fontSize={11}
              className="fill-faint" style={{ fontVariantNumeric: "tabular-nums" }}>
              {a.toFixed(1)}
            </text>
          </g>
        ))}
        {/* coin-flip reference */}
        <line x1={m.left} x2={W - m.right} y1={sy(0.5)} y2={sy(0.5)}
          stroke="var(--border-strong)" strokeWidth={1.5} strokeDasharray="0" />
        <text x={m.left + 6} y={sy(0.5) - 6} fontSize={11.5} className="fill-dim">
          0.5 = a coin flip
        </text>
        {[0.2, 0.4, 0.6, 0.8, 1.0].map((f) => (
          <text key={f} x={sx(f)} y={h - 16} textAnchor="middle" fontSize={11}
            className="fill-faint" style={{ fontVariantNumeric: "tabular-nums" }}>
            {Math.round(f * 100)}%
          </text>
        ))}
        <text x={(W) / 2} y={h - 2} textAnchor="middle" fontSize={11.5} className="fill-faint">
          how much of the trial you have watched
        </text>
        <path d={path} fill="none" stroke={LINE} strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round" />
        {c.map((d) => (
          <circle key={d.watchedFraction} cx={sx(d.watchedFraction)} cy={sy(d.auc)} r={4}
            fill={LINE} stroke="var(--card)" strokeWidth={2} />
        ))}
        <text x={sx(0.95) - 8} y={sy(DATA.verdict.aucAt95Pct) - 12} textAnchor="end"
          fontSize={11.5} className="fill-text">
          still {DATA.verdict.aucAt95Pct} at 95%
        </text>
      </svg>
      <figcaption className="mt-2 text-[12.5px] leading-relaxed text-faint">
        Figure. How well the eventual outcome can be ranked after watching part of a trial, across all{" "}
        {DATA.episodes} episodes. It sits near a coin flip for most of the trial and is still only{" "}
        {DATA.verdict.aucAt95Pct} at 95% watched. It reaches 1.0 at the end only because the outcome is defined by
        the final value. On this data there is nothing to predict early, so no early-warning method can work, and
        one that appears to is fitting noise.
      </figcaption>
    </figure>
  );
}

"use client";

import DATA from "@/data/humanoid-figures.json";

// Values come from src/data/humanoid-figures.json, produced by
// scripts/build-humanoid-figures.py. Nothing here hardcodes a number.
// The scorecard pair (teal / orange) passes CVD separation in both
// themes, and every row also carries its status in words, so the
// meaning never rests on colour.

const W = 640;
const MONEY = "var(--violet)";
const YES = "var(--accent)";
const NO = "var(--orange)";

export function FundingChart() {
  const f = DATA.funding;
  const max = Math.max(...f.map((d) => d.raisedUSDm));
  const barH = 26;
  const gap = 34;
  const top = 18;
  const left = 8;
  const plotW = W - left - 260;
  const h = f.length * (barH + gap) + top;

  return (
    <figure className="my-1 rounded-md border border-border bg-card p-3.5">
      <svg viewBox={`0 0 ${W} ${h}`} className="h-auto w-full" role="img"
        aria-label="Bar chart of capital raised by three humanoid robot companies">
        {f.map((d, i) => {
          const y = top + i * (barH + gap);
          const w = Math.max((d.raisedUSDm / max) * plotW, 8);
          return (
            <g key={d.company}>
              <text x={left} y={y - 5} className="fill-dim" fontSize={12.5}>
                {d.company} · {d.when}
              </text>
              <rect x={left} y={y} width={w} height={barH} rx={4} fill={MONEY} />
              <text x={left + w + 10} y={y + barH / 2 + 5} className="fill-text"
                fontSize={13.5} fontWeight={600}
                style={{ fontVariantNumeric: "tabular-nums" }}>
                ${d.raisedUSDm >= 1000 ? `${(d.raisedUSDm / 1000).toFixed(1)}B` : `${d.raisedUSDm}M`}
                <tspan className="fill-faint" fontWeight={400}>
                  {"  "}at ${d.valuationUSDb}B valuation
                </tspan>
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-[12.5px] leading-relaxed text-faint">
        Figure 1. Capital raised by three humanoid makers, about $
        {(DATA.fundingTotals.raisedUSDm / 1000).toFixed(1)} billion between them, at a combined valuation near $
        {DATA.fundingTotals.combinedValuationUSDb} billion. Compare that with Figure 2.
      </figcaption>
    </figure>
  );
}

export function DisclosureScorecard() {
  const s = DATA.scorecard;
  return (
    <figure className="my-1 rounded-md border border-border bg-card p-3.5">
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5 text-[12px] text-dim">
          <span className="h-2 w-2 rounded-full" style={{ background: YES }} />
          published
        </span>
        <span className="flex items-center gap-1.5 text-[12px] text-dim">
          <span className="h-2 w-2 rounded-full" style={{ background: NO }} />
          never published
        </span>
      </div>
      <div className="flex flex-col">
        {s.map((row, i) => (
          <div key={row.metric}
            className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 ${
              i < s.length - 1 ? "border-b border-divider" : ""
            }`}>
            <span className="flex items-baseline gap-2 text-[13.5px] text-dim">
              <span aria-hidden className="translate-y-0.5 text-[13px] font-semibold"
                style={{ color: row.disclosed ? YES : NO }}>
                {row.disclosed ? "✓" : "✗"}
              </span>
              {row.metric}
            </span>
            <span className="text-[13px] font-medium"
              style={{ color: row.disclosed ? "var(--text)" : "var(--faint)" }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="mt-2 text-[12.5px] leading-relaxed text-faint">
        Figure 2. What the flagship warehouse deployment has published, audited against Agility&apos;s own release
        announcing the milestone. {DATA.scorecardSummary.disclosed} of {DATA.scorecardSummary.total} operating
        measures is public. The release names the customer and the cumulative total, and states no rate, no fleet
        size and no cost.
      </figcaption>
    </figure>
  );
}

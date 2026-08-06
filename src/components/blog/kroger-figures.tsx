"use client";

import DATA from "@/data/kroger-figures.json";

// Values come from src/data/kroger-figures.json, produced by
// scripts/build-kroger-figures.py from public filings. Nothing here
// hardcodes a number. Colours are the violet/red pair validated
// CVD-safe in both themes, and every mark also carries a text label so
// identity never depends on colour alone.

const W = 640;
const BAR = "var(--accent)";
const WARN = "var(--violet)";
const WRITEOFF = "var(--red)";
const MILESTONE = "var(--mute)";

export function SiteFunnel() {
  const f = DATA.funnel;
  const max = Math.max(...f.map((d) => d.count));
  const barH = 30;
  const gap = 30;
  const left = 8;
  const plotW = W - left - 210;
  const top = 18;
  const h = f.length * (barH + gap) + top;

  return (
    <figure className="my-1 rounded-md border border-border bg-card p-3.5">
      <svg viewBox={`0 0 ${W} ${h}`} className="h-auto w-full" role="img"
        aria-label="Bar chart of sites identified, opened and remaining">
        {f.map((d, i) => {
          const y = top + i * (barH + gap);
          const w = Math.max((d.count / max) * plotW, 8);
          return (
            <g key={d.stage}>
              <text x={left} y={y - 4} className="fill-dim" fontSize={12.5}>
                {d.stage}
              </text>
              <rect x={left} y={y} width={w} height={barH} rx={4} fill={BAR} />
              <text x={left + w + 10} y={y + barH / 2 + 5} className="fill-text"
                fontSize={15} fontWeight={600}
                style={{ fontVariantNumeric: "tabular-nums" }}>
                {d.count}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-[12.5px] leading-relaxed text-faint">
        Figure 1. What the programme promised against what survived. Twenty candidate sites were identified when the
        partnership launched, eight were built, and five remain after the January 2026 closures and the cancelled
        Charlotte site. That is {DATA.funnelAttrition.identifiedToRemaining}% attrition from plan to today.
      </figcaption>
    </figure>
  );
}

export function WarningTimeline() {
  const t = DATA.timeline;
  const h = 268;
  const m = { top: 20, right: 20, bottom: 40, left: 20 };
  const min = Math.min(...t.map((d) => d.sort));
  const max = Math.max(...t.map((d) => d.sort));
  const sx = (v: number) => m.left + ((v - min) / (max - min)) * (W - m.left - m.right);
  const axisY = h - m.bottom;

  const colorOf = (kind: string) =>
    kind === "warning" ? WARN : kind === "writeoff" ? WRITEOFF : MILESTONE;

  return (
    <figure className="my-1 rounded-md border border-border bg-card p-3.5">
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
        {[
          { c: MILESTONE, l: "programme milestone" },
          { c: WARN, l: "public warning sign" },
          { c: WRITEOFF, l: "write-off and closures" },
        ].map((i) => (
          <span key={i.l} className="flex items-center gap-1.5 text-[12px] text-dim">
            <span className="h-2 w-2 rounded-full" style={{ background: i.c }} />
            {i.l}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${h}`} className="h-auto w-full" role="img"
        aria-label="Timeline of the Kroger automated fulfilment programme, showing warning signs before the write-off">
        <line x1={m.left} x2={W - m.right} y1={axisY} y2={axisY}
          stroke="var(--border-strong)" strokeWidth={1} />
        {[2018, 2020, 2022, 2024, 2026].map((y) => (
          <text key={y} x={sx(y)} y={h - 14} textAnchor="middle" fontSize={11}
            className="fill-faint" style={{ fontVariantNumeric: "tabular-nums" }}>
            {y}
          </text>
        ))}
        {t.map((d, i) => {
          const x = sx(d.sort);
          // stagger labels so they do not collide
          const lane = i % 4;
          const y = m.top + lane * 46;
          const anchor = x > W - 200 ? "end" : "start";
          const dx = anchor === "end" ? -8 : 8;
          return (
            <g key={d.label}>
              <line x1={x} x2={x} y1={y + 6} y2={axisY} stroke="var(--border)" strokeWidth={1} />
              <circle cx={x} cy={axisY} r={5} fill={colorOf(d.kind)}
                stroke="var(--card)" strokeWidth={2} />
              <text x={x + dx} y={y} textAnchor={anchor} fontSize={11.5} className="fill-text">
                {d.date}
              </text>
              <text x={x + dx} y={y + 14} textAnchor={anchor} fontSize={11} className="fill-faint">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-[12.5px] leading-relaxed text-faint">
        Figure 2. The programme showed public warning signs for {DATA.warningLeadYears} years before the write-off.
        New sites were paused in September 2023, three smaller facilities closed in March 2024 for missing internal
        benchmarks, and the site-by-site review came in September 2025. The $2.6 billion charge followed in November.
      </figcaption>
    </figure>
  );
}

"use client";

import DATA from "@/data/architecture-figures.json";

// Values come from src/data/architecture-figures.json, produced by
// scripts/build-architecture-figures.py. Nothing here hardcodes a number.
// Two components per bar (the stack itself, and the service space the
// vendor requires above it) are separated by a 2px surface gap and each
// is directly labelled, so meaning never rests on colour alone.

const W = 640;
const STACK = "var(--violet)";
const SERVICE = "var(--border-strong)";

export function HeightComparison() {
  const h = DATA.heights;
  const chartH = 320;
  const m = { top: 26, right: 14, bottom: 62, left: 40 };
  const maxM = 16;
  const plotH = chartH - m.top - m.bottom;
  const bandW = (W - m.left - m.right) / h.length;
  const barW = Math.min(96, bandW * 0.5);
  const sy = (v: number) => m.top + (1 - v / maxM) * plotH;

  return (
    <figure className="my-1 rounded-md border border-border bg-card p-3.5">
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5 text-[12px] text-dim">
          <span className="h-2 w-2 rounded-full" style={{ background: STACK }} />
          storage stack
        </span>
        <span className="flex items-center gap-1.5 text-[12px] text-dim">
          <span className="h-2 w-2 rounded-full" style={{ background: SERVICE }} />
          operating and service space the vendor requires
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${chartH}`} className="h-auto w-full" role="img"
        aria-label="Maximum usable height of three storage architectures, in metres">
        {[0, 4, 8, 12, 16].map((v) => (
          <g key={v}>
            <line x1={m.left} x2={W - m.right} y1={sy(v)} y2={sy(v)}
              stroke="var(--border)" strokeWidth={1} />
            <text x={m.left - 7} y={sy(v) + 4} textAnchor="end" fontSize={11}
              className="fill-faint" style={{ fontVariantNumeric: "tabular-nums" }}>
              {v}m
            </text>
          </g>
        ))}
        {h.map((d, i) => {
          const cx = m.left + bandW * i + bandW / 2;
          const x = cx - barW / 2;
          const yStack = sy(d.metresStack);
          const hStack = sy(0) - yStack;
          const serviceM = +(d.metresTotal - d.metresStack).toFixed(1);
          const hService = serviceM > 0 ? (serviceM / maxM) * plotH : 0;
          const yService = yStack - hService - (hService > 0 ? 2 : 0);
          return (
            <g key={d.system}>
              {hService > 0 && (
                <rect x={x} y={yService} width={barW} height={hService} rx={3} fill={SERVICE} />
              )}
              <rect x={x} y={yStack} width={barW} height={hStack} rx={3} fill={STACK} />
              <text x={cx} y={(hService > 0 ? yService : yStack) - 8} textAnchor="middle"
                fontSize={13} fontWeight={600} className="fill-text"
                style={{ fontVariantNumeric: "tabular-nums" }}>
                {d.metresTotal}m
                <tspan className="fill-faint" fontWeight={400} fontSize={11.5}>
                  {"  "}({d.feetTotal}ft)
                </tspan>
              </text>
              <text x={cx} y={chartH - 40} textAnchor="middle" fontSize={12} className="fill-dim">
                {d.system.length > 26 ? d.system.slice(0, 25) + "…" : d.system}
              </text>
              <text x={cx} y={chartH - 25} textAnchor="middle" fontSize={11} className="fill-faint">
                {d.config}
              </text>
              {!d.serviceSpacePublished && (
                <text x={cx} y={chartH - 11} textAnchor="middle" fontSize={10.5} className="fill-faint">
                  no service figure published
                </text>
              )}
            </g>
          );
        })}
        <line x1={m.left} x2={W - m.right} y1={sy(0)} y2={sy(0)}
          stroke="var(--border-strong)" strokeWidth={1.5} />
      </svg>
      <figcaption className="mt-2 text-[12.5px] leading-relaxed text-faint">
        Figure 1. Maximum height each architecture can reach, as published by the vendors themselves.
        The tallest reaches {DATA.spread.tallestMetres}m and the shortest{" "}
        {DATA.spread.shortestMetres}m, a difference of {DATA.spread.differenceMetres}m (
        {DATA.spread.differenceFeet}ft) of your building. On top of the grid figures, AutoStore states
        it needs {DATA.clearance.minimumMetres * 1000}mm ({DATA.clearance.minimumFeet}ft) of clearance
        above the grid and recommends {DATA.clearance.recommendedMetres}m (
        {DATA.clearance.recommendedFeet}ft) of clear space for service access. The bars are not
        strictly like for like: AutoStore publishes the operating and service space its system needs,
        and Exotec publishes no equivalent figure, so its bar shows the rack height alone rather than
        a system that needs no service access.
      </figcaption>
    </figure>
  );
}

export function FloorStandards() {
  return (
    <figure className="my-1 rounded-md border border-border bg-card p-3.5">
      <div className="flex flex-col">
        {DATA.floors.map((f, i) => (
          <div key={f.standard}
            className={`py-2.5 ${i < DATA.floors.length - 1 ? "border-b border-divider" : ""}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-[14px] font-medium text-text">{f.traffic}</span>
              <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[12px] font-semibold text-accent">
                {f.standard}
              </span>
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-faint">
              {f.pattern}. {f.note}
            </p>
            <p className="mt-1 text-[12px] italic leading-relaxed text-dim">{f.title}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded border-l-2 border-orange bg-hover px-3 py-2.5"
        style={{ borderLeftColor: "var(--orange)" }}>
        <p className="text-[12.5px] font-semibold text-text">
          The trap, in {DATA.exclusion.standard} {DATA.exclusion.clause}
        </p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-dim">
          &ldquo;{DATA.exclusion.quote}&rdquo;
        </p>
      </div>
      <figcaption className="mt-2.5 text-[12.5px] leading-relaxed text-faint">
        Figure 2. Which floor tolerance standard governs which kind of robot traffic. The widely cited
        one, {DATA.exclusion.standard}, rules itself out for fixed-path vehicles in its own text. Cite
        it in a contract for an AGV or narrow aisle floor and you have written a tolerance the standard
        says cannot be enforced that way.
      </figcaption>
    </figure>
  );
}

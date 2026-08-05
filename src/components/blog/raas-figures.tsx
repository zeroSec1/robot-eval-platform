"use client";

import { useCallback, useRef, useState } from "react";
import MODEL from "@/data/raas-model.json";

// Every value here comes from src/data/raas-model.json, produced by
// scripts/build-raas-model.py. Nothing in this file hardcodes a figure.
// Colors: violet/orange, the pair validated CVD-safe in both themes.

const W = 640;
const BUY = "var(--violet)";
const RENT = "var(--orange)";

const usd = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1000)}k`;

type Tip = { x: number; y: number; lines: string[] } | null;

export function BreakevenChart() {
  const [tip, setTip] = useState<Tip>(null);
  const box = useRef<HTMLDivElement>(null);
  const f = MODEL.figure;
  const h = 320;
  const m = { top: 16, right: 16, bottom: 34, left: 58 };
  const maxY = Math.max(...f.buyCumulative, ...f.rentCumulative);
  const sx = (t: number) => m.left + (t / f.horizonMonths) * (W - m.left - m.right);
  const sy = (v: number) => m.top + (1 - v / maxY) * (h - m.top - m.bottom);
  const path = (arr: number[]) =>
    arr.map((v, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join("");

  const onMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const r = box.current?.getBoundingClientRect();
    const svg = e.currentTarget.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - svg.left) / svg.width) * W;
    const month = Math.round(Math.max(0, Math.min(f.horizonMonths,
      ((px - m.left) / (W - m.left - m.right)) * f.horizonMonths)));
    setTip({
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      lines: [
        `Month ${month}`,
        `Own: ${usd(f.buyCumulative[month])}`,
        `Rent: ${usd(f.rentCumulative[month])}`,
      ],
    });
  }, [f, m.left, m.right]);

  const bx = sx(f.breakevenMonths);

  return (
    <figure className="my-1 rounded-md border border-border bg-card p-3.5">
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
        {[{ c: BUY, l: "Own (purchase + maintenance)" }, { c: RENT, l: "Rent (monthly subscription)" }].map((i) => (
          <span key={i.l} className="flex items-center gap-1.5 text-[12px] text-dim">
            <span className="h-2 w-2 rounded-full" style={{ background: i.c }} />
            {i.l}
          </span>
        ))}
      </div>
      <div ref={box} className="relative">
        <svg viewBox={`0 0 ${W} ${h}`} className="h-auto w-full" role="img"
          aria-label="Cumulative cost of owning versus renting a 10 robot fleet over six years"
          onMouseMove={onMove} onMouseLeave={() => setTip(null)}>
          {[0, 0.25, 0.5, 0.75, 1].map((p) => {
            const v = maxY * p;
            return (
              <g key={p}>
                <line x1={m.left} x2={W - m.right} y1={sy(v)} y2={sy(v)} stroke="var(--border)" strokeWidth={1} />
                <text x={m.left - 6} y={sy(v) + 4} textAnchor="end" fontSize={11} className="fill-faint"
                  style={{ fontVariantNumeric: "tabular-nums" }}>{usd(v)}</text>
              </g>
            );
          })}
          {[0, 12, 24, 36, 48, 60, 72].map((t) => (
            <text key={t} x={sx(t)} y={h - 12} textAnchor="middle" fontSize={11} className="fill-faint"
              style={{ fontVariantNumeric: "tabular-nums" }}>{t / 12}y</text>
          ))}
          <line x1={bx} x2={bx} y1={m.top} y2={h - m.bottom} stroke="var(--border-strong)" strokeWidth={1} />
          <text x={bx + 6} y={m.top + 12} fontSize={12} className="fill-text">
            break-even {f.breakevenMonths} months
          </text>
          <path d={path(f.buyCumulative)} fill="none" stroke={BUY} strokeWidth={2} strokeLinejoin="round" />
          <path d={path(f.rentCumulative)} fill="none" stroke={RENT} strokeWidth={2} strokeLinejoin="round" />
          <circle cx={bx} cy={sy(f.buyCumulative[Math.round(f.breakevenMonths)])} r={5}
            fill={BUY} stroke="var(--card)" strokeWidth={2} />
        </svg>
        {tip && (
          <div className="pointer-events-none absolute z-10 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12px] leading-relaxed text-dim shadow-sm"
            style={{ left: Math.min(tip.x + 12, W - 150), top: Math.max(tip.y - 10, 0) }}>
            {tip.lines.map((l, i) => <div key={i} className={i === 0 ? "text-text" : undefined}>{l}</div>)}
          </div>
        )}
      </div>
      <figcaption className="mt-2 text-[12.5px] leading-relaxed text-faint">
        Figure 1. Ten robots, mid-range inputs: {usd(f.price)} per robot to buy, ${f.rent.toLocaleString()} per robot
        per month to rent. Owning costs more on day one and less after {f.breakevenMonths} months. At six years the
        gap is {usd(f.sixYearBuyUSD)} owned against {usd(f.sixYearRentUSD)} rented. Inputs are industry estimates,
        not vendor quotes.
      </figcaption>
    </figure>
  );
}

export function BreakevenGrid() {
  const grid = MODEL.grid;
  const rentKeys = ["low", "mid", "high", "ceiling"] as const;
  const priceKeys = ["low", "mid", "high"] as const;
  const cell = (v: number | null, beyond: boolean) => {
    if (v === null) return { text: "never", tone: "text-orange" };
    if (beyond) return { text: `${v} mo`, tone: "text-orange" };
    return { text: `${v} mo`, tone: "text-text" };
  };
  return (
    <figure className="my-1 rounded-md border border-border bg-card p-3.5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[13.5px]">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-medium text-text">Purchase price</th>
              {rentKeys.map((k) => (
                <th key={k} className="px-3 py-2 text-left font-medium text-text">
                  Rent ${MODEL.assumptions.monthlyRentPerRobotUSD[k].toLocaleString()}/mo
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, i) => (
              <tr key={i} className="border-b border-divider last:border-b-0">
                <td className="px-3 py-2 font-medium text-dim">
                  ${MODEL.assumptions.unitPriceUSD[priceKeys[i]].toLocaleString()}
                </td>
                {row.map((c, j) => {
                  const v = cell(c.breakevenMonths, c.beyondServiceLife);
                  return (
                    <td key={j} className={`px-3 py-2 ${v.tone}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                      {v.text}
                      {c.beyondServiceLife && (
                        <span className="ml-1.5 text-[11px] text-faint">past robot life</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="mt-2 text-[12.5px] leading-relaxed text-faint">
        Figure 2. Break-even month for a ten-robot fleet across the published price range and the full published rent
        range of $2,000 to $8,000 per robot per month. The answer swings from {MODEL.gridSummary.fastestMonths} months
        to {MODEL.gridSummary.slowestMonths} months. One combination lands past the six-year service life, meaning
        renting wins for the robot&apos;s whole life.
      </figcaption>
    </figure>
  );
}

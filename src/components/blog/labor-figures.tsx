"use client";

import MODEL from "@/data/labor-model.json";

// Values come from src/data/labor-model.json, produced by
// scripts/build-labor-model.py. Nothing here hardcodes a figure.
// Colors: accent for payback inside a year, amber for one to three
// years, orange beyond three. Each cell carries its number as text, so
// identity never rests on colour alone.

function tone(months: number | null, beyond3: boolean) {
  if (months === null) return { text: "never", cls: "text-orange" };
  if (beyond3) return { text: `${months} mo`, cls: "text-orange" };
  if (months <= 12) return { text: `${months} mo`, cls: "text-accent" };
  return { text: `${months} mo`, cls: "text-amber" };
}

export function PaybackGrid() {
  const grid = MODEL.grid;
  return (
    <figure className="my-1 rounded-md border border-border bg-card p-3.5">
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
        {[
          { c: "var(--accent)", l: "inside 12 months" },
          { c: "var(--amber)", l: "one to three years" },
          { c: "var(--orange)", l: "beyond three years" },
        ].map((i) => (
          <span key={i.l} className="flex items-center gap-1.5 text-[12px] text-dim">
            <span className="h-2 w-2 rounded-full" style={{ background: i.c }} />
            {i.l}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] border-collapse text-[13.5px]">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-medium text-text">Shifts per day</th>
              {grid[0].map((c) => (
                <th key={c.displacement} className="px-3 py-2 text-left font-medium text-text">
                  {Math.round(c.displacement * 100)}% of a worker replaced
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, i) => (
              <tr key={i} className="border-b border-divider last:border-b-0">
                <td className="px-3 py-2 font-medium text-dim">{row[0].shifts}</td>
                {row.map((c, j) => {
                  const t = tone(c.paybackMonths, c.beyondThreeYears);
                  return (
                    <td key={j} className={`px-3 py-2 ${t.cls}`}
                      style={{ fontVariantNumeric: "tabular-nums" }}>
                      {t.text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="mt-2 text-[12.5px] leading-relaxed text-faint">
        Figure 1. Months to pay back ten robots at ${MODEL.assumptions.robotPriceUSD.mid.toLocaleString()} each,
        against a frontline wage of ${MODEL.wages.productionNonsupervisoryMay2026} an hour. Payback runs from{" "}
        {MODEL.summary.fastestMonths} to {MODEL.summary.slowestMonths} months depending only on how many shifts you
        run and how much of a worker each robot actually replaces. Wage only, no benefits added, which understates
        the saving.
      </figcaption>
    </figure>
  );
}

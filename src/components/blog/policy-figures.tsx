"use client";

import DATA from "@/data/policy-figures.json";

// Values come from src/data/policy-figures.json, produced by
// scripts/build-policy-figures.py. Nothing here hardcodes a number.
// Single-series bars use one hue (accent), so there is no categorical
// palette to validate; identity is carried by the row label, and each
// row states its own metric because the IIHS figures are not measured
// on one comparable scale.

const W = 640;

export function ClaimsEvidence() {
  const rows = DATA.claimsEvidence;
  const barH = 26;
  const gap = 44;
  const top = 24;
  const left = 8;
  const plotW = W - left - 200;
  const h = rows.length * (barH + gap) + top - gap + barH + 8;

  return (
    <figure className="my-1 rounded-md border border-border bg-card p-3.5">
      <svg
        viewBox={`0 0 ${W} ${h}`}
        className="h-auto w-full"
        role="img"
        aria-label="Crash and claim reductions by driver assistance feature, IIHS and HLDI data"
      >
        {rows.map((r, i) => {
          const y = top + i * (barH + gap);
          const w = (r.reductionPct / 100) * plotW;
          return (
            <g key={r.feature}>
              <text x={left} y={y - 7} className="fill-text" fontSize={12.5} fontWeight={500}>
                {r.feature}
              </text>
              <rect x={left} y={y} width={plotW} height={barH} rx={4} fill="var(--hover)" />
              {w > 0 && (
                <rect x={left} y={y} width={w} height={barH} rx={4} fill="var(--accent)" />
              )}
              <text
                x={left + plotW + 12}
                y={y + barH / 2 + 4.5}
                className="fill-text"
                fontSize={13.5}
                fontWeight={600}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {r.reductionPct > 0 ? `-${r.reductionPct}%` : "no reduction"}
                <tspan className="fill-faint" fontWeight={400} fontSize={11.5}>
                  {"  "}
                  {r.metric}
                </tspan>
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-[12.5px] leading-relaxed text-faint">
        Figure 1. What driver assistance software shows up as in crash and insurance data, per IIHS
        and HLDI [5]. Read each bar against its own metric, printed beside it: the first two are
        rear-end crashes, the third is lane-change crashes, and the last is insurance claim rates,
        where HLDI found no reduction from lane departure warning. IIHS notes the same feature did
        reduce police-reported single-vehicle, sideswipe and head-on crashes; the null is specific
        to claim rates [5]. These are different yardsticks from different studies, gathered on one
        chart only to make a single point: what software a machine runs is visible in loss data.
      </figcaption>
    </figure>
  );
}

export function UpdatePlaybook() {
  return (
    <figure className="my-1 rounded-md border border-border bg-card p-3.5">
      <div className="flex flex-col">
        {DATA.playbook.map((r, i) => (
          <div
            key={r.item}
            className={`py-2 ${i < DATA.playbook.length - 1 ? "border-b border-divider" : ""}`}
          >
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
        Figure 2. The update playbook regulators keep converging on, assembled from UN Regulation
        No. 156 [2], the FDA&apos;s change control plan guidance [12], the EU AI Act [13], and
        OSHA&apos;s technical manual [14]. Items 1 to 5 paraphrase those documents; item 6 is our
        own addition. None of these were written with a warehouse robot vendor in mind. All of
        them describe the same discipline, and it is the discipline an underwriter can be shown.
      </figcaption>
    </figure>
  );
}

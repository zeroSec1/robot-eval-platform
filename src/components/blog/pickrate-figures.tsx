"use client";

import DATA from "@/data/pickrate-figures.json";

// Values come from src/data/pickrate-figures.json, produced by
// scripts/build-pickrate-figures.py. Nothing here hardcodes a number.
// Every row carries its status in words as well as colour, and the
// teal / orange / grey trio passes CVD separation in both themes.

const NONE = "var(--orange)";
const PARTIAL = "var(--accent)";
const NA = "var(--border-strong)";

function dot(conditions: string) {
  if (conditions === "none") return NONE;
  if (conditions === "partial") return PARTIAL;
  return NA;
}

function words(conditions: string) {
  if (conditions === "none") return "no conditions stated";
  if (conditions === "partial") return "some conditions stated";
  return "no number published";
}

export function ClaimsScorecard() {
  const s = DATA.summary;
  return (
    <figure className="my-1 rounded-md border border-border bg-card p-3.5">
      <div className="mb-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {[
          { c: NONE, label: "no conditions stated", n: DATA.summary.noConditions },
          { c: PARTIAL, label: "some conditions stated", n: DATA.summary.partialConditions },
          { c: NA, label: "no number published", n: DATA.summary.noNumberPublished },
        ].filter((k) => k.n > 0).map((k) => (
          <span key={k.label} className="flex items-center gap-1.5 text-[12px] text-dim">
            <span className="h-2 w-2 rounded-full" style={{ background: k.c }} />
            {k.label}
          </span>
        ))}
      </div>
      <div className="flex flex-col">
        {DATA.claims.map((row, i) => (
          <div
            key={`${row.vendor}-${i}`}
            className={`py-2.5 ${i < DATA.claims.length - 1 ? "border-b border-divider" : ""}`}
          >
            <div className="flex items-baseline gap-2">
              <span
                className="mt-1 h-2 w-2 shrink-0 translate-y-0.5 rounded-full"
                style={{ background: dot(row.conditions) }}
              />
              <span className="text-[13.5px] font-medium text-text">{row.claim}</span>
            </div>
            <p className="mt-0.5 pl-4 text-[12.5px] leading-relaxed text-faint">
              {row.vendor} · {row.source} · {words(row.conditions)}
            </p>
          </div>
        ))}
      </div>
      <figcaption className="mt-2.5 text-[12.5px] leading-relaxed text-faint">
        Figure 1. Every performance claim we read on these vendors&apos; own live pages, {s.total} in
        total. {s.withNumbers} carry a number, and {s.fullConditionsStated} of those state how it was
        measured. {s.partialConditions} names the customer site but not the method. The remaining{" "}
        {s.noNumberPublished} publishes adjectives instead of a figure. No two of these can be
        compared, because no two are known to measure the same thing.
      </figcaption>
    </figure>
  );
}

export function RateQuestions() {
  return (
    <figure className="my-1 rounded-md border border-border bg-card p-3.5">
      <div className="flex flex-col">
        {DATA.questions.map((q, i) => (
          <div
            key={q.q}
            className={`py-2 ${i < DATA.questions.length - 1 ? "border-b border-divider" : ""}`}
          >
            <div className="flex items-baseline gap-2.5">
              <span className="flex h-5 w-5 shrink-0 translate-y-0.5 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent">
                {i + 1}
              </span>
              <span className="text-[14px] font-medium text-text">{q.q}</span>
            </div>
            <p className="mt-1 pl-[30px] text-[13px] leading-relaxed text-faint">{q.why}</p>
          </div>
        ))}
      </div>
      <figcaption className="mt-2 text-[12.5px] leading-relaxed text-faint">
        Figure 2. The {DATA.questions.length} questions a rate has to answer before it means
        anything. Send them to a vendor and the reply tells you as much as the number does.
      </figcaption>
    </figure>
  );
}

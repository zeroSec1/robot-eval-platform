"use client";

import DATA from "@/data/showfloor-figures.json";

// Values come from src/data/showfloor-figures.json, produced by
// scripts/build-showfloor-figures.py. Nothing here hardcodes a number or
// a quote. The sheet is designed to survive printing: the print rules
// below drop the page furniture, force black on white, and keep each
// question group from splitting across a page break.

const SAFETY = "var(--accent)";
const PERF = "var(--orange)";

function tagColour(covers: string) {
  return covers === "safety" ? SAFETY : PERF;
}

export function ShowFloorSheet() {
  const s = DATA.show;
  return (
    <figure className="showfloor-sheet my-1 rounded-md border border-border bg-card p-3.5">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .showfloor-sheet, .showfloor-sheet * { visibility: visible; }
          .showfloor-sheet {
            position: absolute; left: 0; top: 0; width: 100%;
            border: none; padding: 0; background: #fff; color: #000;
          }
          .showfloor-sheet .sf-group { break-inside: avoid; page-break-inside: avoid; }
          .showfloor-sheet figcaption { display: none; }
        }
      `}</style>
      <p className="mb-2.5 text-[13px] font-semibold text-text">
        Robot vendor, five minutes: {DATA.counts.questions} questions
      </p>
      {DATA.groups.map((g) => (
        <div key={g} className="sf-group mb-3 last:mb-0">
          <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-faint">{g}</p>
          <div className="flex flex-col">
            {DATA.questions.filter((q) => q.group === g).map((q) => (
              <div key={q.q} className="border-b border-divider py-2 last:border-b-0">
                <div className="flex items-baseline gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 translate-y-0.5 rounded-full bg-accent" />
                  <span className="text-[13.5px] font-medium text-text">{q.q}</span>
                </div>
                <p className="mt-0.5 pl-[14px] text-[12.5px] leading-relaxed text-faint">{q.good}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
      <figcaption className="mt-2.5 text-[12.5px] leading-relaxed text-faint">
        Figure 1. The sheet. {DATA.counts.questions} questions in {DATA.counts.groups} groups, chosen
        because a vendor can answer each one at a booth, and because the delay before the answer tells
        you as much as the answer. Print this page and the sheet prints on its own.
      </figcaption>
    </figure>
  );
}

export function StandardsCard() {
  return (
    <figure className="my-1 rounded-md border border-border bg-card p-3.5">
      <div className="mb-2.5 flex flex-wrap gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5 text-[12px] text-dim">
          <span className="h-2 w-2 rounded-full" style={{ background: SAFETY }} />
          safety standard
        </span>
        <span className="flex items-center gap-1.5 text-[12px] text-dim">
          <span className="h-2 w-2 rounded-full" style={{ background: PERF }} />
          not a safety standard
        </span>
      </div>
      <div className="flex flex-col">
        {DATA.standards.map((st, i) => (
          <div key={st.id}
            className={`py-2.5 ${i < DATA.standards.length - 1 ? "border-b border-divider" : ""}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-[13.5px] font-medium text-text">{st.id}</span>
              <span className="rounded px-1.5 py-0.5 text-[11.5px] font-semibold"
                style={{ background: "var(--hover)", color: tagColour(st.covers) }}>
                {st.covers}
              </span>
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-faint">{st.what}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{st.note}</p>
            {st.quote && (
              <p className="mt-1.5 border-l-2 pl-2 text-[12px] italic leading-relaxed text-dim"
                style={{ borderLeftColor: tagColour(st.covers) }}>
                &ldquo;{st.quote}&rdquo; <span className="not-italic text-faint">{st.source}</span>
              </p>
            )}
          </div>
        ))}
      </div>
      <figcaption className="mt-2.5 text-[12.5px] leading-relaxed text-faint">
        Figure 2. What each standard actually covers, so you name the right one.{" "}
        {DATA.counts.safetyStandards} of these {DATA.counts.standards} are safety standards. ASTM F45
        is not, and its own navigation test method says so in its scope, which is the cleanest way to
        settle the point with a vendor who cites it as a safety credential.
      </figcaption>
    </figure>
  );
}

"use client";

import DATA from "@/data/contract-figures.json";

// Values come from src/data/contract-figures.json, produced by
// scripts/build-contract-figures.py. Nothing here hardcodes a number or
// a quote. Each side of the acceptance hinge is labelled in words as
// well as colour, and every clause carries its own source line.

const BEFORE = "var(--accent)";
const AFTER = "var(--orange)";

export function AcceptanceHinge() {
  return (
    <figure className="my-1 rounded-md border border-border bg-card p-3.5">
      <div className="mb-2.5 flex flex-wrap gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5 text-[12px] text-dim">
          <span className="h-2 w-2 rounded-full" style={{ background: BEFORE }} />
          before acceptance
        </span>
        <span className="flex items-center gap-1.5 text-[12px] text-dim">
          <span className="h-2 w-2 rounded-full" style={{ background: AFTER }} />
          after acceptance
        </span>
      </div>
      <div className="flex flex-col">
        {DATA.hinge.map((row, i) => (
          <div key={row.question}
            className={`py-2.5 ${i < DATA.hinge.length - 1 ? "border-b border-divider" : ""}`}>
            <p className="text-[13.5px] font-medium text-text">{row.question}</p>
            <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
              <p className="border-l-2 pl-2 text-[12.5px] leading-relaxed text-dim"
                style={{ borderLeftColor: BEFORE }}>
                <span className="font-semibold">Before: </span>{row.before}
              </p>
              <p className="border-l-2 pl-2 text-[12.5px] leading-relaxed text-dim"
                style={{ borderLeftColor: AFTER }}>
                <span className="font-semibold">After: </span>{row.after}
              </p>
            </div>
            <p className="mt-1 text-[11.5px] text-faint">{row.cite}</p>
          </div>
        ))}
      </div>
      <figcaption className="mt-2.5 text-[12.5px] leading-relaxed text-faint">
        Figure 1. What moves at the moment of acceptance, under the Uniform Commercial Code&apos;s
        default rules. Acceptance is the hinge the whole pilot turns on: before it, the vendor must
        show the system conforms; after it, you must prove it does not, and you lose even that if you
        stay quiet too long. Every line here begins &ldquo;unless otherwise agreed&rdquo;, so a
        contract can move any of it. Most vendor paper does.
      </figcaption>
    </figure>
  );
}

export function ClauseChecklist() {
  const c = DATA.case;
  return (
    <figure className="my-1 rounded-md border border-border bg-card p-3.5">
      <div className="flex flex-col">
        {DATA.clauses.map((cl, i) => (
          <div key={cl.clause}
            className={`py-2.5 ${i < DATA.clauses.length - 1 ? "border-b border-divider" : ""}`}>
            <div className="flex items-baseline gap-2.5">
              <span className="flex h-5 w-5 shrink-0 translate-y-0.5 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent">
                {i + 1}
              </span>
              <span className="text-[14px] font-medium text-text">{cl.clause}</span>
            </div>
            <p className="mt-1 pl-[30px] text-[13px] leading-relaxed text-faint">{cl.why}</p>
            <p className="mt-1.5 pl-[30px] text-[12.5px] leading-relaxed text-dim">
              &ldquo;{cl.quote}&rdquo;
            </p>
            <p className="mt-1 pl-[30px] text-[11.5px] text-faint">{cl.source}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded px-3 py-2.5"
        style={{ background: "var(--hover)", borderLeft: "2px solid var(--orange)" }}>
        <p className="text-[12.5px] font-semibold text-text">
          What the default looks like: {c.citation}, {c.decided}
        </p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-dim">
          A buyer contracted for a ${c.priceUSD.toLocaleString()} custom machine and paid $
          {c.paidUSD.toLocaleString()} up front. &ldquo;{c.quoteFacts}&rdquo; The vendor&apos;s own
          warranty clause said &ldquo;{c.quoteClause}&rdquo; The court held the limited remedy
          &ldquo;{c.quoteHolding}&rdquo; {c.outcome} {c.note}
        </p>
      </div>
      <figcaption className="mt-2.5 text-[12.5px] leading-relaxed text-faint">
        Figure 2. {DATA.counts.clauses} clauses worth writing into a pilot agreement, each paired with
        language from a real filed contract rather than a template. The box below shows what happens
        when a buyer relies on the vendor&apos;s standard terms instead.
      </figcaption>
    </figure>
  );
}

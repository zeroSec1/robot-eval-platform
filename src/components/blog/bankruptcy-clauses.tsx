// Seven contract clauses, one card each: what to ask for, why it matters,
// and the trap. Citation numbers resolve in the post's sources list.
// Legal claims are cited to statute or to the court record. Nothing here
// is advice, and the limits are stated on the card rather than buried,
// because the card is what a reader acts on.

type Clause = { n: number; title: string; ask: string; why: string; trap: string };

const CLAUSES: Clause[] = [
  {
    n: 1,
    title: "Keep the termination-on-insolvency clause, but know when it stops working",
    ask: "Keep it. It has real value before any filing and outside bankruptcy entirely. Just do not let it stand in for the six below.",
    why: "US law blocks termination based on such a clause only at any time after the bankruptcy case begins [1]. Before a filing, and outside bankruptcy, these clauses generally work under state law.",
    trap: "Two of them. The rule has exceptions [1], and it cuts both ways: if your own company files, the same section stops your vendor terminating on you, subject to those exceptions.",
  },
  {
    n: 2,
    title: "Escrow the source code, and tie release to things you can prove",
    ask: "Named escrow agent, deposits verified on a schedule, and release triggers tied to provable events: missed support response times, a declared end of support, or failure to deliver spare parts.",
    why: "If the vendor stops maintaining the software, the robots keep running only until something breaks.",
    trap: "A release condition worded as 'upon bankruptcy' is itself an insolvency-triggered provision, and a trustee may argue it is unenforceable for that reason [8]. Operational triggers avoid that fight.",
  },
  {
    n: 3,
    title: "Write the software grant as a licence, and hang the escrow off it",
    ask: "An express licence to copyrighted software and trade secrets, with scope and term stated, and an escrow agreement drafted as supplementary to that licence.",
    why: "A US licensee whose licence is rejected can elect to keep its rights [2]. The statute extends that to any agreement supplementary to the licence, and bars the trustee from interfering with your right to obtain the software from another entity, which is what an escrow agent is [2].",
    trap: "The rights freeze. You keep what existed immediately before the filing, with no right to specific performance, so no updates and no support. You must pay all royalties due and you waive setoff [2].",
  },
  {
    n: 4,
    title: "Escrow parts, drawings and the supplier list, not just code",
    ask: "Bill of materials, mechanical drawings, named component suppliers, and a minimum spares holding.",
    why: "Robots are hardware. Source code will not build you a drive motor.",
    trap: "Most escrow products are designed for software companies. Ask specifically whether yours covers physical parts and manufacturing data.",
  },
  {
    n: 5,
    title: "Make your data and configuration portable, and rehearse the export",
    ask: "Export of maps, task configuration and operating history in a documented format, plus one tested export before go-live.",
    why: "Your floor layout and tuning represent months of work. If it lives only in the vendor's cloud, it leaves when they do.",
    trap: "A contractual right to export is worth little if nobody has run it. Rehearse it while the vendor still answers the phone.",
  },
  {
    n: 6,
    title: "Control what happens on a sale or change of control",
    ask: "Notice on change of control, assignment only to a party assuming all support duties, and a stated minimum support period that survives the sale.",
    why: "Vendors exit by being sold, not only by failing. Zebra bought Fetch for $301M in 2021, wound the line down in late 2025, and sold the business for $20M of total consideration in March 2026 [4].",
    trap: "An acquirer buys assets and takes on only the duties it agrees to. Put in writing which support obligations transfer, and for how long.",
  },
  {
    n: 7,
    title: "Understand where you rank, before the failure",
    ask: "Confirm title passes on payment where you buy. Ask counsel about your position where you rent, and about any security you could take.",
    why: "Attabotics filed after Export Development Canada, its single largest creditor, served notice to enforce its security [5]. Secured creditors are paid first.",
    trap: "Unsecured customers rank behind lenders. That position is fixed long before anything goes wrong.",
  },
];

export function BankruptcyClauses() {
  return (
    <div className="my-1 flex flex-col gap-3">
      {CLAUSES.map((c) => (
        <div key={c.n} className="rounded-md border border-border bg-card p-3.5">
          <div className="flex items-baseline gap-2.5">
            <span className="flex h-6 w-6 shrink-0 translate-y-0.5 items-center justify-center rounded-full bg-accent/15 text-[13px] font-semibold text-accent">
              {c.n}
            </span>
            <h3 className="text-[15px] font-semibold text-text">{c.title}</h3>
          </div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-dim">
            <span className="font-medium text-text">Ask for: </span>
            {c.ask}
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-faint">
            <span className="font-medium text-dim">Why: </span>
            {c.why}
          </p>
          <p className="mt-1 border-t border-divider pt-2 text-[13.5px] leading-relaxed text-dim">
            <span className="font-medium text-orange">The trap: </span>
            {c.trap}
          </p>
        </div>
      ))}
    </div>
  );
}

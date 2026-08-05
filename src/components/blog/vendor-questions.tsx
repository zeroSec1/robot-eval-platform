// Ten vendor questions, one card each: the question, why it matters (sourced),
// and what a good answer looks like. Each question maps to a pain buyers
// reported in the Interact Analysis 300-buyer survey or to documented
// deployment failures; citation numbers resolve in the post's sources list.

type Q = { q: string; why: string; good: string };

const QUESTIONS: Q[] = [
  {
    q: "How often will a person need to step in?",
    why: "Too much manual intervention is a top buyer complaint after go-live [1].",
    good: "An interventions-per-100-tasks number, measured at a real site. Not a promise.",
  },
  {
    q: "What is your measured uptime, and what counts as down?",
    why: "Costly downtime is a top post-deployment pain [1].",
    good: "An uptime figure from a named site, with the definition of down in writing.",
  },
  {
    q: "How will I know a robot is about to fail?",
    why: "Buyers report a lack of maintenance prediction [1].",
    good: "Alerts before failure, average time between failures, and a spare-parts plan.",
  },
  {
    q: "What was throughput in month three, not day one?",
    why: "Operation slowdowns during rollout are a documented pain [1].",
    good: "Month-three numbers from the last three deployments, not the best one.",
  },
  {
    q: "What happens when my aisles get crowded?",
    why: "Routing and tasking problems show up during implementation [1]. Fleets slow down as traffic grows [5].",
    good: "Fleet data at your robot density, and how routing behaves under congestion.",
  },
  {
    q: "How long to connect to my WMS, and who does the work?",
    why: "Integration is a leading cause of unmet expectations [3]. At DHL, integrations took up to six to eight weeks before middleware [4].",
    good: "A named connector for your WMS, a week count, and who pays if it runs over.",
  },
  {
    q: "What is the full five-year cost?",
    why: "Buyers rank lowest lifetime cost joint top with ease and speed of integration [1].",
    good: "One sheet: hardware, software fees, integration, maintenance, and upgrades.",
  },
  {
    q: "Can you show the payback math with MY wages and volumes?",
    why: "80% of buyers expected payback within three years in 2024, and 61% now want it inside 12 months [1]. Average warehouse pay is $26.66 an hour and rising [6].",
    good: "A model built on your numbers, editable, not a national average.",
  },
  {
    q: "Can I visit a customer like me?",
    why: "Buyers expect to see the system in action before purchase [1].",
    good: "A reference site in your industry and size, and time with them without the vendor in the room.",
  },
  {
    q: "What happens to my robots if you shut down?",
    why: "Zebra sold off its robot unit in 2026 [7]. Attabotics filed for creditor protection in 2025 [8].",
    good: "Code and spare-parts escrow, plus support clauses that survive an acquisition.",
  },
];

export function VendorQuestions() {
  return (
    <div className="my-1 flex flex-col gap-3">
      {QUESTIONS.map((item, i) => (
        <div key={i} className="rounded-md border border-border bg-card p-3.5">
          <div className="flex items-baseline gap-2.5">
            <span className="flex h-6 w-6 shrink-0 translate-y-0.5 items-center justify-center rounded-full bg-accent/15 text-[13px] font-semibold text-accent">
              {i + 1}
            </span>
            <h3 className="text-[15px] font-semibold text-text">{item.q}</h3>
          </div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-faint">
            <span className="font-medium text-dim">Why: </span>
            {item.why}
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-dim">
            <span className="font-medium text-text">A good answer: </span>
            {item.good}
          </p>
        </div>
      ))}
    </div>
  );
}

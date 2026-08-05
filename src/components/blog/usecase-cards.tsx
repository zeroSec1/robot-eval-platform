// Server-rendered use-case cards for the buyer's guide. One card per
// warehouse job: robot type, cost, a four-step maturity meter, and the one
// thing to demand. Identity never rides on color alone: every meter carries
// its level as text (writing guide rule 7 / dataviz rules).

type Level = 0 | 1 | 2 | 3;

const LEVELS: { label: string; color: string }[] = [
  { label: "Not ready", color: "var(--red)" },
  { label: "Emerging", color: "var(--orange)" },
  { label: "Maturing", color: "var(--amber)" },
  { label: "Proven", color: "var(--accent)" },
];

type UseCase = {
  job: string;
  robot: string;
  cost: string;
  level: Level;
  proof: string;
  demand: string;
};

const USE_CASES: UseCase[] = [
  {
    job: "Pick online orders",
    robot: "Picking robots that work beside people (AMRs, Locus class)",
    cost: "About $2,000-4,000 per robot per month, rented [1]",
    level: 3,
    proof: "One vendor alone has passed 6 billion robot-assisted picks, made by people walking with robots [2].",
    demand: "Pick rates measured on YOUR products, not the demo site's.",
  },
  {
    job: "Store more in less space",
    robot: "Cube storage robots (AutoStore, Exotec class)",
    cost: "Large upfront cost. A ten-year commitment.",
    level: 3,
    proof: "About 1,900 AutoStore systems run in 65 countries [3].",
    demand: "Proof the vendor will still exist in year ten (see vendor health).",
  },
  {
    job: "Move pallets and cases",
    robot: "Transport robots (AMRs and AGVs)",
    cost: "About $30,000-80,000 per unit, or rented [1]",
    level: 3,
    proof: "The real risk is software integration, not the driving [4].",
    demand: "A written plan, with dates, for connecting to your WMS.",
  },
  {
    job: "Lift and stack pallets",
    robot: "Robot forklifts",
    cost: "About $60,000-100,000 per unit [1]",
    level: 2,
    proof: "A published safety standard for these machines exists, ANSI/ITSDF B56.5 [5].",
    demand: "Safety results against the ANSI/ITSDF B56.5 safety standard, in writing [5].",
  },
  {
    job: "Unload trucks, handle mixed boxes",
    robot: "Robot arms and mobile manipulators",
    cost: "Priced per project",
    level: 1,
    proof: "Not brand new: Boston Dynamics Stretch has unloaded trucks at DHL since 2023. Fully autonomous mobile manipulation reached market in 2026 [6].",
    demand: "Pilot terms only. No fleet deals yet.",
  },
  {
    job: "Replace a person outright",
    robot: "Humanoids",
    cost: "Pilot agreements only",
    level: 0,
    proof: "The flagship site passed 100,000 totes in about 17 months, with fleet size never disclosed [7]. Gartner expects fewer than 20 companies to run humanoids in production by 2028 [8].",
    demand: "Nothing in 2026. Watch, do not spend.",
  },
];

function Meter({ level }: { level: Level }) {
  const { label, color } = LEVELS[level];
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-2 w-5 rounded-[2px]"
            style={{ background: i <= level ? color : "var(--hover)" }}
          />
        ))}
      </div>
      <span className="text-[12px] font-medium text-text">{label}</span>
    </div>
  );
}

export function UseCaseCards() {
  return (
    <div className="my-1 grid gap-3 sm:grid-cols-2">
      {USE_CASES.map((u) => (
        <div key={u.job} className="flex flex-col gap-2 rounded-md border border-border bg-card p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-text">{u.job}</h3>
            <Meter level={u.level} />
          </div>
          <p className="text-[13.5px] leading-relaxed text-dim">{u.robot}</p>
          <p className="text-[13.5px] leading-relaxed text-dim">{u.cost}</p>
          <p className="text-[13.5px] leading-relaxed text-faint">{u.proof}</p>
          <p className="mt-auto border-t border-divider pt-2 text-[13.5px] leading-relaxed text-dim">
            <span className="font-medium text-text">Demand: </span>
            {u.demand}
          </p>
        </div>
      ))}
    </div>
  );
}

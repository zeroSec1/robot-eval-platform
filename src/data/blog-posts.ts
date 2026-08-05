// Engineering notes from building this platform. Every number cited in a post
// is pulled from the shipped data files (real-episodes.json et al.) and must
// stay in sync with them; no synthetic figures without an explicit label.

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "code"; code: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "figure"; figure: "outcomes" | "envelope" | "timing" | "usecases" | "questions" | "raas-chart" | "raas-grid" };

export type BlogPost = {
  slug: string;
  title: string;
  date: string; // ISO yyyy-mm-dd
  summary: string;
  tags: string[];
  body: BlogBlock[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "rent-vs-buy-raas-math",
    title: "Rent vs. buy: the real math on Robots-as-a-Service",
    date: "2026-08-05",
    summary:
      "We built the break-even model and published it. Depending where your quote lands inside the published price ranges, buying pays back in 9 months or never pays back at all. Here is the arithmetic, and what it leaves out.",
    tags: ["buyer-guide", "economics", "raas"],
    body: [
      { type: "p", text: "Your vendor offers two prices. Buy the robot for somewhere between $30,000 and $80,000, or rent it for $2,000 to $8,000 a month [1]. Renting looks cheap. Buying looks like a commitment. So which one actually costs less? We built the model, published it, and the honest answer surprised us: the ranges alone cannot tell you. Depending on where your quote lands, buying pays for itself in 9 months or never pays for itself at all." },
      { type: "h2", text: "The model, stated in full" },
      { type: "p", text: "Owning is not just the sticker price. You pay for the robots, you pay once to connect them to your software and network, and you keep paying to maintain them. Renting is one monthly fee that bundles maintenance, support and replacement. So the two cost lines look like this:" },
      { type: "code", code: "Own after t months  = robots x price + integration\n                      + robots x price x maintenance rate x (t/12)\n\nRent after t months = robots x monthly rent x t" },
      { type: "p", text: "Our inputs, all from published industry estimates: $30,000 to $80,000 per robot [1], and maintenance at 15% of purchase price a year, from a cited range of 12% to 20% [2]. One-time integration is $40,000, from a cited range of $15,000 to $100,000 [3]. Service life is six years [10].\n\nThree of those inputs deserve a warning. The published rent range runs from $2,000 all the way to $8,000 per robot per month [1]. Our headline scenario uses $3,000 because third-party per-vendor estimates for picking robots cluster between $2,000 and $4,000, but the grid below carries the full $8,000 ceiling so you can see what it does. The maintenance figure is worse: one source puts annual operating cost at $15,000 on a $40,000 robot [10], which is 37.5% a year, more than double what we model. And service life is contested, with 5 to 7 years cited by one source [10] and 8 to 10 years claimed by others [11]. A shorter assumed life makes owning look worse, so our choice is the conservative one." },
      { type: "h2", text: "What the numbers say" },
      { type: "p", text: "Take ten robots at the middle of every range. Owning costs $590,000 before a single order is picked. Renting starts at zero. But the rent never stops, and the two lines cross at 25.5 months." },
      { type: "figure", figure: "raas-chart" },
      { type: "p", text: "Past that crossing point the gap widens fast. Over the full six years, owning that fleet costs about $1.09 million and renting it costs about $2.16 million. That is roughly double. If the robots really last 8 to 10 years, as some sources claim [11], owning pulls further ahead: $1.25 million against $2.88 million at eight years, and $1.42 million against $3.60 million at ten. Our result lines up with outside analyses finding that buying gives the lowest total cost over four to six years when utilisation stays high [6]." },
      { type: "h2", text: "Does 25 months even clear the bar?" },
      { type: "p", text: "Here is where our own model gets uncomfortable. A 2024 survey of 300 robot buyers found 80% expected payback within three years, so 25.5 months looked comfortable [4]. But the same research firm reported in May 2026 that 61% now expect payback within 12 months [4]. Against that bar, our mid-case purchase fails. It takes roughly twice as long as most buyers now say they will accept." },
      { type: "p", text: "Two honest readings of that. Either buyers have become unrealistic about hardware payback, or the purchase case is weaker than the six-year totals suggest, because money returned sooner is worth more than money returned later, and our model charges nothing for the cost of capital. Whichever you believe, quoting the older and friendlier number would have been the easy choice. It is now out of date, and we would rather say so." },
      { type: "h2", text: "Now the part that matters more than the average" },
      { type: "p", text: "Run the same fleet through every combination of the published ranges, including the $8,000 rent ceiling, and the answer falls apart. Break-even lands anywhere from 4.5 months to 84 months." },
      { type: "figure", figure: "raas-grid" },
      { type: "p", text: "Read the corners. A $30,000 robot against an $8,000 rent pays for itself in under 5 months, so buying is obvious. An $80,000 robot against a $2,000 rent takes 84 months, which is longer than the robot lasts, so renting wins for its entire life. Same market, same published ranges, opposite decisions. This is why a rent-versus-buy answer built on industry averages is worthless. The decision lives inside your specific quote." },
      { type: "h2", text: "Fleet size matters less than people think" },
      { type: "p", text: "A common belief is that big fleets should buy and small fleets should rent. The math only partly agrees. At mid-range prices, break-even is 29.5 months for 3 robots, 25.5 months for 10, and 24.1 months for 50. The curve flattens quickly." },
      { type: "p", text: "The reason is simple once you see it. Fleet size only enters the model through integration, which is a fixed cost. Spread $40,000 across three robots and it hurts. Spread it across fifty and it disappears. Everything else scales with the robot count on both sides, so it cancels out. Small fleets should still lean toward renting, but the reason is flexibility and risk, not a break-even cliff." },
      { type: "h2", text: "What this model leaves out, and why it favours buying" },
      { type: "p", text: "An honest model states its blind spots. Ours ignores five things, and four of them make owning look better than it is." },
      { type: "ul", items: [
        "The cost of capital. $590,000 spent on robots is money not spent elsewhere, and if you borrow it you pay interest. Rent spreads the cost with no upfront hit.",
        "Obsolescence. You own a six-year-old robot at the end. Renters get newer fleets as vendors upgrade.",
        "Vendor failure. Zebra sold off its robot unit in 2026 and Attabotics went bankrupt in 2025 [8]. If you own the hardware you keep the asset but may lose the support. If you rent, the service can simply stop.",
        "Seasonality. If your peak is twice your baseline, owning for the peak means paying for idle robots eleven months a year. Renting lets you scale up and hand them back [5].",
        "Residual value. A working six-year-old robot is worth something. That favours buying, and we left it out.",
      ] },
      { type: "p", text: "There is one more, and it is the largest of all: whether the robots hit the throughput you were promised. Among leaders who have actually deployed warehouse robots, only 34% at VP and Director level say they are fully satisfied [7]. A break-even model assumes the fleet performs. If it underperforms by 30%, every number above is wrong in the same direction, and no financing structure fixes that." },
      { type: "h2", text: "One thing our rental leg gets wrong" },
      { type: "p", text: "Our model treats rent as a flat monthly fee you can walk away from. Real contracts often are not that. AutoStore, for example, prices its subscription per pick rather than per robot, sells the storage grid outright, and sets a minimum term of typically three to five years with a flat monthly minimum [13]. So the lock-in that people treat as ownership's disadvantage exists on the rental side too. Ask for the minimum term and the exit terms in writing before you treat renting as the flexible option." },
      { type: "p", text: "There is also a case for not choosing at all. One industry view argues that subscriptions work best as a temporary tool for demand spikes rather than a wholesale financing substitute, because fees can exceed the cost of a comparable owned system in stable, high-volume operations. The suggested answer is a hybrid: own your baseline capacity, rent your peak [14]." },
      { type: "h2", text: "How to actually decide" },
      { type: "ul", items: [
        "Get a written quote for both options on the same fleet size and the same scope. Ranges cannot decide anything; your two numbers can.",
        "Ask what the rent includes and what a purchase excludes. If rent covers maintenance, support, software and replacement, the purchase price needs those added back before you compare.",
        "Put your own quote through the two formulas above. It is arithmetic, not consulting.",
        "Rent when volumes are seasonal, when the deployment is unproven, or when the vendor is young. Buy when volumes are steady and the workflow is proven. Buyers rank lowest lifetime cost as a top selection factor, though tied with ease and speed of integration rather than ahead of it [4].",
        "Whichever you pick, fix the performance criteria in the contract before the first robot arrives [9]. The financing question is the small one.",
      ] },
      { type: "p", text: "One caveat on all of it. None of the major robot vendors publishes a price list, so every figure here comes from industry estimates rather than audited prices [1]. Some integrators and marketplaces do publish prices for specific models [12], which is a better starting point than any range, including ours. We have published the model and its assumptions so you can substitute your own quote and rerun it. That is the point: the framework is durable, the inputs are yours." },
      { type: "h2", text: "Sources" },
      { type: "ol", items: [
        "Industry price ranges used in the model (all are published estimates; no major vendor publishes a price list): PickTheRobot, Warehouse robot cost in 2026, picktherobot.com/blog/warehouse-robot-cost-2026 ; Robotomated warehouse robot cost guide, robotomated.com/learn/cost/warehouse-robot-cost-guide ; Qviro, Cost of an Autonomous Mobile Robot, qviro.com/blog/cost-of-autonomous-mobile-robots",
        "Maintenance and service life: AutomationInside, Total Cost of Ownership for Robots and AMRs, automationinside.com/article/total-cost-of-ownership-for-robots-and-amrs (annual support 12-20% of system cost for traditional automation, 15-25% for RaaS equivalents; energy, consumables and spares add 3-7%; plan for 5-7 years of service)",
        "Integration and network costs of $15,000-$100,000 and $10,000-$80,000: Robotomated warehouse robot cost guide, robotomated.com/learn/cost/warehouse-robot-cost-guide",
        "Interact Analysis Mobile Robots Buyer Survey, July 2024 (300 buyers): 80% expected return on investment within three years, most between 18 months and three years; lowest lifetime cost and ease/speed of integration were JOINT most important selection factors. Via The Robot Report, therobotreport.com/what-do-customers-expect-from-mobile-robots. Superseded in part: Interact Analysis Voice of Market, May 2026, reports 61% now expect ROI within 12 months (scdigest.com/ontarget/26-05-29.php), and a March 2026 Interact Analysis study of 363 respondents finds complexity, not cost, is the leading barrier to adoption (interactanalysis.com/insight/complexity-not-cost-barrier-to-automation)",
        "RaaS structural arguments (opex instead of capex, seasonal flex, bundled maintenance): Locus Robotics, What Is RaaS, locusrobotics.com/blog/what-is-raas-in-the-warehouse ; Automated Warehouse, Robots as a Service, automatedwarehouseonline.com/robots-as-a-service (note: the first is a vendor selling RaaS)",
        "Purchase-favours-long-horizon analyses: PickTheRobot 2026 cost guide (buy yields the lowest total cost over 4-6 years if utilisation stays high; RaaS monthly fees are usually higher over 3+ years but include support and faster fleet changes)",
        "DHL Supply Chain Insight 2030 survey, Nov 2025 (350 senior leaders): only 34% of VP-level leaders fully satisfied with warehouse robotics deployments, warehouseautomation.ca/news/dhl-report",
        "Vendor exits and failures cited: DC Velocity, Zebra sells off its Fetch AMR division, Apr 2026 ; Global News, Attabotics bankruptcy, Jul 2025",
        "Robot Eval, Ten questions to ask a robot vendor before you sign (this site)",
          "Service life and the conflicting maintenance figure: AutomationInside, Total Cost of Ownership for Robots and AMRs, Oct 2025, automationinside.com/article/total-cost-of-ownership-for-robots-and-amrs (plan for 5-7 years of service; an AMR with a $40k purchase price typically incurs $15k/year in operating costs). The 12-20% and 15-25% maintenance percentages come from Cleverence, Warehouse Automation Costs in 2026, cleverence.com/articles/business-blogs/cost-2026-warehouse-automation-4728",
          "Longer service-life claim (8-10 years with proper maintenance): NovusHi Tech AGV and AMR FAQ guide, novushitech.com/50-agv-amr-faqs-guide",
          "Published per-model prices from an integrator: RobotLAB warehouse robots page, robotlab.com/industries/warehouse (purchase and monthly subscription prices listed per model)",
          "AutoStore, Buying vs RaaS: what is the best strategy for investing in warehouse robotics, autostoresystem.com/insights/buying-vs-raas-whats-the-best-strategy-for-investing-in-warehouse-robotics (pay-per-pick subscription, grid purchased outright, minimum term typically 3-5 years with a flat monthly minimum fee)",
          "Hybrid own-plus-rent argument: Kevin Price, Dematic, via Robotics and Automation News, Apr 23 2026, roboticsandautomationnews.com/2026/04/23/robots-on-demand-why-robotics-as-a-service-on-its-own-wont-solve-warehouse-automation",
      ] },
    ],
  },
  {
    slug: "ten-questions-robot-vendor",
    title: "Ten questions to ask a robot vendor before you sign",
    date: "2026-08-03",
    summary:
      "Each question comes from a problem real buyers reported after deploying robots. Ask them before you sign, get the answers in writing, and watch how the vendor reacts.",
    tags: ["buyer-guide", "warehouse-robotics", "checklist"],
    body: [
      { type: "p", text: "You are about to spend six figures on robots. The buyers who went before you already wrote this list, the hard way. In a survey of 300 robot buyers, the same problems repeat: slowdowns, routing trouble, integration pain, downtime, surprise maintenance, and too much human babysitting [1]. And satisfaction is low: in DHL's survey of 350 supply chain leaders, 44% had deployed robots, but only 34% were fully satisfied [2]. These ten questions turn those documented problems into things a vendor must answer before you sign. Bring the list to every meeting." },
      { type: "h2", text: "The ten questions" },
      { type: "figure", figure: "questions" },
      { type: "h2", text: "How to use this list" },
      { type: "p", text: "A good vendor answers with data from named sites. A great vendor hands you the data before you ask. A vendor who gets annoyed by these questions is also answering them, just not in words. Two more tips. Get every answer in writing, in the contract, not the slide deck. And when the pilot starts, set the pass mark before the first robot runs [9]. A number agreed after the demo will bend against you." },
      { type: "p", text: "Scoring vendor answers against a measured pilot is the service we sell. The list is free, and it works without us." },
      { type: "h2", text: "Sources" },
      { type: "ol", items: [
        "Interact Analysis, Mobile Robots Buyer Survey (300 buyers and users across sizes, sectors, regions). Reported pains during implementation: operation slowdowns, routing and tasking difficulties, software integration. After: lack of maintenance prediction, costly downtime, too much manual intervention. Quote: 'Eighty percent of respondents expected an ROI within three years.' Via interactanalysis.com and The Robot Report, therobotreport.com/what-do-customers-expect-from-mobile-robots",
        "DHL Supply Chain Insight 2030 survey, Nov 2025 (350 senior leaders): 44% had deployed warehouse robotics; only 34% of VP-level leaders fully satisfied: warehouseautomation.ca/news/dhl-report",
        "PwC 2026 Digital Trends in Operations Survey (767 US leaders): 89% say tech investments have not fully delivered; integration complexity a leading cause: pwc.com",
        "DHL Group press release, Mar 17 2026: before the technology-neutral software layer, new automation solutions took up to six to eight weeks to initiate; one integration later completed in three hours: group.dhl.com",
        "RoboticsTomorrow, May 2026, and Robotics & Automation News interview with Plus One Robotics, Jun 2026: fleet performance does not scale linearly; pilots that work with two units can fail with twenty",
        "US Bureau of Labor Statistics, series CES4349300003: $26.66/hour in May 2026 against $25.46 a year earlier, a 4.7% rise. All-employee average; production and nonsupervisory workers averaged $25.92",
        "DC Velocity, Zebra sells off its Fetch AMR division (to Skild AI), Apr 2026",
        "Global News, Attabotics bankruptcy, Jul 2025 (raised over $165M)",
        "Robot Eval, Evaluation #1: when do robot failures actually begin? (this site): fix the pass mark before the trial",
      ] },
    ],
  },
  {
    slug: "which-warehouse-robot-to-buy",
    title: "Which robot should you buy? A use-case guide for warehouse operators",
    date: "2026-08-02",
    summary:
      "Six warehouse jobs, the robot type for each, what it costs, and how proven it is, on one screen of cards. Plus three rules from our own testing to use before you sign.",
    tags: ["buyer-guide", "warehouse-robotics", "advisory"],
    body: [
      { type: "p", text: "Operators ask us one question more than any other: which robot should we buy? Here is our honest answer, in two parts. First, what the market data says about each type of robot. Second, three rules to use before you sign anything, drawn from our own testing. One thing up front, so you can judge the rest: we test robot control software, not commercial robot fleets. We ran a 50-trial evaluation of one control policy, and scored 60 more trials on an open benchmark. The robot types and prices below come from sourced market research, not our lab. When a number is an estimate, we say so." },
      { type: "h2", text: "The short answer, by use case" },
      { type: "p", text: "Find your job below. Each card shows the robot type, what it costs, how proven it is, and the one thing to demand before you buy. Prices are market estimates [1]. No robot vendor publishes a price list." },
      { type: "figure", figure: "usecases" },
      { type: "p", text: "Two more facts to hold while you shop. In a July 2024 survey of 300 robot buyers, 80% expected payback within three years, though the same firm reported in 2026 that 61% now want it inside 12 months [9]. And average warehouse pay hit $26.66 an hour in May 2026, up 4.7% in a year [10]. That wage math is real. It is also in every sales deck. That is why the rules below matter more than which robot you pick." },
      { type: "h2", text: "Three rules before you sign" },
      { type: "p", text: "Rule 1: set the pass mark before the test. In our published evaluation, we fixed the success bar before scoring. The result came out 48.1%. If the bar gets set after everyone watches the robot run, the number bends, and it bends against you. So write pick rates, uptime, and how often a person must step in into the pilot contract first." },
      { type: "p", text: "Rule 2: record every trial, and note when failures start. We timed 27 failed trials. They split two ways: 8 went wrong mid-task, and 19 looked fine but ran out of time. Each needs a different fix. One is a control problem. The other is a speed problem. A one-number vendor report cannot tell you which you have. The full study is in Evaluation #1 on this site." },
      { type: "p", text: "Rule 3: ask for error rates, including the dashboard's own. Our own alarm system flags 40% of good trials as bad, and we published that number on purpose. A dashboard that catches every problem and quotes no false-alarm rate is marketing, not monitoring." },
      { type: "h2", text: "Check the vendor's health" },
      { type: "p", text: "Robot companies are failing while demand grows. In the last 14 months:" },
      { type: "ul", items: [
        "Zebra wound down and then sold its $290M Fetch robot unit, completing in April 2026 [11]",
        "Attabotics went bankrupt in June 2025, after raising over $165M [12]",
        "One tracker counted about $16M across two disclosed AMR rounds in early 2026, even as robotics venture funding overall hit a record [13]",
        "Geek+ became the field's first public company [14]",
      ] },
      { type: "p", text: "So protect yourself in the contract:" },
      { type: "ul", items: [
        "Ask for code and spare-parts escrow, so you keep access if the vendor folds",
        "Add exit and continued-support clauses",
        "Prefer robot types where several vendors can replace each other",
        "Read the vendor's balance sheet as closely as you watch the demo",
      ] },
      { type: "h2", text: "What this guide is not" },
      { type: "p", text: "It is not a vendor ranking. The real answer depends on your building, your products, and your software. It comes from a test in your own warehouse, with the pass mark set first. Running that test is the service we sell. The three rules are free, and they work without us." },
      { type: "p", text: "One last fact from the deployment data: software integration and change management kill more robot projects than robot performance does [4][15]. One industry review of DHL's 2025 survey put it plainly: robots 'rarely meet vendor-quoted throughput in real conditions' [15]. Buy the robot your team and systems can absorb, not the one with the best demo reel." },
      { type: "h2", text: "Sources" },
      { type: "ol", items: [
        "Industry pricing estimates, labeled as such (no vendor publishes primary price lists): PickTheRobot 2026 cost guide; Robotomated budget guide; RaaS per-robot figures via industry aggregators.",
        "The Robot Report, Locus Robotics surpasses 6 billion robot-assisted picks, Oct 2025 (picks made by people working alongside robots, not autonomous picks)",
        "AutoStore Q4 2025 results, Feb 12 2026: about 1,900 systems in 65 countries; FY2025 revenue $538.6M and order backlog $557.0M (the two are different figures): news.cision.com/autostore-as",
        "PwC 2026 Digital Trends in Operations Survey (767 US leaders; 89% say tech investments have not fully delivered; integration complexity a leading cause): pwc.com",
        "ASTM Committee F45 publishes performance test methods for driverless industrial vehicles (NIST chairs it): nist.gov. The safety standard is ANSI/ITSDF B56.5 (2024), with ISO 3691-4 internationally",
        "Boston Dynamics Stretch first commercial deployment at DHL, Feb 2023 (dhl.com press archive); Locus Array launched Apr 10 2026 (Business Wire); Locus acquired Nexera Robotics May 19 2026 (separate event)",
        "Robotics & Automation News, Digit passes 100,000 totes at GXO, Nov 24 2025. Fleet size has never been disclosed by GXO or Agility; the agreement dates to June 2024, so the milestone is about 17 months in",
        "Gartner press release, Jan 21 2026: through 2028, fewer than 20 companies will go live in production for supply chain and manufacturing use cases (this counts adopting companies, not vendors): gartner.com/en/newsroom",
        "Interact Analysis Mobile Robots Buyer Survey, published Jul 27, 2024 (300 buyers), therobotreport.com/what-do-customers-expect-from-mobile-robots. Superseded in part by Interact Analysis Voice of Market, May 2026: 61% now expect payback within 12 months",
        "US Bureau of Labor Statistics, series CES4349300003 (NAICS 493 average hourly earnings, all employees): $25.46 in May 2025 and $26.66 in May 2026, a 4.7% rise. Note this is the all-employee average; production and nonsupervisory workers averaged $25.92",
        "DC Velocity, Zebra sells off its Fetch AMR division (to Skild AI), Apr 2026",
        "Global News, Attabotics bankruptcy, Jul 2025",
        "New Market Pitch AMR funding tracker (aggregator, treat as directional), 2026",
        "TMTPost, Geek+ lists on HKEX main board, Jul 2025",
        "DHL Supply Chain Insight 2030 survey, Nov 2025: only 34% of VP-level leaders fully satisfied with warehouse robotics deployments: warehouseautomation.ca/news/dhl-report",
      ] },
    ],
  },
  {
    slug: "evaluation-1-failure-timing",
    title: "Evaluation #1: when do robot failures actually begin?",
    date: "2026-08-02",
    summary:
      "52 open PushT trials, a success envelope learned from the trials that worked, and a finding: two-thirds of failures were not doing anything visibly wrong. They ran out of time. Every number regenerates from a script.",
    tags: ["evaluation", "pusht", "anomaly-detection"],
    body: [
      { type: "p", text: "Every robot pilot report leads with a success rate. Say a vendor tells you the robot picked at 94%. You still do not know the two things that decide your economics. What do the failures look like? And when do they begin? This is our first public evaluation. It answers both, on open data, with every number checkable." },
      { type: "h2", text: "The data" },
      { type: "p", text: "We scored the LeRobot PushT dataset: 52 recorded trials of a simple pushing task, where a robot pushes a T-shaped block onto a T-shaped target. We fixed our pass mark before scoring: a peak coverage reward of at least 0.9. By that bar, 25 of 52 trials pass, a 48.1% rate. The median passing trial runs 13.6 s. The median failing trial runs 10.5 s. As a contrast set, real-robot PushT recordings from Open X-Embodiment score 8 of 8 successes. The platform's other 248 of 308 episodes have no automatic pass mark, so they stay unscored. We would rather publish that than invent a number." },
      { type: "figure", figure: "outcomes" },
      { type: "h2", text: "Correction: our bar is looser than the benchmark's" },
      { type: "p", text: "An outside fact-check of this article caught a real problem, and we are fixing it in public rather than quietly. Our 0.9 bar is not the benchmark's bar. The PushT environment ends an episode successfully at coverage above 0.95, and its reward is coverage divided by 0.95, so a reward of 0.9 is roughly 0.855 coverage. Ours is the looser test." },
      { type: "p", text: "It gets starker. The dataset ships its own success flag, and we checked it: it is false for all 206 episodes in the source data. The highest reward any episode reaches is 0.949. Under the benchmark's own criterion, zero of these trials succeed. Our 48.1% exists only because we chose a lower bar. Across the full 206 episodes our bar passes 92, or 44.7%, so the 52-trial subset behaves normally. The arithmetic was never the issue. The label was." },
      { type: "p", text: "What still holds: everything below compares trials that did better against trials that did worse on the same signal, and that comparison does not depend on where the bar sits. What does not hold is calling the better group successes. Read them as the stronger half of a set of human demonstrations, none of which clear the benchmark. We are leaving the number visible rather than restating it, because our own buyer's guide warns that a bar set to flatter the result bends against you, and this is what that looks like when it applies to us." },
      { type: "h2", text: "The method: learn success, then flag the first real deviation" },
      { type: "p", text: "The recipe is standard in execution monitoring, in the spirit of Park et al., ICRA 2016. Build the reference from successful runs only. At each 0.1 s step, the envelope is the 10th percentile of coverage across the 25 successful trials. A failed trial gets flagged at the first moment it stays below that envelope for 0.5 s. One rule, two settings, both fixed before we looked at any failure." },
      { type: "figure", figure: "envelope" },
      { type: "p", text: "Some failed trials never leave the envelope at all. For those, the marker falls back to the coverage peak, the point after which progress never improved. That fallback turned out to be the finding." },
      { type: "h2", text: "Finding: failures come in two shapes" },
      { type: "p", text: "Only 8 of the 27 failures went wrong mid-task. Their median flag lands at 8.0 s, about halfway through the run, or 52.2% of episode time. The range is 5.0 to 11.9 s. The other 19 failures looked normal the whole way. They were flagged at their coverage peak, at a median of 97.8% of episode time. In plain terms: two-thirds of these failures were not doing anything visibly wrong. They ran out of time." },
      { type: "figure", figure: "timing" },
      { type: "p", text: "The two shapes need different fixes. Going wrong mid-task is a control problem, and an operator watching a live dashboard could act on it. Running out of time is something else. It points at time budgets, thresholds and task design. A single success rate hides that split completely." },
      { type: "h2", text: "We measured our own detector too" },
      { type: "p", text: "Run the same rule on the successful trials. It fires on 10 of the 25 at some point. That is a 40% false-alarm rate at this threshold, because successful runs also dip below the line and recover. We publish that number on purpose. Every monitoring rule trades sensitivity against false alarms. An evaluation that hides its own error rate is marketing." },
      { type: "h2", text: "Check our work" },
      { type: "p", text: "A script in the repository regenerates every number and curve from the source data. It cross-checks against the telemetry we ship, and all 27 failure markers reproduce exactly, with zero mismatches. The episodes are browsable in the Episodes view, with video. The dataset is public and the method is stated, so you can disagree with us using the same data." },
      { type: "h2", text: "Limitations, stated plainly" },
      { type: "ul", items: [
        "This is a simulated task with two degrees of freedom. The trials are human demonstrations, not autonomous policy runs. The method carries over. The numbers do not.",
        "One scored dataset of 52 trials, plus an 8-trial real-robot set. Small n, and we say so.",
        "The detector watches one signal. Watching several would catch failures this one misses.",
        "We fixed the threshold in advance rather than tuning it. The false-alarm rate reflects that choice.",
      ] },
      { type: "p", text: "This is the shape of evaluation we think buyers deserve on their own pilots. Pass mark fixed first. Every trial instrumented. Failure timing analysed, not averaged away. Error rates disclosed. Everything reproducible from raw data. If the reports on your desk do not look like this, it is worth asking why." },
    ],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function formatPostDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

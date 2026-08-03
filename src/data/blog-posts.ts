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
  | { type: "figure"; figure: "outcomes" | "envelope" | "timing" };

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
    slug: "which-warehouse-robot-to-buy",
    title: "Which robot should you buy? A use-case guide for warehouse operators",
    date: "2026-08-02",
    summary:
      "Category-by-use-case guidance with sourced economics, vendor-viability warnings, and the three pilot rules our own policy testing taught us. Where a number is an estimate, we say so.",
    tags: ["buyer-guide", "warehouse-robotics", "advisory"],
    body: [
      {
        type: "p",
        text: "The most common question we get from operators is also the simplest: which robot should we buy? Here is our honest version of the answer, in two parts. First, what the market evidence says about which robot category fits which use case. Second, what our own testing says you should demand before signing anything. One thing up front about our basis: what we have tested ourselves is manipulation policies, including a 50-run ACT policy evaluation on precision cable insertion and 60 scored trials across simulated and real PushT. We have not operated a commercial AMR fleet, and nobody can honestly rank Locus against Geek+ from a desk. So the category guidance below is sourced market research, the evaluation discipline is ours, and where a number is an industry estimate rather than audited data, we say so.",
      },
      { type: "h2", text: "The short answer, by use case" },
      {
        type: "table",
        headers: ["Use case", "Robot category", "Typical economics", "Maturity verdict"],
        rows: [
          ["Each-picking for e-commerce, zone picking",
            "Collaborative picking AMRs (Locus class)",
            "RaaS, roughly $2,000-4,000 per robot per month [1]",
            "The most proven category: one vendor alone has passed 6 billion assisted picks [2]. Demand pick-rate numbers under YOUR SKU mix, not the reference site's."],
          ["High-density storage and retrieval",
            "Cube ASRS, goods-to-person (AutoStore, Exotec class)",
            "Heavy capex, multi-year commitment",
            "Proven at scale: ~1,850 AutoStore systems across 63 countries [3]. Because you are locked in for a decade, vendor viability (below) is part of the spec."],
          ["Pallet and case transport",
            "Transport AMRs / AGVs",
            "$30,000-80,000 per unit, or RaaS [1]",
            "Mature. The deployment risk is WMS integration and process change, not the driving [4]."],
          ["Autonomous forklifts",
            "Autonomous lift trucks",
            "$60,000-100,000 per unit [1]",
            "Maturing. Safety is the gating question: insist on test evidence against ASTM F45 / NIST-style performance standards [5]."],
          ["Trailer unloading, mixed-case handling",
            "Fixed arms and emerging mobile manipulation",
            "Project-priced",
            "Emerging: the first mainstream mobile-manipulation platforms only launched in 2026 [6]. Pilot-grade, not fleet-grade."],
          ["Everything a human does",
            "Humanoids",
            "Pilot agreements only",
            "Do not buy in 2026. The flagship warehouse humanoid deployment was running two units in one building after a year [7], and Gartner predicts fewer than 20 companies will scale humanoids to production by 2028 [8]. Watch, do not spend."],
        ],
      },
      {
        type: "p",
        text: "How to read that table: 80% of robot buyers expect ROI within three years [9], and vendor payback claims of 18-36 months are estimates from vendor-favorable sources [1]. The arithmetic pushing you here is real: warehouse wages hit $26.66 per hour in May 2026, up 4.6% in a year [10]. But that same arithmetic is in every vendor's deck, which is why the rules below matter more than the category choice.",
      },
      { type: "h2", text: "The three rules our policy testing taught us" },
      {
        type: "p",
        text: "Rule 1: fix the success criterion before the trial. In our published PushT evaluation, the criterion (coverage of at least 0.9) was set before scoring, and the answer came out 48.1%. If the criterion gets defined after everyone has watched the robot run, the number is negotiable, and it will be negotiated against you. For a pilot, that means pick-rate, uptime, and intervention definitions written into the contract before the first robot arrives.",
      },
      {
        type: "p",
        text: "Rule 2: instrument every trial and analyze failure timing, not just the failure rate. When we timed failure onset across 27 failed trials, they split into two shapes: 8 diverged from normal behavior mid-task, and 19 tracked a success-shaped trajectory and simply ran out of time. Those need entirely different fixes, one is a control problem, the other is a throughput and time-budget problem. A vendor pilot report gives you one aggregate number; an instrumented pilot tells you which fix you are buying next. The full analysis is in Evaluation #1 on this site.",
      },
      {
        type: "p",
        text: "Rule 3: demand disclosed error rates, including from the monitoring itself. Our own anomaly detector false-alarms on 40% of successful trials at its current threshold, and we published that number. Any monitoring dashboard that claims to catch every problem and quotes no false-alarm rate is describing marketing, not monitoring.",
      },
      { type: "h2", text: "Vendor viability is part of the spec" },
      {
        type: "p",
        text: "In the last 14 months: Zebra exited its $290M Fetch AMR business, selling it off in April 2026 [11]; Attabotics went bankrupt in June 2025 after raising over $165M [12]; venture funding for AMR startups collapsed to roughly $16M across two deals in early 2026 per one industry tracker [13]; and at the same time Geek+ became the segment's first public company [14]. The category is consolidating while demand grows. Practical consequences for a buyer: require source-code and spare-parts escrow, negotiate exit and continued-support clauses, prefer categories where several vendors are interchangeable, and weight the vendor's balance sheet as heavily as its demo.",
      },
      { type: "h2", text: "What this guide is not" },
      {
        type: "p",
        text: "It is not a vendor ranking. A real answer to 'which robot' depends on your building, your SKU mix, your WMS, and your labor reality, and it comes from an instrumented pilot under criteria fixed in advance, in your facility. That discipline is what we sell, but the three rules above are free, and they work even if you run the pilot yourself. And remember what the deployment data actually says: integration and change management kill more deployments than robot performance does [4][15]. Buy the robot your WMS and your people can absorb, not the one with the best demo reel.",
      },
      { type: "h2", text: "Sources" },
      {
        type: "ol",
        items: [
          "Industry pricing estimates, labeled as such (no vendor publishes primary price lists): PickTheRobot 2026 cost guide; Robotomated budget guide; RaaS per-robot figures via industry aggregators.",
          "Robotics 24/7, Locus Robotics passes 6 billion picks, Oct 2025: robotics247.com",
          "AutoStore Q4 2025 report: ~1,850 systems in 63 countries, FY2025 revenue $557M: autostoresystem.com",
          "PwC 2026 Digital Trends in Operations Survey (767 US leaders; 89% say tech investments have not fully delivered; integration complexity a leading cause): pwc.com",
          "NIST / ASTM Committee F45, A-UGV performance standards: nist.gov",
          "DC Velocity / Business Wire, Locus Robotics acquires Nexera and launches the Locus Array mobile-manipulation platform, May 2026",
          "Robotics & Automation News, Digit passes 100,000 totes at GXO with two active units, Nov 24, 2025",
          "Gartner press release, Jan 21, 2026: fewer than 20 companies will scale humanoid robots to production by 2028: gartner.com/en/newsroom",
          "Interact Analysis survey of 300 mobile-robot buyers, Automated Warehouse, Jul 30, 2026",
          "US Bureau of Labor Statistics, CES wage series for NAICS 493 (Warehousing and Storage), May 2026, via the BLS public API",
          "DC Velocity, Zebra sells off its Fetch AMR division (to Skild AI), Apr 2026",
          "Global News, Attabotics bankruptcy, Jul 2025",
          "New Market Pitch AMR funding tracker (aggregator, treat as directional), 2026",
          "TMTPost, Geek+ lists on HKEX main board, Jul 2025",
          "DHL Supply Chain Insight 2030 survey, Nov 2025: only 34% of VP-level leaders fully satisfied with warehouse robotics deployments: warehouseautomation.ca/news/dhl-report",
        ],
      },
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
      {
        type: "p",
        text: "Every robot pilot report leads with a success rate. If you operate a warehouse and a vendor tells you the robot picked at 94%, you still know nothing about the two questions that decide your economics: what do the failures look like, and when do they begin? This is our first public evaluation, built to show what an instrumented, independently checkable answer to those questions looks like, on data anyone can download.",
      },
      { type: "h2", text: "The data" },
      {
        type: "p",
        text: "We scored the LeRobot PushT community dataset: 52 recorded trials of a two-degree-of-freedom pushing task (push a T-shaped block onto a T-shaped target), with the success criterion fixed before scoring: maximum coverage reward of at least 0.9. Result: 25 of 52 trials succeed, a 48.1% success rate. The median successful trial runs 13.6 s; the median failed trial 10.5 s. As a contrast set, the real-robot PushT recordings from Open X-Embodiment (a UR5 arm) score 8 of 8 successes. The platform's other 248 of 308 episodes carry no automatic success signal, so they stay unscored. We would rather publish that number than invent one.",
      },
      { type: "figure", figure: "outcomes" },
      { type: "h2", text: "The method: learn success, flag the first sustained deviation" },
      {
        type: "p",
        text: "The detection follows the classic execution-monitoring recipe (in the spirit of Park et al., ICRA 2016): build the reference model from successful executions only. At each 0.1 s timestep, the envelope is the 10th percentile of coverage across the 25 successful trials. A failed trial's anomaly is the first moment its coverage stays below that envelope for 0.5 s. One rule, two parameters, both chosen before looking at the failures.",
      },
      { type: "figure", figure: "envelope" },
      {
        type: "p",
        text: "Some failed trials never leave the envelope at all. For those, the marker falls back to the trial's coverage peak: the moment after which its progress never improved. That fallback turned out to be the finding.",
      },
      { type: "h2", text: "Finding: failures come in two shapes" },
      {
        type: "p",
        text: "Only 8 of the 27 failures diverge from the success envelope mid-episode. Their median flag lands at 8.0 s, about halfway through the trial (52.2% of episode time; the range is 5.0 to 11.9 s). The other 19 failures tracked the success envelope the whole way and were flagged at their coverage peak, at a median of 97.8% of episode time. In plain terms: two-thirds of these failures were not doing anything visibly wrong. They were on a success-shaped trajectory and ran out the clock short of the threshold.",
      },
      { type: "figure", figure: "timing" },
      {
        type: "p",
        text: "The distinction matters because the two shapes call for different fixes. Mid-episode divergence points at control and policy problems, the kind worth interrupting early, and an operator watching a live dashboard could act on it. Ran-out-of-time failures point somewhere else entirely: at time budgets, thresholds, and task definitions. An aggregate 48% success rate hides that structure completely; the timing analysis is what surfaces it.",
      },
      { type: "h2", text: "We also measured our own detector" },
      {
        type: "p",
        text: "Run the same envelope rule on the successful trials and it fires on 10 of the 25 at some point: a 40% false-alarm rate at this threshold, because successful trials also wander below the 10th-percentile line and recover. We publish that number deliberately. Every monitoring rule trades sensitivity against false alarms, and an evaluation that does not report its own error rate is marketing with axes.",
      },
      { type: "h2", text: "Verify everything" },
      {
        type: "p",
        text: "Every number and every curve in this post is generated by a script in the repository (scripts/build-eval-report.py) from the source parquet data, and cross-checked against the telemetry the platform ships: all 27 failure markers reproduce exactly, zero mismatches. The episodes themselves, with video and the clickable action timeline, are browsable in the Episodes view. The dataset is public, the method is stated, and disagreement is checkable. That is the standard we think evaluation should meet.",
      },
      { type: "h2", text: "Limitations, stated plainly" },
      {
        type: "ul",
        items: [
          "This is a simulated 2-DoF task, and the trials are human teleoperation demonstrations, not autonomous policy rollouts. The method transfers to policy rollouts unchanged; the numbers do not.",
          "One scored dataset of 52 trials plus an 8-trial real-robot contrast set. Small n, reported as such.",
          "The detector watches a single signal (coverage). Multi-signal monitoring would catch failure modes this cannot.",
          "Threshold and persistence were fixed a priori, not tuned, which the 40% false-alarm rate on successes reflects.",
        ],
      },
      {
        type: "p",
        text: "This is the shape of evaluation we believe robot buyers deserve on their own pilots: the success criterion fixed before the trial, every trial instrumented, failure timing analyzed instead of averaged away, detector error rates disclosed, and everything reproducible from raw data. If your operation is evaluating warehouse robots and the reports on your desk do not look like this, it is worth asking why.",
      },
    ],
  },
  {
    slug: "real-anomaly-markers",
    title: "No fake markers: anomaly detection from real PushT telemetry",
    date: "2026-07-31",
    summary:
      "The timeline used to show invented anomaly flags. Now failed episodes are scored against a percentile envelope built from successful trials, computed from per-frame parquet data.",
    tags: ["telemetry", "anomaly-detection"],
    body: [
      {
        type: "p",
        text: "The episode timeline shows a marker where a failed trial started going wrong. Early in development that marker was fabricated: a plausible-looking position picked so the UI had something to render. That violates the project rule that every number is real or labeled synthetic, so it had to go.",
      },
      { type: "h2", text: "Getting real signals out of LeRobot" },
      {
        type: "p",
        text: "LeRobot's PushT dataset stores per-frame series in parquet. A small extraction script pulls three of them, sampled at 10 Hz, into a JSON file the app ships: coverage reward (how much of the target zone the block covers), agent speed, and tracking error. That gives 52 episodes with genuine time series instead of decoration.",
      },
      { type: "h2", text: "The detection rule" },
      {
        type: "p",
        text: "With real series available, the marker becomes a real detection. Successful trials define an envelope: at each timestep, take the 10th percentile of coverage across all successful episodes. A failed episode's anomaly is the first sustained drop below that envelope. This is the classic execution-monitoring formulation, in the spirit of Park et al. (ICRA 2016): model nominal behavior from successes, flag deviations beyond a threshold.",
      },
      {
        type: "code",
        code: "envelope(t) = P10( coverage_s(t) for s in successful episodes )\nanomaly     = first t where coverage(t) < envelope(t),\n              sustained for k consecutive frames",
      },
      {
        type: "p",
        text: "A test suite audits every number the UI renders against the raw data files, and a separate suite checks the anomaly pass itself. Both run against a local production build before any deploy. The marker looks almost the same as the fabricated one did; the difference is that clicking it now takes you to the actual moment the policy lost the block.",
      },
    ],
  },
  {
    slug: "av1-webkit-black-video",
    title: "The case of the silent black video: AV1 and WebKit",
    date: "2026-07-30",
    summary:
      "Every episode video rendered black in Safari and DuckDuckGo while Chrome played them fine. No error anywhere. The culprit was the codec inside the MP4, not the MP4.",
    tags: ["video", "webkit", "debugging"],
    body: [
      {
        type: "p",
        text: "Symptom: every episode video was a black rectangle in Safari and DuckDuckGo, while Chrome played the identical URLs without complaint. Nothing in the console, no broken-media icon, the video element mounted and buffered normally. It just never painted a frame.",
      },
      { type: "h2", text: "The cause" },
      {
        type: "p",
        text: "The source MP4s come from LeRobot datasets on Hugging Face, and those files are encoded with AV1. WebKit only decodes AV1 on hardware with a dedicated decoder, which most Macs and iPhones do not have. A file extension is not a codec: an MP4 container can hold video that a given browser simply cannot decode, and the failure mode is silence, not an error.",
      },
      { type: "h2", text: "The fix" },
      {
        type: "ul",
        items: [
          "A transcode script produces per-episode H.264 clips, since H.264 decodes everywhere. The clips live in public/videos-h264, roughly 200MB, gitignored but shipped with CLI deploys.",
          "Each episode's JSON gains a clipUrl pointing at its local clip.",
          "The video component tries sources in order: local H.264 clip, then a locally mirrored copy of the source, then the remote original, and shows a visible error message if all three fail. Silent black frames are banned.",
        ],
      },
      {
        type: "p",
        text: "The lesson generalizes: treat codecs as a browser support matrix, and test media playback in WebKit specifically. Chrome working proves very little about Safari.",
      },
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

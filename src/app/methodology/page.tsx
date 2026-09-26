import { Card, CardHeader } from "@/components/ui/card";

export default function MethodologyPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-[22px] font-semibold text-text">How the risk scores work</h1>
        <p className="mt-1 text-[15px] text-faint">
          Conformal duration-anomaly scoring, real policy failure rates, and how we verified both before
          shipping them.
        </p>
      </div>

      <Card>
        <CardHeader title="What it actually does" />
        <div className="flex flex-col gap-3 px-3.5 py-3 text-[15px] text-dim">
          <p>
            Every episode&apos;s <strong className="text-text">Duration anomaly</strong>{" "}card uses split
            conformal prediction to score how unusual that episode&apos;s duration is compared to successful
            runs of the same task, with a real distribution-free coverage guarantee.
          </p>
          <p>
            Concretely: it computes a p-value answering &quot;if this episode came from the same distribution
            as our successful calibration runs, how surprising would a duration this extreme be?&quot; A low
            p-value means the duration looks statistically unlike the successful runs we&apos;ve seen: worth
            a human&apos;s attention, not proof of anything on its own.
          </p>
          <p>
            The same scoring rolls up per policy version too: instead of asking whether one past recording
            looked odd, it asks how often a given deployed policy&apos;s logged runs have looked unusual so
            far, compared to other runs of the exact same task. It is still a rollup of the same after-the-fact
            duration scores, not a new kind of prediction.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Policy failure rate" />
        <div className="flex flex-col gap-3 px-3.5 py-3 text-[15px] text-dim">
          <p>
            The <strong className="text-text">Policy failure rate</strong> table on the Overview page is a
            different kind of number: a named policy checkpoint&apos;s own real, measured pass/fail record,
            pooled across every task it has been independently evaluated on, with a Wilson confidence interval
            (Wilson, 1927) on the true rate. It comes from RoboArena&apos;s public evaluation dump (MIT-licensed,
            arXiv:2506.18123): real autonomous rollouts of named VLA policy checkpoints on a real DROID/Franka
            robot, each scored pass or fail by a human evaluator, not from our own fleet.
          </p>
          <p>
            This is the one number on this platform that is genuinely forward-looking, and it is forward-looking
            only in a narrow, specific sense: an unmodified policy checkpoint&apos;s behavior on similar tasks is
            reasonably estimated by its own prior track record, since the same weights produce the same kind of
            behavior run to run. It describes that exact checkpoint, evaluated by a third party, on their tasks
            and their robot. It is not a prediction about any specific customer&apos;s hardware, environment, or
            deployment, and a checkpoint with a good measured rate elsewhere can still fail differently on a
            materially different setup.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="What it does not do" />
        <div className="flex flex-col gap-3 px-3.5 py-3 text-[15px] text-dim">
          <p>
            Neither the per-episode duration score nor the per-task policy rollup predicts robot failure before
            it happens. Both are purely retrospective: they describe how past logged runs looked, not how a
            policy will perform on a run that hasn&apos;t happened yet. Real intervention/collision telemetry is
            not populated on any dataset we have, which rules out several other honest signals we&apos;d
            otherwise build.
          </p>
          <p>
            The policy failure rate above is the exception, and only in the narrow sense described there: it
            is still not a claim about a specific customer&apos;s deployment, and a low failure rate on
            RoboArena&apos;s benchmark tasks is not a guarantee on tasks that checkpoint has never been
            evaluated on.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="How we tested it" />
        <div className="flex flex-col gap-3 px-3.5 py-3 text-[15px] text-dim">
          <p>
            Automated tests back every piece of this: unit tests on the underlying math (conformal p-values,
            the nonconformity scoring formula, the Wilson interval against a standard worked example, edge
            cases like empty or degenerate reference sets), and integration tests that run against the real
            dataset, not synthetic data.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-text">Coverage guarantee test:</strong> confirms that on real held-out
              successful episodes, scored through the same per-task calibration the product actually uses,
              the empirical false-positive rate stays near the nominal alpha threshold.
            </li>
            <li>
              <strong className="text-text">Discriminative-power test:</strong> confirms that real labeled
              failures score as more anomalous, on average, than held-out real successes. This is a
              falsifiable claim: if episode duration carried zero signal about failure, this test would
              fail. It passes.
            </li>
            <li>
              <strong className="text-text">Wilson interval tests:</strong> check the formula against a
              standard published worked example (5 successes of 10 trials), confirm the interval always
              contains the observed rate and stays within [0, 1], and confirm it narrows as sample size grows.
            </li>
          </ul>
        </div>
      </Card>

      <Card>
        <CardHeader title="Methodology provenance" />
        <div className="flex flex-col gap-3 px-3.5 py-3 text-[15px] text-dim">
          <p>
            Duration-anomaly scoring is built on &quot;A Gentle Introduction to Conformal Prediction and
            Distribution-Free Uncertainty Quantification&quot; (Angelopoulos &amp; Bates, arXiv:2107.07511).
            Before building on it, 30 candidate ML papers were researched and adversarially re-verified: each
            arXiv link and any claimed code license was checked directly rather than trusted from the initial
            research pass. This paper was selected because its MIT license was confirmed directly against the
            repository, and the underlying algorithm is simple enough to implement independently either way.
          </p>
          <p>
            Policy failure rate data comes from RoboArena (arXiv:2506.18123), whose public dataset dump is
            MIT-licensed, verified directly against the dataset&apos;s own license metadata before use. The
            confidence interval uses the Wilson score interval (Wilson, E.B., 1927, &quot;Probable Inference,
            the Law of Succession, and Statistical Inference&quot;), the standard correction for the normal
            approximation interval&apos;s known failure at small sample sizes or near 0% and 100%.
          </p>
        </div>
      </Card>
    </div>
  );
}

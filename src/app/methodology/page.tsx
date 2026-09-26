import { Card, CardHeader } from "@/components/ui/card";

export default function MethodologyPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-[22px] font-semibold text-text">How the risk score works</h1>
        <p className="mt-1 text-[15px] text-faint">
          Conformal duration-anomaly scoring, and how we verified it before shipping it.
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
            far. That answers the question a fleet operator or MGA actually cares about, since they insure a
            policy running across many robots, not one past episode. It is still a rollup of the same
            after-the-fact duration scores, not a new kind of prediction.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="What it does not do" />
        <div className="px-3.5 py-3 text-[15px] text-dim">
          <p>
            Neither the per-episode score nor the per-policy rollup predicts robot failure before it happens.
            Both are retrospective: they describe how past logged runs looked, not how a policy will perform
            on a run that hasn&apos;t happened yet. Only 60 of our 308 episodes have outcome labels today, all
            from one task family, and intervention/collision telemetry is not yet populated. That data does
            not support a genuine pre-deployment failure-prediction claim, so the product doesn&apos;t make
            one. Both views score duration-anomaly only.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="How we tested it" />
        <div className="flex flex-col gap-3 px-3.5 py-3 text-[15px] text-dim">
          <p>
            15 automated tests back this: 13 unit tests on the underlying math (conformal p-values, the
            nonconformity scoring formula, edge cases like empty or degenerate reference sets), and 2
            integration tests that run against the real 308-episode dataset, not synthetic data.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-text">Coverage guarantee test:</strong> confirms that on real held-out
              successful episodes, the empirical false-positive rate stays near the nominal alpha threshold.
              The statistical promise conformal prediction makes actually holds on our data, not just in
              theory.
            </li>
            <li>
              <strong className="text-text">Discriminative-power test:</strong> confirms that real labeled
              failures score as more anomalous, on average, than held-out real successes. This is a
              falsifiable claim: if episode duration carried zero signal about failure, this test would
              fail. It passes.
            </li>
          </ul>
        </div>
      </Card>

      <Card>
        <CardHeader title="Methodology provenance" />
        <div className="px-3.5 py-3 text-[15px] text-dim">
          <p>
            Built on &quot;A Gentle Introduction to Conformal Prediction and Distribution-Free Uncertainty
            Quantification&quot; (Angelopoulos &amp; Bates, arXiv:2107.07511). Before building on it, 30
            candidate ML papers were researched and adversarially re-verified: each arXiv link and any
            claimed code license was checked directly rather than trusted from the initial research pass.
            This paper was selected because its MIT license was confirmed directly against the repository,
            and the underlying algorithm is simple enough to implement independently either way.
          </p>
        </div>
      </Card>
    </div>
  );
}

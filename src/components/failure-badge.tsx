import { Badge } from "@/components/ui/badge";
import { FAILURE_CATEGORY_LABEL, FailureCategory } from "@/lib/types";

// Each category gets its own hue so a failure list reads at a glance,
// rather than collapsing everything into a single "danger" red.
export const FAILURE_CATEGORY_TONE: Record<
  FailureCategory,
  "danger" | "pink" | "warning" | "violet" | "orange" | "info" | "neutral"
> = {
  grasp_slipped: "danger",
  missed_grasp: "pink",
  dropped_object: "warning",
  wrong_object: "violet",
  collision: "orange",
  stalled: "info",
  plan_failure: "neutral",
};

export function FailureBadge({ category }: { category: FailureCategory }) {
  return <Badge tone={FAILURE_CATEGORY_TONE[category]}>{FAILURE_CATEGORY_LABEL[category]}</Badge>;
}

export function OutcomeBadge({ success }: { success: boolean | null }) {
  if (success === null) return <Badge tone="neutral">Unscored</Badge>;
  return success ? <Badge tone="success">Success</Badge> : <Badge tone="danger">Failure</Badge>;
}

import { FailureCategory } from "./types";

// Tailwind bg-<token> class per category, for chart bars / chips where a
// solid fill is needed rather than the tinted Badge treatment.
export const FAILURE_CATEGORY_BAR_CLASS: Record<FailureCategory, string> = {
  grasp_slipped: "bg-red",
  missed_grasp: "bg-pink",
  dropped_object: "bg-amber",
  wrong_object: "bg-violet",
  collision: "bg-orange",
  stalled: "bg-blue",
  plan_failure: "bg-faint",
};

export const FAILURE_CATEGORY_TEXT_CLASS: Record<FailureCategory, string> = {
  grasp_slipped: "text-red",
  missed_grasp: "text-pink",
  dropped_object: "text-amber",
  wrong_object: "text-violet",
  collision: "text-orange",
  stalled: "text-blue",
  plan_failure: "text-faint",
};

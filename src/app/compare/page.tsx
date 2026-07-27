import { Suspense } from "react";
import { ComparePanel } from "@/components/compare/compare-panel";

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="text-sm text-zinc-500">Loading comparison…</div>}>
      <ComparePanel />
    </Suspense>
  );
}

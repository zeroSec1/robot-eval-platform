import { Suspense } from "react";
import { EpisodesExplorer } from "@/components/episodes/episodes-explorer";
import { EpisodesGate } from "@/components/episodes/episodes-gate";

export default function EpisodesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-zinc-500">Loading episodes…</div>}>
      <EpisodesGate>
        <EpisodesExplorer />
      </EpisodesGate>
    </Suspense>
  );
}

import { Suspense } from "react";
import { EpisodesExplorer } from "@/components/episodes/episodes-explorer";

export default function EpisodesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-zinc-500">Loading episodes…</div>}>
      <EpisodesExplorer />
    </Suspense>
  );
}
